// ============================================================
// reset-password: Set new password via token or OTP
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody,
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
    if (!body?.new_password) {
      return errorResp("new_password is required", 400, origin);
    }

    const { token, otp_code, identifier, new_password } = body;
    const sb = getSupabase();

    let userId: string | null = null;

    // Method 1: Token (from email link)
    if (token) {
      const { data: tokenResult, error: tokenErr } = await sb.rpc(
        "verify_email_token",
        {
          p_token: token,
          p_purpose: "password_reset",
        }
      );

      if (tokenErr || !tokenResult?.[0]?.success) {
        return errorResp("Invalid or expired reset link", 400, origin);
      }

      userId = tokenResult[0].user_id;
    }

    // Method 2: OTP code
    if (otp_code && identifier) {
      const isMobile = /^(\+?977)?[9][897]\d{8}$/.test(
        identifier.replace(/[\s\-()]/g, "")
      );
      const identifierType = isMobile ? "mobile" : "email";

      let normalized = identifier;
      if (isMobile) {
        const clean = identifier.replace(/[\s\-()]/g, "");
        normalized = clean.startsWith("+") ? clean : (clean.length === 10 ? "+977" + clean : clean);
      }

      const { data: verifyResult } = await sb.rpc("verify_otp", {
        p_identifier: normalized,
        p_identifier_type: identifierType,
        p_otp_code: otp_code,
        p_purpose: "password_reset",
      });

      if (!verifyResult?.[0]?.success) {
        return jsonResp({
          success: false,
          message: verifyResult?.[0]?.message || "Invalid OTP",
        }, 200, origin);
      }

      userId = verifyResult[0].user_id;
    }

    if (!userId) {
      return errorResp("Reset token or OTP required", 400, origin);
    }

    // Update password
    const { error: updateErr } = await sb.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (updateErr) {
      console.error("updateUserById error:", updateErr);
      return errorResp("Failed to update password", 500, origin);
    }

    // Log
    await sb.rpc("send_auth_notification", {
      p_user_id: userId,
      p_type: "password_changed",
      p_title: "Password Changed",
      p_body: "Your password has been changed successfully.",
    });

    await sb.rpc("reset_rate_limit", {
      p_scope: "password_reset",
      p_identifier: identifier || "",
      p_action: "request",
    });

    return jsonResp({
      success: true,
      message: "Password updated successfully. You can now log in.",
    }, 200, origin);

  } catch (err) {
    console.error("reset-password error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
