const EmailService = {
  SUPABASE_URL: 'https://yutjmviwwikvwousgtjy.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_eBxM3at_prpKRUy8MkG9UQ_kLdlLQ5u',

  _log(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[EmailService ${timestamp}]`;
    if (level === 'error') {
      console.error(`${prefix} ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, data || '');
    }
  },

  async _request(endpoint, body) {
    const url = `${this.SUPABASE_URL}/functions/v1/${endpoint}`;
    try {
      this._log('info', `Email Sending Started: ${endpoint}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        this._log('error', `Email Failed: ${endpoint}`, { status: response.status, data });
        return { success: false, message: data.error || data.message || `Server error (${response.status})`, data };
      }
      this._log('info', `Email Sent Successfully: ${endpoint}`, { otpId: data.otp_id });
      return { success: true, data };
    } catch (err) {
      this._log('error', `Email Failed: ${endpoint}`, { error: err.message });
      return { success: false, message: 'Network error. Please check your connection and try again.', error: err.message };
    }
  },

  async sendEmailOtp(email, purpose) {
    this._log('info', `Sending email OTP to: ${email}, purpose: ${purpose || 'registration'}`);
    return this._request('send-otp', {
      identifier: email,
      purpose: purpose || 'registration',
    });
  },

  async verifyEmailOtp(email, code, purpose) {
    this._log('info', `Verifying email OTP for: ${email}`);
    return this._request('verify-otp', {
      identifier: email,
      code: code,
      purpose: purpose || 'registration',
    });
  },

  async sendPhoneOtp(phone, purpose) {
    this._log('info', `Sending phone OTP to: ${phone}, purpose: ${purpose || 'registration'}`);
    return this._request('send-otp', {
      identifier: phone,
      purpose: purpose || 'registration',
    });
  },

  async verifyPhoneOtp(phone, code, purpose) {
    this._log('info', `Verifying phone OTP for: ${phone}`);
    return this._request('verify-otp', {
      identifier: phone,
      code: code,
      purpose: purpose || 'registration',
    });
  },

  async resendOtp(identifier, purpose) {
    this._log('info', `Resending OTP to: ${identifier}`);
    return this._request('send-otp', {
      identifier: identifier,
      purpose: purpose || 'registration',
    });
  }
};
