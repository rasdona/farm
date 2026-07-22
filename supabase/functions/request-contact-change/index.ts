// ============================================================
// request-contact-change: Change mobile or email
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
  sendSMS, sendEmail, smsOTPTemplate, emailOTPTemplate,
  isValidNepalMobile, isValidEmail, normalizePhone,
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
    if (!body?.new_value || !body?.change_type || !body?.password) {
      return errorResp("new_value, change_type, and password required", 400, origin);
    }

    const { new_value, change_type, password } = body;
    const ip = getIP(req);
    const ua = getUserAgent(req);

    // Validate
    if (change_type === "mobile" && !isValidNepalMobile(new_value)) {
      return errorResp("Invalid mobile number", 400, origin);
    }
    if (change_type === "email" && !isValidEmail(new_value)) {
      return errorResp("Invalid email", 400, origin);
    }

    const normalized = change_type === "mobile" ? normalizePhone(new_value) : new_value.toLowerCase();

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResp("Unauthorized", 401, origin);

    const token = authHeader.replace("Bearer ", "");
    const sb = getSupabase();

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return errorResp("Unauthorized", 401, origin);

    // Verify password
    const { error: signInErr } = await sb.auth.signInWithPassword({
      email: user.email || "",
      password,
    });

    if (signInErr) {
      return errorResp("Incorrect password", 403, origin);
    }

    // Check availability
    let checkQuery = sb.from("users").select("id");
    if (change_type === "mobile") {
      checkQuery = checkQuery.eq("mobile_number", normalized);
    } else {
      checkQuery = checkQuery.eq("email", normalized);
    }

    const { data: existing } = await checkQuery.neq("id", user.id).single();
    if (existing) {
      return errorResp(`${change_type} already in use`, 409, origin);
    }

    // Create OTP for new value
    const { data: otpResult } = await sb.rpc("create_otp", {
      p_user_id: user.id,
      p_identifier: normalized,
      p_identifier_type: change_type,
      p_purpose: `${change_type}_change`,
      p_ip_address: ip,
      p_user_agent: ua,
    });

    if (!otpResult?.[0]?.otp_code) {
      return errorResp("Failed to create OTP", 500, origin);
    }

    // Send
    let deliveryResult;
    if (change_type === "mobile") {
      deliveryResult = await sendSMS(
        normalized,
        smsOTPTemplate(otpResult[0].otp_code, `${change_type}_change`)
      );
    } else {
      deliveryResult = await sendEmail(
        normalized,
        `Your KrishiConnect Verification Code: ${otpResult[0].otp_code}`,
        emailOTPTemplate(otpResult[0].otp_code, `${change_type}_change`)
      );
    }

    // Update delivery
    await sb.from("otp_records").update({
      delivery_status: deliveryResult.success ? "sent" : "failed",
      delivery_error: deliveryResult.error || null,
      delivery_provider: deliveryResult.provider,
    }).eq("id", otpResult[0].otp_id);

    // Create change request
    const current = await sb.from("users")
      .select(change_type === "mobile" ? "mobile_number" : "email")
      .eq("id", user.id)
      .single();

    await sb.from("contact_change_requests").insert({
      user_id: user.id,
      change_type,
      old_value: change_type === "mobile" ? current?.mobile_number : current?.email,
      new_value: normalized,
      otp_hash: otpResult[0].otp_hash || null,
      expires_at: otpResult[0].expires_at,
    });

    const devOtp = Deno.env.get("OTP_DEV_MODE") === "true" ? otpResult[0].otp_code : undefined;

    return jsonResp({
      success: true,
      message: `OTP sent to new ${change_type}`,
      otp_id: otpResult[0].otp_id,
      expires_at: otpResult[0].expires_at,
      dev_otp: devOtp,
    }, 200, origin);

  } catch (err) {
    console.error("request-contact-change error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
