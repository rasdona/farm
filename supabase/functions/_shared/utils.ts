// ============================================================
// Ekrishi Nepal — Shared Utilities
// Production-grade: No mock data, real providers
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// ENV CONFIG
// ============================================
const ENV = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY")!,
  APP_URL: Deno.env.get("APP_URL") || "https://ekrishi.vercel.app",
  SMS_API_KEY: Deno.env.get("SMS_PROVIDER_API_KEY") || "",
  SMS_SENDER_ID: Deno.env.get("SMS_SENDER_ID") || "Ekrishi",
  EMAIL_API_KEY: Deno.env.get("EMAIL_PROVIDER_API_KEY") || "",
  EMAIL_FROM: Deno.env.get("EMAIL_FROM") || "Ekrishi Nepal <noreply@ekrishi.vercel.app>",
  RECAPTCHA_SECRET: Deno.env.get("RECAPTCHA_SECRET") || "",
  OTP_DEV_MODE: Deno.env.get("OTP_DEV_MODE") === "true",
};

// ============================================
// SUPABASE CLIENT (Service Role)
// ============================================
export function getSupabase() {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================
// CORS HEADERS
// ============================================
export function corsHeaders(origin?: string): Record<string, string> {
  const o = origin && !origin.startsWith("file:") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// ============================================
// HTTP RESPONSES
// ============================================
export function jsonResp(
  data: Record<string, unknown>,
  status = 200,
  origin?: string | null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin || undefined) },
  });
}

export function errorResp(
  msg: string,
  status = 400,
  origin?: string | null
): Response {
  return jsonResp({ error: msg }, status, origin);
}

// ============================================
// REQUEST PARSERS
// ============================================
export async function parseBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function getIP(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent");
}

export function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  device_type: string;
} {
  if (!ua)
    return { browser: "Unknown", os: "Unknown", device_type: "Unknown" };

  let browser = "Unknown";
  let os = "Unknown";
  let device_type = "desktop";

  // Browser
  if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edge/")) browser = "Edge";
  else if (ua.includes("Opera/") || ua.includes("OPR/")) browser = "Opera";

  // OS
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device
  if (ua.includes("Mobile") || ua.includes("Android"))
    device_type = "mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad"))
    device_type = "tablet";

  return { browser, os, device_type };
}

// ============================================
// CAPTCHA VERIFICATION
// ============================================
export async function verifyCaptcha(
  token: string,
  ip?: string | null
): Promise<boolean> {
  if (!ENV.RECAPTCHA_SECRET) return true; // skip if not configured

  try {
    const resp = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: ENV.RECAPTCHA_SECRET,
          response: token,
          remoteip: ip || "",
        }),
      }
    );

    const data = await resp.json();
    return data.success === true && data.score >= 0.3;
  } catch {
    return false;
  }
}

// ============================================
// SMS PROVIDER: Sparrow SMS (Nepal)
// ============================================
export interface SMSResult {
  success: boolean;
  provider: string;
  error?: string;
  message_id?: string;
}

export async function sendSMS(
  mobile: string,
  message: string
): Promise<SMSResult> {
  if (ENV.OTP_DEV_MODE) {
    console.log(`[DEV MODE] SMS to ${mobile}: ${message}`);
    return { success: true, provider: "dev_console" };
  }

  if (!ENV.SMS_API_KEY) {
    return { success: false, provider: "sparrow", error: "SMS API key not configured" };
  }

  try {
    const resp = await fetch("https://api.sparrowsms.com/v2/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.SMS_API_KEY}`,
      },
      body: JSON.stringify({
        from: ENV.SMS_SENDER_ID,
        to: mobile,
        message,
      }),
    });

    const data = await resp.json();

    if (resp.ok && data.status === "OK") {
      return { success: true, provider: "sparrow", message_id: data.message_id };
    }

    return { success: false, provider: "sparrow", error: data.message || "Sparrow SMS error" };
  } catch (err) {
    return {
      success: false,
      provider: "sparrow",
      error: err instanceof Error ? err.message : "Sparrow SMS network error",
    };
  }
}

// ============================================
// EMAIL PROVIDER: Brevo (ex-Sendinblue)
// ============================================
export interface EmailResult {
  success: boolean;
  provider: string;
  error?: string;
  message_id?: string;
}

// ============================================
// EMAIL OTP VIA SUPABASE AUTH (built-in email)
// Sends Supabase's own 6-digit OTP email. The user-facing OTP endpoints
// (signInWithOtp / verifyOtp) must use the ANON key, NOT the service role.
// ============================================
export function getSupabaseAnon() {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sendEmailOtpViaSupabase(
  email: string
): Promise<EmailResult> {
  const sb = getSupabaseAnon();
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.error("signInWithOtp error:", error.message, JSON.stringify(error));
      return { success: false, provider: "supabase", error: error.message };
    }
    return { success: true, provider: "supabase" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Supabase email error";
    console.error("signInWithOtp exception:", msg, JSON.stringify(err));
    return { success: false, provider: "supabase", error: msg };
  }
}

function parseSender(from: string): { name: string; email: string } {
  const m = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: "", email: from.trim() };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  if (ENV.OTP_DEV_MODE) {
    console.log(`[DEV MODE] Email to ${to}: ${subject}`);
    console.log(`[DEV MODE] HTML preview: ${html.substring(0, 200)}...`);
    return { success: true, provider: "dev_console" };
  }

  if (!ENV.EMAIL_API_KEY) {
    return { success: false, provider: "brevo", error: "Email API key not configured" };
  }

  const sender = parseSender(ENV.EMAIL_FROM);

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": ENV.EMAIL_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: sender.name || "Ekrishi Nepal", email: sender.email },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await resp.json();

    if (resp.ok) {
      return { success: true, provider: "brevo", message_id: data.messageId };
    }

    return { success: false, provider: "brevo", error: data.message || "Brevo error" };
  } catch (err) {
    return {
      success: false,
      provider: "brevo",
      error: err instanceof Error ? err.message : "Brevo network error",
    };
  }
}

// ============================================
// VALIDATORS
// ============================================
export function isValidNepalMobile(phone: string): boolean {
  const normalized = phone.replace(/[\s\-()]/g, "");
  return /^\+?977[9][897]\d{8}$/.test(normalized) ||
    /^[9][897]\d{8}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

export function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s\-()]/g, "");
  if (/^\+977/.test(clean)) return clean;
  if (/^977/.test(clean)) return "+" + clean;
  if (/^[0-9]{10}$/.test(clean)) return "+977" + clean;
  return clean;
}

// ============================================
// MESSAGE TEMPLATES
// ============================================
export function smsOTPTemplate(code: string, purpose: string): string {
  const purposes: Record<string, string> = {
    registration: "account verification",
    mobile_verify: "mobile verification",
    email_verify: "email verification",
    password_reset: "password reset",
    mobile_change: "phone number change",
    email_change: "email change",
    login: "login verification",
  };
  return `Ekrishi: Your verification code is ${code}. Purpose: ${purposes[purpose] || purpose}. Valid for 5 minutes. Do not share this code.`;
}

export function emailOTPTemplate(code: string, purpose: string, userName?: string): string {
  const purposeLabel: Record<string, string> = {
    registration: "account registration",
    email_verify: "email verification",
    password_reset: "password reset",
    mobile_verify: "mobile verification",
    login: "login verification",
    mobile_change: "phone number change",
    email_change: "email change",
  };
  const greeting = userName ? `Hello ${userName},` : "Hello,";
  const purposeText = purposeLabel[purpose] || purpose.replace(/_/g, " ");
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f5f1;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#15803d 0%,#22c55e 100%);padding:36px 32px;text-align:center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="padding-right:12px;vertical-align:middle;">
              <div style="width:48px;height:48px;background:#ffffff;border-radius:12px;text-align:center;line-height:48px;font-size:26px;">🌾</div>
            </td>
            <td style="vertical-align:middle;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Ekrishi Nepal</div>
              <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px;">Agriculture Platform</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 32px 24px;">
        <p style="color:#1a1a1a;font-size:16px;margin:0 0 8px;font-weight:600;">${greeting}</p>
        <p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Welcome to Ekrishi Nepal. Use the following code to complete your <strong>${purposeText}</strong>:
        </p>

        <!-- OTP Code Box -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:24px;text-align:center;">
            <p style="color:#166534;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Your Verification Code</p>
            <p style="color:#15803d;font-size:36px;font-weight:800;letter-spacing:10px;font-family:'Courier New',Courier,monospace;margin:0;">${code}</p>
          </td></tr>
        </table>

        <!-- Expiry Notice -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:24px;">
          <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
            <p style="color:#92400e;font-size:13px;margin:0;">
              ⏱️ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Security Notice -->
      <tr><td style="padding:0 32px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
            <p style="color:#64748b;font-size:12px;margin:0;">
              🔒 <strong>Security Notice:</strong> If you did not request this verification code, please ignore this email. Your account security is important to us.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;text-align:center;">
          Need help? Contact us at <a href="mailto:support@ekrishi.vercel.app" style="color:#16a34a;text-decoration:none;">support@ekrishi.vercel.app</a>
        </p>
        <p style="color:#cbd5e1;font-size:11px;margin:0;text-align:center;">
          &copy; ${year} Ekrishi Nepal. All rights reserved.<br>
          Connecting Nepal's farms with skilled workers.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function emailLinkTemplate(url: string, purpose: string, userName?: string): string {
  const title =
    purpose === "password_reset" ? "Reset Your Password" : "Verify Your Email";
  const btnText =
    purpose === "password_reset" ? "Reset Password" : "Verify Email";
  const greeting = userName ? `Hello ${userName},` : "Hello,";
  const purposeText = purpose === "password_reset"
    ? "to reset your password for Ekrishi Nepal"
    : "to verify your email address for Ekrishi Nepal";
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f5f1;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#15803d 0%,#22c55e 100%);padding:36px 32px;text-align:center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="padding-right:12px;vertical-align:middle;">
              <div style="width:48px;height:48px;background:#ffffff;border-radius:12px;text-align:center;line-height:48px;font-size:26px;">🌾</div>
            </td>
            <td style="vertical-align:middle;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Ekrishi Nepal</div>
              <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px;">Agriculture Platform</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 32px 24px;">
        <p style="color:#1a1a1a;font-size:16px;margin:0 0 8px;font-weight:600;">${greeting}</p>
        <p style="color:#555555;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Click the button below ${purposeText}:
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td align="center" style="padding:8px 0 24px;">
            <a href="${url}" style="background:#16a34a;color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(22,163,74,0.3);">${btnText}</a>
          </td></tr>
        </table>

        <!-- Expiry Notice -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
            <p style="color:#92400e;font-size:13px;margin:0;">
              ⏱️ This link expires in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
            </p>
          </td></tr>
        </table>

        <!-- Fallback Link -->
        <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;word-break:break-all;">
          Button not working? Copy and paste this link into your browser:<br>
          <a href="${url}" style="color:#16a34a;text-decoration:underline;">${url}</a>
        </p>
      </td></tr>

      <!-- Security Notice -->
      <tr><td style="padding:0 32px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
            <p style="color:#64748b;font-size:12px;margin:0;">
              🔒 <strong>Security Notice:</strong> If you did not request this, please ignore this email. Your account remains secure.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;text-align:center;">
          Need help? Contact us at <a href="mailto:support@ekrishi.vercel.app" style="color:#16a34a;text-decoration:none;">support@ekrishi.vercel.app</a>
        </p>
        <p style="color:#cbd5e1;font-size:11px;margin:0;text-align:center;">
          &copy; ${year} Ekrishi Nepal. All rights reserved.<br>
          Connecting Nepal's farms with skilled workers.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================
export function notificationTitle(type: string): string {
  const titles: Record<string, string> = {
    new_login: "New Login Detected",
    password_changed: "Password Changed",
    phone_changed: "Phone Number Changed",
    email_changed: "Email Changed",
    otp_verified: "OTP Verified",
    account_activated: "Account Activated",
    new_device_login: "New Device Login",
    account_locked: "Account Temporarily Locked",
    account_unlocked: "Account Unlocked",
  };
  return titles[type] || "Notification";
}

export function notificationBody(
  type: string,
  meta: Record<string, unknown> = {}
): string {
  const bodies: Record<string, string> = {
    new_login: `New login from ${meta.browser || "Unknown"} on ${meta.os || "Unknown"}. IP: ${meta.ip || "Unknown"}.`,
    password_changed: "Your password has been changed. If you did not make this change, contact support immediately.",
    phone_changed: "Your phone number has been updated.",
    email_changed: "Your email address has been updated.",
    otp_verified: "OTP verified successfully.",
    account_activated: "Your account is now active!",
    new_device_login: `New device login from ${meta.browser || "Unknown"} on ${meta.os || "Unknown"}.`,
    account_locked: "Too many failed attempts. Account temporarily locked for 15 minutes.",
    account_unlocked: "Your account has been unlocked by an administrator.",
  };
  return bodies[type] || "Check your account for details.";
}

// ============================================
// PARSERS
// ============================================
export function parseBrowser(ua: string | null): {
  browser: string;
  os: string;
  device_type: string;
} {
  if (!ua)
    return { browser: "Unknown", os: "Unknown", device_type: "Unknown" };

  let browser = "Other";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome") && !ua.includes("Edg"))
    browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome"))
    browser = "Safari";

  let os = "Other";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let device_type = "desktop";
  if (ua.includes("Mobile") || ua.includes("Android"))
    device_type = "mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad"))
    device_type = "tablet";

  return { browser, os, device_type };
}
