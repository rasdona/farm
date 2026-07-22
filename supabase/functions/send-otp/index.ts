// ============================================================
// send-otp: Generate + send OTP via SMS or Email
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
  parseUserAgent, sendSMS, sendEmail, smsOTPTemplate, emailOTPTemplate,
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

  if (req.method !== "POST") {
    return errorResp("Method not allowed", 405, origin);
  }

  try {
    const body = await parseBody(req);
    if (!body?.identifier || !body?.purpose) {
      return errorResp("identifier and purpose required", 400, origin);
    }

    const {
      identifier,
      purpose,
      captcha_token,
    } = body;

    const ip = getIP(req);
    const ua = getUserAgent(req);

    // Validate purpose
    const validPurposes = [
      "registration", "login", "password_reset",
      "mobile_verify", "email_verify",
      "mobile_change", "email_change",
    ];
    if (!validPurposes.includes(purpose)) {
      return errorResp("Invalid purpose", 400, origin);
    }

    // Determine type
    const isMobile = /^(\+?977)?[9][897]\d{8}$/.test(
      identifier.replace(/[\s\-()]/g, "")
    );
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (!isMobile && !isEmail) {
      return errorResp("Invalid mobile or email format", 400, origin);
    }

    const identifierType = isMobile ? "mobile" : "email";

    // Normalize mobile
    let normalizedIdentifier = identifier;
    if (isMobile) {
      const clean = identifier.replace(/[\s\-()]/g, "");
      if (!clean.startsWith("+")) {
        normalizedIdentifier = clean.length === 10 ? "+977" + clean : clean;
      } else {
        normalizedIdentifier = clean;
      }
    }

    // Rate limit check (1 OTP per 60s per identifier)
    const sb = getSupabase();
    const { data: rateLimit } = await sb.rpc("check_rate_limit", {
      p_scope: "otp_send",
      p_identifier: normalizedIdentifier,
      p_action: purpose,
      p_max_attempts: 3,
      p_window_seconds: 60,
    });

    if (rateLimit && !rateLimit.allowed) {
      return errorResp(
        `Too many requests. Try again in ${Math.ceil(((new Date(rateLimit.retry_after).getTime() - Date.now()) / 1000))} seconds.`,
        429,
        origin
      );
    }

    // Create OTP via DB function
    const { data: otpResult, error: otpErr } = await sb.rpc("create_otp", {
      p_user_id: null,
      p_identifier: normalizedIdentifier,
      p_identifier_type: identifierType,
      p_purpose: purpose,
      p_ip_address: ip,
      p_user_agent: ua,
    });

    if (otpErr) {
      console.error("create_otp error:", otpErr);
      return errorResp("Failed to create OTP", 500, origin);
    }

    if (!otpResult || otpResult.length === 0) {
      return errorResp("OTP creation failed", 500, origin);
    }

    const { otp_code, otp_id, expires_at } = otpResult[0];

    // Send
    let deliveryResult;
    if (identifierType === "mobile") {
      deliveryResult = await sendSMS(
        normalizedIdentifier,
        smsOTPTemplate(otp_code, purpose)
      );
    } else {
      deliveryResult = await sendEmail(
        normalizedIdentifier,
        `Your KrishiConnect Verification Code: ${otp_code}`,
        emailOTPTemplate(otp_code, purpose)
      );
    }

    // Update delivery status
    await sb.from("otp_records").update({
      delivery_status: deliveryResult.success ? "sent" : "failed",
      delivery_error: deliveryResult.error || null,
      delivery_provider: deliveryResult.provider,
    }).eq("id", otp_id);

    // Log
    await sb.rpc("send_auth_notification", {
      p_user_id: null,
      p_type: "otp_sent",
      p_title: "OTP Sent",
      p_body: `OTP sent to ${identifierType === "mobile" ? "mobile" : "email"}`,
      p_metadata: {
        otp_id,
        purpose,
        provider: deliveryResult.provider,
        success: deliveryResult.success,
      },
    });

    // Dev mode: return OTP in response
    const devOtp = Deno.env.get("OTP_DEV_MODE") === "true" ? otp_code : undefined;

    return jsonResp({
      success: true,
      message: deliveryResult.success
        ? "OTP sent successfully"
        : "OTP created but delivery may be delayed",
      otp_id,
      expires_at,
      delivery_provider: deliveryResult.provider,
      dev_otp: devOtp,
    }, 200, origin);

  } catch (err) {
    console.error("send-otp error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
