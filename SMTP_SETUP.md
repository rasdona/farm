# AgriConnect Nepal — Custom SMTP Email Setup Guide

## Overview

This guide configures AgriConnect-branded emails for all authentication flows (OTP, verification, password reset) while keeping Supabase Auth as the authentication provider.

**Sender Configuration:**
- **Sender Name:** AgriConnect Nepal
- **Sender Email:** noreply@agriconnect.com.np

---

## Step 1: Configure Custom SMTP in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Select your project
2. Navigate to **Project Settings** → **Authentication** → **Email**
3. Under **SMTP Settings**, click **Enable custom SMTP**
4. Enter your SMTP credentials:

| Field | Value |
|-------|-------|
| Sender email | `noreply@agriconnect.com.np` |
| Sender name | `AgriConnect Nepal` |
| Host | *(your SMTP provider host, e.g., `smtp.mailgun.org`)* |
| Port number | `587` (or `465` for SSL) |
| Minimum interval between emails | `60` (seconds) |
| Username | *(your SMTP username)* |
| Password | *(your SMTP password)* |

5. Click **Save**

**Recommended SMTP Providers for Nepal:**
- **Mailgun** — Good deliverability, free tier available
- **Amazon SES** — Cost-effective for high volume
- **Resend** — Simple API, already used by Edge Functions
- **Postmark** — Excellent deliverability

---

## Step 2: Update Supabase Email Templates

In the same **Authentication** → **Email** section, update the email templates:

### Confirm Signup Template

Replace the default Supabase template with:

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f5f1;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <tr><td style="background:linear-gradient(135deg,#15803d 0%,#22c55e 100%);padding:36px 32px;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:700;">🌾 AgriConnect Nepal</div>
        <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">Agriculture Platform</div>
      </td></tr>
      <tr><td style="padding:36px 32px;">
        <p style="color:#1a1a1a;font-size:16px;font-weight:600;margin:0 0 8px;">Hello,</p>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Welcome to AgriConnect Nepal. Click the button below to verify your email address:
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{{ .ConfirmationURL }}" style="background:#16a34a;color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Verify Email</a>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:20px 0 0;word-break:break-all;">
          Button not working? Copy this link: {{ .ConfirmationURL }}
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
          This link expires in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;text-align:center;">
          Need help? Contact us at <a href="mailto:support@agriconnect.com.np" style="color:#16a34a;">support@agriconnect.com.np</a>
        </p>
        <p style="color:#cbd5e1;font-size:11px;margin:0;text-align:center;">
          &copy; 2025 AgriConnect Nepal. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
```

### Magic Link Template

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f5f1;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <tr><td style="background:linear-gradient(135deg,#15803d 0%,#22c55e 100%);padding:36px 32px;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:700;">🌾 AgriConnect Nepal</div>
        <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">Agriculture Platform</div>
      </td></tr>
      <tr><td style="padding:36px 32px;">
        <p style="color:#1a1a1a;font-size:16px;font-weight:600;margin:0 0 8px;">Hello,</p>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Click the button below to sign in to your AgriConnect Nepal account:
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{{ .ConfirmationURL }}" style="background:#16a34a;color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Sign In</a>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:20px 0 0;word-break:break-all;">
          Button not working? Copy this link: {{ .ConfirmationURL }}
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
          If you didn't request this, please ignore this email.
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
          &copy; 2025 AgriConnect Nepal. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
```

### Change Email Address Template

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f5f1;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <tr><td style="background:linear-gradient(135deg,#15803d 0%,#22c55e 100%);padding:36px 32px;text-align:center;">
        <div style="color:#ffffff;font-size:22px;font-weight:700;">🌾 AgriConnect Nepal</div>
        <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">Agriculture Platform</div>
      </td></tr>
      <tr><td style="padding:36px 32px;">
        <p style="color:#1a1a1a;font-size:16px;font-weight:600;margin:0 0 8px;">Hello,</p>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Click the button below to confirm your new email address:
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{{ .ConfirmationURL }}" style="background:#16a34a;color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Confirm Email Change</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
          If you didn't request this, please ignore this email.
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
          &copy; 2025 AgriConnect Nepal. All rights reserved.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
```

---

## Step 3: Set Edge Function Environment Variables

Deploy the updated Edge Functions and set environment variables:

```bash
# Navigate to project root
cd farm

# Set environment variables
npx supabase secrets set APP_URL=https://agriconnect.com.np
npx supabase secrets set EMAIL_FROM="AgriConnect Nepal <noreply@agriconnect.com.np>"
npx supabase secrets set SMS_SENDER_ID=AgriConnect
npx supabase secrets set EMAIL_PROVIDER_API_KEY=your_resend_api_key
npx supabase secrets set SMS_PROVIDER_API_KEY=your_sparrow_sms_key

# Deploy updated Edge Functions
npx supabase functions deploy send-otp
npx supabase functions deploy verify-otp
npx supabase functions deploy resend-verification
npx supabase functions deploy register-user
npx supabase functions deploy forgot-password
npx supabase functions deploy login-user
npx supabase functions deploy request-contact-change
npx supabase functions deploy verify-email-link
```

---

## Step 4: Verify Domain (Required for Custom Sender)

For the sender email `noreply@agriconnect.com.np` to work:

### If using Resend:
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add domain `agriconnect.com.np`
3. Add the DNS records provided (SPF, DKIM, DMARC)
4. Wait for DNS propagation (usually 24-48 hours)
5. Verify the domain in Resend dashboard

### If using Supabase Custom SMTP:
1. The SMTP provider handles domain verification
2. Follow their specific DNS setup instructions
3. Ensure SPF and DKIM records are configured

**Required DNS Records:**
```
TXT  @              "v=spf1 include:sendgrid.net ~all"     (SPF)
TXT  resend._domainkey  "p=MIGfMA0GCSq..."                 (DKIM)
TXT  _dmarc            "v=DMARC1; p=none; rua=mailto:..."  (DMARC)
```

---

## Step 5: Test the Email System

### Test Checklist:

1. **Registration Flow:**
   - Register a new account
   - Verify the email arrives from "AgriConnect Nepal <noreply@agriconnect.com.np>"
   - Verify the email contains AgriConnect branding (no Supabase branding)
   - Click the verification link and confirm it works

2. **OTP Flow:**
   - Request an OTP for email verification
   - Verify the OTP email has AgriConnect branding
   - Enter the OTP and confirm verification succeeds

3. **Password Reset:**
   - Request a password reset
   - Verify the reset email has AgriConnect branding
   - Click the reset link and confirm it works

4. **Resend Verification:**
   - On the verify-email page, click "Resend"
   - Verify the new email arrives with AgriConnect branding

5. **Rate Limiting:**
   - Try sending OTP 4+ times within 60 seconds
   - Verify rate limit error is displayed

6. **Invalid OTP:**
   - Enter wrong OTP 5+ times
   - Verify account lockout message appears

### Test Command (Dev Mode):

```bash
# Enable dev mode to see OTPs in console
npx supabase secrets set OTP_DEV_MODE=true

# Test registration
curl -X POST https://your-project.supabase.co/functions/v1/register-user \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"full_name":"Test User","email":"test@example.com","mobile_number":"9841234567","password":"Test1234!"}'

# Check Edge Function logs for OTP
npx supabase functions logs send-otp
```

---

## Architecture Summary

```
User Action → Frontend → Edge Function → Email Provider → Recipient
                                    ↓
                              Supabase Auth (user record)
                                    ↓
                              PostgreSQL (OTP records)
```

**Email Flow:**
1. User triggers action (register, verify, reset)
2. Frontend calls Edge Function (send-otp, register-user, etc.)
3. Edge Function generates OTP, stores hash in `otp_records` table
4. Edge Function calls `sendEmail()` via Resend API (or Supabase SMTP)
5. Email sent from `AgriConnect Nepal <noreply@agriconnect.com.np>`
6. User receives branded email with OTP or verification link
7. User enters OTP / clicks link → Edge Function verifies

**Security Features:**
- OTP codes are SHA-256 hashed with pepper before storage
- Rate limiting: 3 OTPs per 60 seconds, 5 resends per hour
- Account lockout after 5 failed attempts (15 minutes)
- OTP expiration: 10 minutes
- No OTPs exposed in client-side code (except dev mode)
- Audit logging for all verification events
