const SupabaseAuth = {
  client: null,
  SUPABASE_URL: 'https://yutjmviwwikvwousgtjy.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_eBxM3at_prpKRUy8MkG9UQ_kLdlLQ5u',
  BUCKET_NAME: 'avatars',
  _initialized: false,

  init() {
    console.log('[SupabaseAuth] Initializing...');
    if (!window.supabase) {
      console.error('[SupabaseAuth] CRITICAL: Supabase JS library not loaded from CDN');
      return this;
    }
    try {
      this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
      this._initialized = true;
      console.log('[SupabaseAuth] Client initialized OK');
    } catch (err) {
      console.error('[SupabaseAuth] CRITICAL: Failed to create client:', err.message);
    }
    return this;
  },

  _guard() {
    if (!this._initialized || !this.client) {
      throw new Error('Supabase client not initialized. Check CDN load and API key.');
    }
  },

  async checkConnection() {
    console.log('[SupabaseAuth] Checking connection...');
    this._guard();
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) {
        console.error('[SupabaseAuth] Connection check failed:', error.message);
        return { ok: false, error: error.message };
      }
      console.log('[SupabaseAuth] Connection OK');
      return { ok: true };
    } catch (err) {
      console.error('[SupabaseAuth] Connection check exception:', err.message);
      return { ok: false, error: err.message };
    }
  },

  async checkBucket() {
    console.log('[SupabaseAuth] Checking storage bucket:', this.BUCKET_NAME);
    this._guard();
    try {
      const { data: buckets, error: listErr } = await this.client.storage.listBuckets();
      if (listErr) {
        console.error('[SupabaseAuth] Bucket list failed:', listErr.message);
        return { exists: false, error: listErr.message };
      }
      const found = buckets && buckets.some(b => b.name === this.BUCKET_NAME);
      if (found) {
        console.log('[SupabaseAuth] Bucket "' + this.BUCKET_NAME + '" exists');
        return { exists: true };
      } else {
        const names = buckets ? buckets.map(b => b.name).join(', ') : 'none';
        console.error('[SupabaseAuth] Bucket "' + this.BUCKET_NAME + '" NOT found. Available:', names);
        return { exists: false, error: 'Bucket "' + this.BUCKET_NAME + '" not found. Available: ' + names };
      }
    } catch (err) {
      console.error('[SupabaseAuth] Bucket check exception:', err.message);
      return { exists: false, error: err.message };
    }
  },

  async signUp(email, password, metadata = {}) {
    this._guard();
    console.log('[SupabaseAuth] signUp (OTP flow) started:', email);
    const localOtp = DB.createEmailOtp(null, email);
    console.log('%c[DEV OTP] Your verification code: ' + localOtp.otp, 'background:#16a34a;color:#fff;font-size:16px;padding:8px 12px;border-radius:6px;font-weight:bold;');
    try {
      const result = await this.client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: metadata
        }
      });
      if (result.error) {
        console.error('[SupabaseAuth] signUp failed:', result.error.message);
      } else {
        console.log('[SupabaseAuth] signUp success - 6-digit OTP sent to email');
      }
      return result;
    } catch (err) {
      console.error('[SupabaseAuth] signUp exception:', err.message);
      return { data: null, error: { message: err.message } };
    }
  },

  async signIn(email, password) {
    this._guard();
    console.log('[SupabaseAuth] signIn started:', email);
    try {
      const result = await this.client.auth.signInWithPassword({ email, password });
      if (result.error) {
        console.error('[SupabaseAuth] signIn failed:', result.error.message);
      } else {
        console.log('[SupabaseAuth] signIn success');
      }
      return result;
    } catch (err) {
      console.error('[SupabaseAuth] signIn exception:', err.message);
      return { data: null, error: { message: err.message } };
    }
  },

  async signOut() {
    this._guard();
    console.log('[SupabaseAuth] signOut');
    try {
      return await this.client.auth.signOut();
    } catch (err) {
      console.error('[SupabaseAuth] signOut exception:', err.message);
      return { error: err };
    }
  },

  async getSession() {
    this._guard();
    try {
      return await this.client.auth.getSession();
    } catch (err) {
      console.error('[SupabaseAuth] getSession exception:', err.message);
      return { data: { session: null }, error: err };
    }
  },

  async getUser() {
    this._guard();
    try {
      return await this.client.auth.getUser();
    } catch (err) {
      console.error('[SupabaseAuth] getUser exception:', err.message);
      return { data: { user: null }, error: err };
    }
  },

  async sendEmailOtp(email) {
    this._guard();
    console.log('[SupabaseAuth] sendEmailOtp:', email);
    const localOtp = DB.createEmailOtp(null, email);
    console.log('%c[DEV OTP] Your verification code: ' + localOtp.otp, 'background:#16a34a;color:#fff;font-size:16px;padding:8px 12px;border-radius:6px;font-weight:bold;');
    try {
      const result = await this.client.auth.signInWithOtp({
        email
      });
      if (result.error) {
        console.error('[SupabaseAuth] sendEmailOtp failed:', result.error.message);
      } else {
        console.log('[SupabaseAuth] sendEmailOtp sent new 6-digit OTP');
      }
      return result;
    } catch (err) {
      console.error('[SupabaseAuth] sendEmailOtp exception:', err.message);
      return { data: null, error: { message: err.message } };
    }
  },

  async verifyEmailOtp(email, token) {
    this._guard();
    console.log('[SupabaseAuth] verifyEmailOtp:', email);
    const localResult = DB.verifyEmailOtp(email, token);
    if (localResult.success) {
      console.log('[SupabaseAuth] verifyEmailOtp success (local)');
      return { data: { user: { email, id: localResult.userId } }, error: null };
    }
    try {
      const result = await this.client.auth.verifyOtp({
        type: 'email',
        email,
        token
      });
      if (result.error) {
        console.error('[SupabaseAuth] verifyEmailOtp failed:', result.error.message);
        const msg = result.error.message || '';
        if (msg.includes('expired')) {
          result.error.message = 'The verification code has expired. Please request a new one.';
        } else if (msg.includes('Invalid') || msg.includes('Token')) {
          result.error.message = 'Invalid verification code. Please check the code and try again.';
        } else if (msg.includes('rate') || msg.includes('Too many')) {
          result.error.message = 'Too many attempts. Please wait a moment before trying again.';
        }
      } else {
        console.log('[SupabaseAuth] verifyEmailOtp success, session:', !!result.data?.session);
      }
      return result;
    } catch (err) {
      console.error('[SupabaseAuth] verifyEmailOtp exception:', err.message);
      return { data: null, error: { message: err.message } };
    }
  },

  async resetPassword(email, redirectTo) {
    this._guard();
    console.log('[SupabaseAuth] resetPassword:', email);
    try {
      return await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    } catch (err) {
      console.error('[SupabaseAuth] resetPassword exception:', err.message);
      return { error: { message: err.message } };
    }
  },

  async exchangeCodeForSession(code) {
    this._guard();
    try {
      return await this.client.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error('[SupabaseAuth] exchangeCodeForSession exception:', err.message);
      return { error: { message: err.message } };
    }
  },

  async updatePassword(newPassword) {
    this._guard();
    try {
      return await this.client.auth.updateUser({ password: newPassword });
    } catch (err) {
      console.error('[SupabaseAuth] updatePassword exception:', err.message);
      return { error: { message: err.message } };
    }
  },

  async saveProfile(profileData) {
    this._guard();
    console.log('[SupabaseAuth] saveProfile started for user:', profileData.user_id);
    try {
      const { data, error } = await this.client
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });
      if (error) {
        console.error('[SupabaseAuth] saveProfile SQL error:', error.message, error.details || '', error.hint || '');
      } else {
        console.log('[SupabaseAuth] saveProfile success');
      }
      return { data, error };
    } catch (err) {
      console.error('[SupabaseAuth] saveProfile exception:', err.message);
      return { data: null, error: { message: err.message } };
    }
  },

  async getProfile(userId) {
    this._guard();
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) console.error('[SupabaseAuth] getProfile error:', error.message);
      return { profile: data, error };
    } catch (err) {
      console.error('[SupabaseAuth] getProfile exception:', err.message);
      return { profile: null, error: { message: err.message } };
    }
  },

  async getProfileByMobile(mobile) {
    this._guard();
    console.log('[SupabaseAuth] getProfileByMobile:', mobile);
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('mobile_number', mobile)
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[SupabaseAuth] No profile found for mobile:', mobile);
        } else {
          console.error('[SupabaseAuth] getProfileByMobile error:', error.message);
        }
      }
      return { profile: data, error };
    } catch (err) {
      console.error('[SupabaseAuth] getProfileByMobile exception:', err.message);
      return { profile: null, error: { message: err.message } };
    }
  },

  async updateProfile(userId, updates) {
    this._guard();
    try {
      const { data, error } = await this.client
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      return { data, error };
    } catch (err) {
      console.error('[SupabaseAuth] updateProfile exception:', err.message);
      return { data: null, error: { message: err.message } };
    }
  },

  async uploadAvatar(userId, file) {
    this._guard();
    console.log('[SupabaseAuth] uploadAvatar started for user:', userId);
    try {
      const ext = (file.name && file.name.split('.').pop()) || 'jpg';
      const path = userId + '/avatar.' + ext;
      const contentType = file.type || 'image/jpeg';

      console.log('[SupabaseAuth] Uploading to bucket:', this.BUCKET_NAME, 'path:', path, 'size:', file.size || 'unknown', 'type:', contentType);

      const UPLOAD_TIMEOUT_MS = 30000;
      const uploadPromise = this.client.storage
        .from(this.BUCKET_NAME)
        .upload(path, file, { upsert: true, contentType });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), UPLOAD_TIMEOUT_MS)
      );

      const { error: upErr } = await Promise.race([uploadPromise, timeoutPromise]);

      if (upErr) {
        console.error('[SupabaseAuth] uploadAvatar upload failed:', upErr.message, upErr);
        return { url: null, error: upErr.message };
      }

      const { data: urlData } = this.client.storage.from(this.BUCKET_NAME).getPublicUrl(path);
      const publicUrl = urlData ? urlData.publicUrl + '?t=' + Date.now() : null;

      if (publicUrl) {
        console.log('[SupabaseAuth] uploadAvatar success:', publicUrl);
      } else {
        console.warn('[SupabaseAuth] uploadAvatar got no public URL');
      }
      return { url: publicUrl, error: null };
    } catch (err) {
      console.error('[SupabaseAuth] uploadAvatar exception:', err.message);
      const msg = err.message && err.message.includes('timed out')
        ? 'Profile picture upload failed. Please try again.'
        : err.message;
      return { url: null, error: msg };
    }
  },

  onAuthStateChange(callback) {
    this._guard();
    return this.client.auth.onAuthStateChange(callback);
  }
};
