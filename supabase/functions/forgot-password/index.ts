// ============================================================
// forgot-password: Send reset OTP or email link
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP,
  sendSMS, sendEmail, smsOTPTemplate, emailLinkTemplate,
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
    if (!body?.identifier) {
      return errorResp("identifier is required", 400, origin);
    }

    const { identifier } = body;
    const ip = getIP(req);

    const sb = getSupabase();

    // Rate limit
    const { data: rateLimit } = await sb.rpc("check_rate_limit", {
      p_scope: "password_reset",
      p_identifier: identifier,
      p_action: "request",
      p_max_attempts: 3,
      p_window_seconds: 300,
    });

    if (rateLimit && !rateLimit.allowed) {
      return errorResp(
        "Too many requests. Please wait before trying again.",
        429,
        origin
      );
    }

    // Find user (don't reveal if exists)
    const isMobile = /^(\+?977)?[9][897]\d{8}$/.test(
      identifier.replace(/[\s\-()]/g, "")
    );

    let query = sb.from("users").select("id, email, mobile_number, email_verified, account_status");
    if (isMobile) {
      const clean = identifier.replace(/[\s\-()]/g, "");
      const normalized = clean.startsWith("+") ? clean : (clean.length === 10 ? "+977" + clean : clean);
      query = query.eq("mobile_number", normalized);
    } else {
      query = query.eq("email", identifier.toLowerCase());
    }

    const { data: user } = await query.single();

    // Always return success to prevent enumeration
    if (!user) {
      return jsonResp({
        success: true,
        message: "If an account exists, you will receive reset instructions.",
      }, 200, origin);
    }

    // Determine method: prefer email link, fallback to mobile OTP
    if (user.email_verified && user.email) {
      // Email link
      const { data: tokenResult, error: tokenErr } = await sb.rpc(
        "create_verification_token",
        {
          p_user_id: user.id,
          p_purpose: "password_reset",
          p_identifier: user.email,
        }
      );

      if (tokenErr || !tokenResult?.[0]?.raw_token) {
        console.error("Token creation error:", tokenErr);
        return errorResp("Failed to process request", 500, origin);
      }

      const resetUrl = `${Deno.env.get("APP_URL") || "https://krishiconnect.com.np"}/reset-password?token=${tokenResult[0].raw_token}`;

      await sendEmail(
        user.email,
        "Reset Your KrishiConnect Password",
        emailLinkTemplate(resetUrl, "password_reset")
      );

      return jsonResp({
        success: true,
        message: "If an account exists, you will receive reset instructions.",
        method: "email_link",
      }, 200, origin);
    }

    if (user.mobile_number) {
      // Mobile OTP
      const { data: otpResult } = await sb.rpc("create_otp", {
        p_user_id: user.id,
        p_identifier: user.mobile_number,
        p_identifier_type: "mobile",
        p_purpose: "password_reset",
        p_ip_address: ip,
      });

      if (otpResult?.[0]?.otp_code) {
        await sendSMS(
          user.mobile_number,
          smsOTPTemplate(otpResult[0].otp_code, "password_reset")
        );

        await sb.from("otp_records").update({
          delivery_status: "sent",
          delivery_provider: "sparrow",
        }).eq("id", otpResult[0].otp_id);
      }

      return jsonResp({
        success: true,
        message: "If an account exists, you will receive reset instructions.",
        method: "sms_otp",
        // In dev mode, return the OTP
        ...(Deno.env.get("OTP_DEV_MODE") === "true" && otpResult?.[0]?.otp_code
          ? { dev_otp: otpResult[0].otp_code }
          : {}),
      }, 200, origin);
    }

    // No contact method available
    return jsonResp({
      success: true,
      message: "If an account exists, you will receive reset instructions.",
    }, 200, origin);

  } catch (err) {
    console.error("forgot-password error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
