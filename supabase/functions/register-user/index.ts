// ============================================================
// register-user: Register with email (mandatory) + mobile (mandatory)
// Email verification is required. Mobile OTP is reserved for future.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
  verifyCaptcha, isValidNepalMobile, isValidEmail,
  normalizePhone, sendEmail, emailOTPTemplate,
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
    if (!body?.full_name || !body?.email || !body?.mobile_number || !body?.password) {
      return errorResp("full_name, email, mobile_number, and password are required", 400, origin);
    }

    const {
      full_name,
      email,
      mobile_number,
      password,
      preferred_language = "en",
      captcha_token,
      roles = ["farmer"],
      province = "",
      district = "",
      municipality = "",
      ward = "",
      gender = "",
      dob = "",
      citizenship_number = "",
    } = body;

    // Validate email (mandatory)
    if (!email || !isValidEmail(email)) {
      return errorResp("Valid email address is required", 400, origin);
    }

    // Validate mobile (mandatory)
    if (!mobile_number || !isValidNepalMobile(mobile_number)) {
      return errorResp("Valid Nepal mobile number is required", 400, origin);
    }

    // Normalize
    const normalizedMobile = normalizePhone(mobile_number);
    const normalizedEmail = email.toLowerCase().trim();

    // CAPTCHA check
    if (captcha_token) {
      const ip = getIP(req);
      const captchaValid = await verifyCaptcha(captcha_token, ip);
      if (!captchaValid) {
        return errorResp("CAPTCHA verification failed", 400, origin);
      }
    }

    const sb = getSupabase();

    // Check existing user by email
    const { data: existingEmail } = await sb
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (existingEmail) {
      return errorResp("Email already registered", 409, origin);
    }

    // Check existing user by mobile
    const { data: existingMobile } = await sb
      .from("users")
      .select("id")
      .eq("mobile_number", normalizedMobile)
      .maybeSingle();
    if (existingMobile) {
      return errorResp("Mobile number already registered", 409, origin);
    }

    // Create auth user with email (email confirmation required)
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
    });

    if (authErr) {
      console.error("createUser error:", authErr);
      return errorResp("Failed to create account: " + authErr.message, 500, origin);
    }

    const authUserId = authData.user.id;

    const role = Array.isArray(roles) && roles.length > 0 ? roles[0] : "farmer";

    // Create profile in users table
    const { error: profileErr } = await sb.from("users").insert({
      id: authUserId,
      full_name: full_name.trim(),
      mobile_number: normalizedMobile,
      email: normalizedEmail,
      preferred_language,
      role,
      roles: JSON.stringify(roles),
      province,
      district,
      municipality,
      ward,
      gender,
      dob: dob || null,
      citizenship_number: citizenship_number || null,
      registration_method: "email",
      mobile_verified: false,
      email_verified: false,
      account_status: "pending_verification",
      verification_status: "unverified",
      requires_photo_upload: true,
      profile_photo_verified: false,
      verification_method: "email",
      failed_otp_attempts: 0,
      otp_locked_until: null,
    });

    if (profileErr) {
      console.error("profile insert error:", profileErr);
      await sb.auth.admin.deleteUser(authUserId);
      return errorResp("Failed to create profile", 500, origin);
    }

    // Also insert into profiles table for frontend compatibility
    const { error: legacyProfileErr } = await sb.from("profiles").insert({
      user_id: authUserId,
      full_name: full_name.trim(),
      mobile_number: normalizedMobile,
      role,
      roles: Array.isArray(roles) ? roles : [role],
      province,
      district,
      municipality,
      ward,
      gender,
      dob: dob || null,
      citizenship_number: citizenship_number || null,
      preferred_language,
    });

    if (legacyProfileErr) {
      console.error("legacy profile insert error:", legacyProfileErr);
    }

    // Send email verification OTP
    const ip = getIP(req);
    const ua = getUserAgent(req);
    let otpSent = false;

    const { data: otpResult } = await sb.rpc("create_otp", {
      p_user_id: authUserId,
      p_identifier: normalizedEmail,
      p_identifier_type: "email",
      p_purpose: "email_verify",
      p_ip_address: ip,
      p_user_agent: ua,
    });

    if (otpResult?.[0]?.otp_code) {
      const emailResult = await sendEmail(
        normalizedEmail,
        `Verify Your Email - AgriConnect Nepal`,
        emailOTPTemplate(otpResult[0].otp_code, "email_verify", full_name.trim())
      );
      otpSent = emailResult.success;

      await sb.from("otp_records").update({
        delivery_status: emailResult.success ? "sent" : "failed",
        delivery_error: emailResult.error || null,
        delivery_provider: emailResult.provider,
      }).eq("id", otpResult[0].otp_id);
    }

    // Dev mode: include OTP
    const devMode = Deno.env.get("OTP_DEV_MODE") === "true";

    return jsonResp({
      success: true,
      message: "Account created. Please verify your email address.",
      user_id: authUserId,
      requires_verification: true,
      verification_method: "email",
      email: normalizedEmail,
      mobile: normalizedMobile,
      dev_otp: devMode ? otpResult?.[0]?.otp_code : undefined,
    }, 201, origin);

  } catch (err) {
    console.error("register-user error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
