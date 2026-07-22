# KrishiConnect Nepal — Verification System API

Production-grade OTP and email verification system built on Supabase Edge Functions.

## Architecture

```
Registration/Login Request
        ↓
   Rate Limiting (3 req/60s)
        ↓
   Create OTP Record (SHA-256 hashed)
        ↓
   Send via Provider (Sparrow SMS / Resend)
        ↓
   User Enters OTP (6 boxes, auto-focus)
        ↓
   Verify Hash (constant-time comparison)
        ↓
   Activate Account / Complete Action
```

## Security Model

| Feature | Implementation |
|---------|---------------|
| OTP Storage | SHA-256 + pepper, never plain text |
| Hash Function | `pgcrypto` `digest(pepper:code:purpose, 'sha256')` |
| OTP Expiry | SMS: 5 min, Email: 10 min |
| Max Attempts | 5 per OTP |
| Lockout | 15 minutes after 5 failures |
| Rate Limiting | 3 sends/60s, 5 resends/hour |
| Login Lockout | 5 attempts, 15 min lock |
| CAPTCHA | reCAPTCHA v3 after failures |
| Identifiers | Masked in all logs (e.g., +971***678) |
| Audit Trail | All events logged immutably |

## Environment Variables

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
SMS_PROVIDER_API_KEY=sparrow_api_key
SMS_SENDER_ID=KrishiConnect
EMAIL_PROVIDER_API_KEY=re_xxx
EMAIL_FROM=noreply@krishiconnect.com.np
RECAPTCHA_SECRET=6Lxxxxx
APP_URL=https://krishiconnect.com.np
OTP_DEV_MODE=true  # Set false in production
```

## Edge Functions

| Function | Purpose |
|----------|---------|
| `send-otp` | Generate + send OTP via SMS or email |
| `verify-otp` | Verify OTP code and complete action |
| `register-user` | Register with mobile, email, or both |
| `login-user` | Password or OTP login |
| `forgot-password` | Send reset OTP or email link |
| `reset-password` | Set new password via token/OTP |
| `resend-verification` | Resend OTP with rate limiting |
| `get-verification-status` | Get user's verification status |
| `request-contact-change` | Change mobile/email with password check |
| `verify-email-link` | Verify via email link token |
| `cleanup-otps` | Cron job to purge expired OTPs |

## Database Tables

| Table | Purpose |
|-------|---------|
| `otp_records` | Hashed OTPs with delivery tracking |
| `verification_tokens` | Email link tokens |
| `verification_logs` | Immutable audit trail |
| `rate_limits` | Rate limiting state |
| `contact_change_requests` | Mobile/email change requests |
| `login_history` | All login attempts |
| `failed_login_attempts` | Failed login tracking |
| `user_sessions` | Active sessions |
| `trusted_devices` | Known devices |
| `auth_notifications` | Auth-related notifications |

## API Examples

### Send OTP
```bash
curl -X POST https://yutjmviwwikvwousgtjy.supabase.co/functions/v1/send-otp \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+9779841234567", "purpose": "registration"}'
```

### Verify OTP
```bash
curl -X POST https://yutjmviwwikvwousgtjy.supabase.co/functions/v1/verify-otp \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+9779841234567", "code": "123456", "purpose": "registration"}'
```

### Register User
```bash
curl -X POST https://yutjmviwwikvwousgtjy.supabase.co/functions/v1/register-user \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Ram Bahadur Thapa",
    "mobile_number": "+9779841234567",
    "email": "ram@example.com",
    "password": "securePassword123"
  }'
```

## Dev Mode

Set `OTP_DEV_MODE=true` to:
- Log OTPs to console instead of sending SMS/email
- Return OTP codes in API responses
- Skip CAPTCHA verification

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-otp

# Set secrets
supabase secrets set SMS_PROVIDER_API_KEY=xxx
supabase secrets set EMAIL_PROVIDER_API_KEY=xxx
supabase secrets set OTP_DEV_MODE=false
```

## Frontend Integration

The `verify.html` file provides:
- 6-box OTP input with auto-focus
- Paste support
- Countdown timer (5 min)
- Resend cooldown (60s)
- Dark mode toggle
- Nepali/English language toggle
- Mobile responsive design
- Success/error animations
