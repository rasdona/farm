// ============================================================
// login-user: Password or OTP login
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getSupabase, jsonResp, errorResp, parseBody, getIP, getUserAgent,
  verifyCaptcha,
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

    const { identifier, password, captcha_token } = body;
    const ip = getIP(req);
    const ua = getUserAgent(req);

    const sb = getSupabase();

    // Check login lock
    const { data: lockData } = await sb.rpc("check_login_lock", {
      p_identifier: identifier,
    });

    if (lockData?.[0]?.is_locked) {
      const remaining = lockData[0].remaining_seconds;
      return jsonResp({
        success: false,
        locked: true,
        message: `Account temporarily locked. Try again in ${Math.ceil(remaining / 60)} minutes.`,
        remaining_seconds: remaining,
        captcha_required: true,
      }, 200, origin);
    }

    // CAPTCHA check
    if (captcha_token) {
      const captchaValid = await verifyCaptcha(captcha_token, ip);
      if (!captchaValid) {
        return errorResp("CAPTCHA verification failed", 400, origin);
      }
    }

    // Find user
    const isMobile = /^(\+?977)?[9][897]\d{8}$/.test(
      identifier.replace(/[\s\-()]/g, "")
    );

    let query = sb.from("users").select("*");
    if (isMobile) {
      const clean = identifier.replace(/[\s\-()]/g, "");
      const normalized = clean.startsWith("+") ? clean : (clean.length === 10 ? "+977" + clean : clean);
      query = query.eq("mobile_number", normalized);
    } else {
      query = query.eq("email", identifier.toLowerCase());
    }

    const { data: user, error: userErr } = await query.single();

    if (userErr || !user) {
      // Record failed attempt
      await sb.rpc("record_failed_login", {
        p_identifier: identifier,
        p_ip_address: ip,
        p_user_agent: ua,
      });

      await sb.rpc("record_login", {
        p_user_id: null,
        p_login_method: "password",
        p_identifier: identifier,
        p_identifier_type: isMobile ? "mobile" : "email",
        p_is_success: false,
        p_failure_reason: "user_not_found",
        p_ip_address: ip,
        p_user_agent: ua,
      });

      return jsonResp({
        success: false,
        message: "Invalid credentials",
      }, 200, origin);
    }

    // Check account status
    if (user.account_status === "suspended") {
      return jsonResp({
        success: false,
        message: "Account suspended. Contact support.",
      }, 200, origin);
    }

    if (user.account_status === "pending_verification") {
      // Check if email is verified
      if (!user.email_verified) {
        return jsonResp({
          success: false,
          message: "Your email address has not been verified. Please verify your email before logging in.",
          requires_email_verification: true,
          user_id: user.id,
          email: user.email,
        }, 200, origin);
      }
      return jsonResp({
        success: false,
        message: "Account not yet verified. Please verify your email.",
        requires_email_verification: true,
        user_id: user.id,
        email: user.email,
      }, 200, origin);
    }

    // Password login
    if (password) {
      const { data: authData, error: signInErr } =
        await sb.auth.admin.signInWithPassword({
          email: user.email || `${user.mobile_number}@krishiconnect.placeholder`,
          password,
        });

      if (signInErr) {
        await sb.rpc("record_failed_login", {
          p_identifier: identifier,
          p_ip_address: ip,
          p_user_agent: ua,
        });

        await sb.rpc("record_login", {
          p_user_id: user.id,
          p_login_method: "password",
          p_identifier: identifier,
          p_identifier_type: isMobile ? "mobile" : "email",
          p_is_success: false,
          p_failure_reason: signInErr.message,
          p_ip_address: ip,
          p_user_agent: ua,
        });

        return jsonResp({
          success: false,
          message: "Invalid credentials",
        }, 200, origin);
      }

      // Success
      await sb.rpc("reset_rate_limit", {
        p_scope: "login_failed",
        p_identifier: identifier,
        p_action: "password",
      });

      await sb.rpc("record_login", {
        p_user_id: user.id,
        p_login_method: "password",
        p_identifier: identifier,
        p_identifier_type: isMobile ? "mobile" : "email",
        p_is_success: true,
        p_ip_address: ip,
        p_user_agent: ua,
      });

      return jsonResp({
        success: true,
        message: "Login successful",
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        user: {
          id: user.id,
          full_name: user.full_name,
          mobile: user.mobile_number,
          email: user.email,
          role: user.active_role,
          mobile_verified: user.mobile_verified,
          email_verified: user.email_verified,
        },
      }, 200, origin);
    }

    // OTP login: send OTP
    return jsonResp({
      success: true,
      requires_otp: true,
      message: "Please verify with OTP",
      user_id: user.id,
      verification_method: isMobile ? "mobile" : "email",
    }, 200, origin);

  } catch (err) {
    console.error("login-user error:", err);
    return errorResp("Internal server error", 500, origin);
  }
});
