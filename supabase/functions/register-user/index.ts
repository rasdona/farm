// ============================================================
// register-user: Register with mobile, email, or both
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
  parseUserAgent, verifyCaptcha, isValidNepalMobile, isValidEmail,
  normalizePhone, sendSMS, sendEmail, smsOTPTemplate, emailOTPTemplate,
} from "../_shared/utils.ts";

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") return errorResp("Method not allowed", 405, origin);

  try {
    const body = await parseBody(req);
    if (!body?.full_name || !body?.password) {
      return errorResp("full_name and password are required", 400, origin);
    }

    const {
      full_name,
      mobile_number,
      email,
      password,
      preferred_language = "en",
      captcha_token,
    } = body;

    // Validate at least one contact
    if (!mobile_number && !email) {
      return errorResp("Either mobile or email is required", 400, origin);
    }

    // Validate formats
    if (mobile_number && !isValidNepalMobile(mobile_number)) {
      return errorResp("Invalid Nepal mobile number", 400, origin);
    }
    if (email && !isValidEmail(email)) {
      return errorResp("Invalid email address", 400, origin);
    }

    // Normalize
    const normalizedMobile = mobile_number ? normalizePhone(mobile_number) : null;

    // CAPTCHA check
    if (captcha_token) {
      const ip = getIP(req);
      const captchaValid = await verifyCaptcha(captcha_token, ip);
      if (!captchaValid) {
        return errorResp("CAPTCHA verification failed", 400, origin);
      }
    }

    const sb = getSupabase();

    // Check existing user
    if (normalizedMobile) {
      const { data: existing } = await sb
        .from("users")
        .select("id")
        .eq("mobile_number", normalizedMobile)
        .single();
      if (existing) {
        return errorResp("Mobile number already registered", 409, origin);
      }
    }
    if (email) {
      const { data: existing } = await sb
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();
      if (existing) {
        return errorResp("Email already registered", 409, origin);
      }
    }

    // Determine registration method
    let registrationMethod = "mobile";
    if (email && !mobile_number) registrationMethod = "email";
    else if (email && mobile_number) registrationMethod = "both";

    // Create auth user
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: email || undefined,
      phone: normalizedMobile || undefined,
      password,
      email_confirm: !mobile_number, // confirm email if only email
      phone_confirm: false,
    });

    if (authErr) {
      console.error("createUser error:", authErr);
      return errorResp("Failed to create account: " + authErr.message, 500, origin);
    }

    const authUserId = authData.user.id;

    // Create profile
    const { error: profileErr } = await sb.from("users").insert({
      id: authUserId,
      full_name: full_name.trim(),
      mobile_number: normalizedMobile,
      email: email?.toLowerCase() || null,
      preferred_language,
      registration_method: registrationMethod,
      mobile_verified: false,
      email_verified: false,
      account_status: "pending_verification",
      verification_status: "unverified",
      requires_photo_upload: true,
      profile_photo_verified: false,
    });

    if (profileErr) {
      console.error("profile insert error:", profileErr);
      await sb.auth.admin.deleteUser(authUserId);
      return errorResp("Failed to create profile", 500, origin);
    }

    // Send first OTP
    const ip = getIP(req);
    const ua = getUserAgent(req);
    let otpSent = false;
    let otpMethod = null;

    if (normalizedMobile) {
      const { data: otpResult } = await sb.rpc("create_otp", {
        p_user_id: authUserId,
        p_identifier: normalizedMobile,
        p_identifier_type: "mobile",
        p_purpose: "registration",
        p_ip_address: ip,
        p_user_agent: ua,
      });

      if (otpResult?.[0]?.otp_code) {
        const smsResult = await sendSMS(
          normalizedMobile,
          smsOTPTemplate(otpResult[0].otp_code, "registration")
        );
        otpSent = smsResult.success;
        otpMethod = "mobile";

        await sb.from("otp_records").update({
          delivery_status: smsResult.success ? "sent" : "failed",
          delivery_error: smsResult.error || null,
          delivery_provider: smsResult.provider,
        }).eq("id", otpResult[0].otp_id);
      }
    } else if (email) {
      const { data: otpResult } = await sb.rpc("create_otp", {
        p_user_id: authUserId,
        p_identifier: email.toLowerCase(),
        p_identifier_type: "email",
        p_purpose: "registration",
        p_ip_address: ip,
        p_user_agent: ua,
      });

      if (otpResult?.[0]?.otp_code) {
        const emailResult = await sendEmail(
          email,
          `Your KrishiConnect Verification Code: ${otpResult[0].otp_code}`,
          emailOTPTemplate(otpResult[0].otp_code, "registration")
        );
        otpSent = emailResult.success;
        otpMethod = "email";

        await sb.from("otp_records").update({
          delivery_status: emailResult.success ? "sent" : "failed",
          delivery_error: emailResult.error || null,
          delivery_provider: emailResult.provider,
        }).eq("id", otpResult[0].otp_id);
      }
    }

    // Dev mode: include OTP
    const devMode = Deno.env.get("OTP_DEV_MODE") === "true";

    return jsonResp({
      success: true,
      message: "Account created. Please verify your " + (otpMethod || "account"),
      user_id: authUserId,
      requires_verification: true,
      verification_method: otpMethod,
      email: email || null,
      mobile: normalizedMobile || null,
      dev_otp: devMode ? "Check server logs" : undefined,
    }, 201, origin);

  } catch (err) {
    console.error("register-user error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
