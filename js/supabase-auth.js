const SupabaseAuth = {
  client: null,

  init() {
    if (!window.supabase) {
      console.error('[SupabaseAuth] Supabase JS library not loaded');
      return this;
    }
    this.client = window.supabase.createClient(
      'https://yutjmviwwikvwousgtjy.supabase.co',
      'sb_publishable_eBxM3at_prpKRUy8MkG9UQ_kLdlLQ5u'
    );
    console.log('[SupabaseAuth] Client initialized');
    return this;
  },

  async signUp(email, password, metadata = {}) {
    console.log('[SupabaseAuth] signUp:', email);
    return this.client.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
  },

  async signIn(email, password) {
    console.log('[SupabaseAuth] signIn:', email);
    return this.client.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    console.log('[SupabaseAuth] signOut');
    return this.client.auth.signOut();
  },

  async getSession() {
    return this.client.auth.getSession();
  },

  async getUser() {
    return this.client.auth.getUser();
  },

  async resendVerification(email) {
    console.log('[SupabaseAuth] resendVerification:', email);
    return this.client.auth.resend({ type: 'signup', email });
  },

  async resetPassword(email, redirectTo) {
    console.log('[SupabaseAuth] resetPassword:', email);
    return this.client.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async exchangeCodeForSession(code) {
    return this.client.auth.exchangeCodeForSession(code);
  },

  async updatePassword(newPassword) {
    return this.client.auth.updateUser({ password: newPassword });
  },

  async saveProfile(profileData) {
    console.log('[SupabaseAuth] saveProfile:', profileData.user_id);
    const { data, error } = await this.client
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' });
    if (error) console.error('[SupabaseAuth] saveProfile error:', error);
    return { data, error };
  },

  async getProfile(userId) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) console.error('[SupabaseAuth] getProfile error:', error);
    return { profile: data, error };
  },

  async getProfileByMobile(mobile) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('mobile_number', mobile)
      .single();
    return { profile: data, error };
  },

  async updateProfile(userId, updates) {
    const { data, error } = await this.client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return { data, error };
  },

  onAuthStateChange(callback) {
    return this.client.auth.onAuthStateChange(callback);
  }
};
