// ============================================================
// resend-verification: Resend OTP with rate limiting
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
  sendSMS, sendEmail, smsOTPTemplate, emailOTPTemplate,
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
    if (!body?.identifier || !body?.purpose) {
      return errorResp("identifier and purpose required", 400, origin);
    }

    const { identifier, purpose } = body;
    const ip = getIP(req);
    const ua = getUserAgent(req);

    const sb = getSupabase();

    // Rate limit: max 5 resends per hour
    const { data: rateLimit } = await sb.rpc("check_rate_limit", {
      p_scope: "otp_resend",
      p_identifier: identifier,
      p_action: purpose,
      p_max_attempts: 5,
      p_window_seconds: 3600,
    });

    if (rateLimit && !rateLimit.allowed) {
      return jsonResp({
        success: false,
        message: "Maximum resend limit reached. Please try again later.",
        retry_after: rateLimit.retry_after,
      }, 200, origin);
    }

    // Invalidate previous OTPs
    await sb.from("otp_records")
      .update({ is_expired: true })
      .eq("identifier", identifier)
      .eq("purpose", purpose)
      .eq("is_used", false)
      .eq("is_expired", false);

    // Determine type
    const isMobile = /^(\+?977)?[9][897]\d{8}$/.test(
      identifier.replace(/[\s\-()]/g, "")
    );
    const identifierType = isMobile ? "mobile" : "email";

    // Find user
    let normalized = identifier;
    if (isMobile) {
      const clean = identifier.replace(/[\s\-()]/g, "");
      normalized = clean.startsWith("+") ? clean : (clean.length === 10 ? "+977" + clean : clean);
    }

    let query = sb.from("users").select("id");
    if (isMobile) {
      query = query.eq("mobile_number", normalized);
    } else {
      query = query.eq("email", identifier.toLowerCase());
    }

    const { data: user } = await query.single();

    // Create new OTP
    const { data: otpResult } = await sb.rpc("create_otp", {
      p_user_id: user?.id || null,
      p_identifier: normalized,
      p_identifier_type: identifierType,
      p_purpose: purpose,
      p_ip_address: ip,
      p_user_agent: ua,
    });

    if (!otpResult?.[0]?.otp_code) {
      return errorResp("Failed to create OTP", 500, origin);
    }

    // Send
    let deliveryResult;
    if (identifierType === "mobile") {
      deliveryResult = await sendSMS(
        normalized,
        smsOTPTemplate(otpResult[0].otp_code, purpose)
      );
    } else {
      deliveryResult = await sendEmail(
        normalized,
        `Your KrishiConnect Verification Code: ${otpResult[0].otp_code}`,
        emailOTPTemplate(otpResult[0].otp_code, purpose)
      );
    }

    // Update delivery
    await sb.from("otp_records").update({
      delivery_status: deliveryResult.success ? "sent" : "failed",
      delivery_error: deliveryResult.error || null,
      delivery_provider: deliveryResult.provider,
    }).eq("id", otpResult[0].otp_id);

    // Log
    await sb.from("verification_logs").insert({
      user_id: user?.id || null,
      event: "otp_resend",
      identifier_type: identifierType,
      identifier_masked: identifier.replace(/.(?=.{3})/g, "*"),
      purpose,
      ip_address: ip,
      user_agent: ua,
    });

    const devOtp = Deno.env.get("OTP_DEV_MODE") === "true" ? otpResult[0].otp_code : undefined;

    return jsonResp({
      success: true,
      message: "OTP resent successfully",
      otp_id: otpResult[0].otp_id,
      expires_at: otpResult[0].expires_at,
      dev_otp: devOtp,
    }, 200, origin);

  } catch (err) {
    console.error("resend-verification error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
