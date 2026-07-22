// ============================================================
// verify-otp: Verify OTP code and complete verification
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
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
    if (!body?.identifier || !body?.code || !body?.purpose) {
      return errorResp("identifier, code, and purpose required", 400, origin);
    }

    const { identifier, code, purpose, device_fingerprint } = body;
    const ip = getIP(req);
    const ua = getUserAgent(req);

    // Determine type
    const isMobile = /^(\+?977)?[9][897]\d{8}$/.test(
      identifier.replace(/[\s\-()]/g, "")
    );
    const identifierType = isMobile ? "mobile" : "email";

    let normalizedIdentifier = identifier;
    if (isMobile) {
      const clean = identifier.replace(/[\s\-()]/g, "");
      normalizedIdentifier = clean.startsWith("+") ? clean : (clean.length === 10 ? "+977" + clean : clean);
    }

    const sb = getSupabase();

    // Verify OTP
    const { data: verifyResult, error: verifyErr } = await sb.rpc("verify_otp", {
      p_identifier: normalizedIdentifier,
      p_identifier_type: identifierType,
      p_otp_code: code,
      p_purpose: purpose,
      p_ip_address: ip,
      p_user_agent: ua,
      p_device_fingerprint: device_fingerprint,
    });

    if (verifyErr) {
      console.error("verify_otp error:", verifyErr);
      return errorResp("Verification failed", 500, origin);
    }

    if (!verifyResult || verifyResult.length === 0) {
      return errorResp("Verification failed", 500, origin);
    }

    const { success, user_id, message, lock_until } = verifyResult[0];

    if (!success) {
      if (lock_until) {
        return jsonResp({
          success: false,
          locked: true,
          message,
          lock_until,
        }, 200, origin);
      }
      return jsonResp({ success: false, message }, 200, origin);
    }

    // Complete verification based on purpose
    if (purpose === "registration" || purpose === "mobile_verify") {
      await sb.rpc("complete_mobile_verification", { p_user_id: user_id });
    } else if (purpose === "email_verify") {
      await sb.rpc("complete_email_verification", { p_user_id: user_id });
    } else if (purpose === "password_reset") {
      // Generate reset token
      const { data: tokenResult } = await sb.rpc("create_verification_token", {
        p_user_id: user_id,
        p_purpose: "password_reset",
        p_identifier: normalizedIdentifier,
      });

      return jsonResp({
        success: true,
        message: "OTP verified. You can now reset your password.",
        reset_token: tokenResult?.[0]?.raw_token,
      }, 200, origin);
    } else if (purpose === "mobile_change") {
      await sb.rpc("complete_mobile_change", {
        p_user_id: user_id,
        p_new_mobile: normalizedIdentifier,
      });
    } else if (purpose === "email_change") {
      await sb.rpc("complete_email_change", {
        p_user_id: user_id,
        p_new_email: normalizedIdentifier,
      });
    }

    // Get verification status
    const { data: statusResult } = await sb.rpc("get_verification_status", {
      p_user_id: user_id,
    });

    return jsonResp({
      success: true,
      message: "Verification completed successfully",
      user_id,
      verification: statusResult?.[0] || null,
    }, 200, origin);

  } catch (err) {
    console.error("verify-otp error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
