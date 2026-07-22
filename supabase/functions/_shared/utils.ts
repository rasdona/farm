// ============================================================
// KrishiConnect Nepal — Shared Utilities
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
  APP_URL: Deno.env.get("APP_URL") || "https://krishiconnect.com.np",
  SMS_API_KEY: Deno.env.get("SMS_PROVIDER_API_KEY") || "",
  SMS_SENDER_ID: Deno.env.get("SMS_SENDER_ID") || "KrishiConnect",
  EMAIL_API_KEY: Deno.env.get("EMAIL_PROVIDER_API_KEY") || "",
  EMAIL_FROM: Deno.env.get("EMAIL_FROM") || "noreply@krishiconnect.com.np",
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
  const allowedOrigins = [
    ENV.APP_URL,
    "https://krishiconnect.com.np",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  const o = origin && allowedOrigins.includes(origin) ? origin : ENV.APP_URL;
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
  origin?: string
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export function errorResp(
  msg: string,
  status = 400,
  origin?: string
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
// EMAIL PROVIDER: Resend
// ============================================
export interface EmailResult {
  success: boolean;
  provider: string;
  error?: string;
  message_id?: string;
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
    return { success: false, provider: "resend", error: "Email API key not configured" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: ENV.EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await resp.json();

    if (resp.ok) {
      return { success: true, provider: "resend", message_id: data.id };
    }

    return { success: false, provider: "resend", error: data.message || "Resend error" };
  } catch (err) {
    return {
      success: false,
      provider: "resend",
      error: err instanceof Error ? err.message : "Resend network error",
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
  return `KrishiConnect: Your verification code is ${code}. Purpose: ${purposes[purpose] || purpose}. Valid for 5 minutes. Do not share this code.`;
}

export function emailOTPTemplate(code: string, purpose: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8faf8; margin: 0; padding: 20px;">
<div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
  <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">KrishiConnect Nepal</h1>
    <p style="color: #dcfce7; margin: 8px 0 0;">Agriculture Platform</p>
  </div>
  <div style="padding: 30px;">
    <h2 style="color: #1a1a1a; margin: 0 0 15px; font-size: 18px;">Your Verification Code</h2>
    <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">
      Use the code below to complete your ${purpose.replace(/_/g, " ")}:
    </p>
    <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
    </div>
    <p style="color: #999; font-size: 13px; margin: 15px 0 0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
  </div>
  <div style="background: #f8faf8; padding: 15px 30px; text-align: center;">
    <p style="color: #999; font-size: 12px; margin: 0;">KrishiConnect Nepal &copy; ${new Date().getFullYear()}. For farmers, by farmers.</p>
  </div>
</div>
</body>
</html>`;
}

export function emailLinkTemplate(url: string, purpose: string): string {
  const title =
    purpose === "password_reset" ? "Reset Your Password" : "Verify Your Email";
  const btnText =
    purpose === "password_reset" ? "Reset Password" : "Verify Email";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8faf8; margin: 0; padding: 20px;">
<div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
  <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">KrishiConnect Nepal</h1>
    <p style="color: #dcfce7; margin: 8px 0 0;">Agriculture Platform</p>
  </div>
  <div style="padding: 30px;">
    <h2 style="color: #1a1a1a; margin: 0 0 15px; font-size: 18px;">${title}</h2>
    <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">
      Click the button below to ${purpose.replace(/_/g, " ")}:
    </p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="${url}" style="background: #16a34a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">${btnText}</a>
    </div>
    <p style="color: #999; font-size: 13px; margin: 15px 0 0;">This link expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
    <p style="color: #ccc; font-size: 12px; margin: 10px 0 0; word-break: break-all;">Link: ${url}</p>
  </div>
  <div style="background: #f8faf8; padding: 15px 30px; text-align: center;">
    <p style="color: #999; font-size: 12px; margin: 0;">KrishiConnect Nepal &copy; ${new Date().getFullYear()}. For farmers, by farmers.</p>
  </div>
</div>
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
