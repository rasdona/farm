const AuthSystem = {
  SESSION_KEY: 'agri_session',

  // ═══════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════

  validateRegistration(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push({ field: 'name', message: 'Full name is required (min 2 characters)' });
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push({ field: 'email', message: 'Valid email address is required' });
    if (!data.phone || !/^[9][0-9]{9}$/.test(data.phone.replace(/\s/g, ''))) errors.push({ field: 'phone', message: 'Valid 10-digit phone number required (98XXXXXXXX)' });
    if (!data.password || data.password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(data.password)) errors.push({ field: 'password', message: 'Password must contain uppercase letter' });
    if (!/[a-z]/.test(data.password)) errors.push({ field: 'password', message: 'Password must contain lowercase letter' });
    if (!/[0-9]/.test(data.password)) errors.push({ field: 'password', message: 'Password must contain a number' });
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) errors.push({ field: 'password', message: 'Password must contain special character' });
    if (data.password !== data.confirmPassword) errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    if (!data.roles || data.roles.length === 0) errors.push({ field: 'roles', message: 'Select at least one role' });
    if (!data.province) errors.push({ field: 'province', message: 'Select province' });
    if (!data.district) errors.push({ field: 'district', message: 'Select district' });
    return errors;
  },

  // ═══════════════════════════════════════════════════════
  // REGISTRATION (Supabase Auth)
  // ═══════════════════════════════════════════════════════

  async register(data) {
    const validation = this.validateRegistration(data);
    if (validation.length > 0) return { success: false, errors: validation };

    const phone = data.phone.replace(/\s/g, '');
    const email = data.email.trim().toLowerCase();

    // Check duplicates in Supabase profiles table
    const { profile: existingMobile } = await SupabaseAuth.getProfileByMobile(phone);
    if (existingMobile) return { success: false, errors: [{ field: 'phone', message: 'Mobile number already registered' }] };

    // Check localStorage for quick feedback
    if (DB.getUserByEmail(email)) return { success: false, errors: [{ field: 'email', message: 'Email already registered' }] };

    console.log('[Registration] Creating user via Supabase Auth...');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await SupabaseAuth.signUp(email, data.password, {
      full_name: data.name.trim(),
      mobile_number: phone,
      role: data.roles[0],
      roles: JSON.stringify(data.roles)
    });

    if (authError) {
      console.error('[Registration] Supabase Auth error:', authError.message);
      if (authError.message.includes('already registered')) {
        return { success: false, errors: [{ field: 'email', message: 'Email already registered' }] };
      }
      return { success: false, message: authError.message || 'Registration failed. Please try again.' };
    }

    if (!authData.user) {
      return { success: false, message: 'Registration failed. Please try again.' };
    }

    console.log('[Registration] User created. Supabase will send verification email.');

    // Save additional profile data to Supabase profiles table
    const profileData = {
      user_id: authData.user.id,
      full_name: data.name.trim(),
      mobile_number: phone,
      role: data.roles[0],
      roles: data.roles,
      province: data.province || '',
      district: data.district || '',
      municipality: data.municipality || '',
      ward: data.ward || '',
      gender: data.gender || '',
      dob: data.dob || '',
      citizenship_number: data.citizenshipNumber || '',
      preferred_language: data.preferredLanguage || 'ne'
    };

    if (data.photoDataUrl) {
      profileData.profile_picture_url = data.photoDataUrl;
    }

    await SupabaseAuth.saveProfile(profileData);

    // Cache in localStorage for backward compatibility
    const localUser = {
      id: 'USR' + Date.now(),
      supabase_id: authData.user.id,
      name: data.name.trim(),
      phone: phone,
      email: email,
      roles: data.roles,
      role: data.roles[0],
      province: data.province || '',
      district: data.district || '',
      municipality: data.municipality || '',
      ward: data.ward || '',
      gender: data.gender || '',
      dob: data.dob || '',
      citizenshipNumber: data.citizenshipNumber || '',
      preferredLanguage: data.preferredLanguage || 'ne',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(data.name.trim()),
      profilePhotoUrl: data.photoDataUrl || '',
      verified: false,
      suspended: false,
      emailVerified: false,
      phoneVerified: false,
      mobileVerified: false,
      verificationMethod: 'email',
      createdAt: new Date().toISOString()
    };

    DB.addUser(localUser);

    return {
      success: true,
      user: localUser,
      message: 'Your account has been created successfully. Please check your email and click the verification link before logging in.',
      requiresEmailVerification: true
    };
  },

  // ═══════════════════════════════════════════════════════
  // LOGIN (Supabase Auth)
  // ═══════════════════════════════════════════════════════

  detectInputType(input) {
    const cleaned = input.replace(/\s/g, '');
    if (/^[9][0-9]{9}$/.test(cleaned)) return 'phone';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return 'email';
    return 'unknown';
  },

  async login(identifier, password, options = {}) {
    const type = this.detectInputType(identifier);
    let email = identifier;
    let localUser = null;

    if (type === 'phone') {
      localUser = DB.getUserByPhone(identifier.replace(/\s/g, ''));
      if (!localUser) return { success: false, message: 'No account found with this phone number' };
      email = localUser.email;
    } else if (type === 'email') {
      localUser = DB.getUserByEmail(identifier);
    }

    console.log('[Login] Signing in via Supabase Auth...');

    const { data, error } = await SupabaseAuth.signIn(email, password);

    if (error) {
      console.error('[Login] Supabase Auth error:', error.message);
      if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
        return {
          success: false,
          message: 'Your email address has not been verified. Please check your email for the verification link.',
          requiresEmailVerification: true,
          email: email
        };
      }
      if (error.message.includes('Invalid login')) {
        return { success: false, message: 'Invalid email or password' };
      }
      return { success: false, message: error.message || 'Login failed. Please try again.' };
    }

    if (!data.user) {
      return { success: false, message: 'Login failed. Please try again.' };
    }

    // Check if email is confirmed
    if (!data.user.confirmed_at) {
      return {
        success: false,
        message: 'Your email address has not been verified. Please check your email for the verification link.',
        requiresEmailVerification: true,
        email: email
      };
    }

    // Fetch profile from Supabase and cache in localStorage
    const { profile } = await SupabaseAuth.getProfile(data.user.id);
    if (profile) {
      if (localUser) {
        DB.updateUser(localUser.id, {
          supabase_id: data.user.id,
          emailVerified: true,
          name: profile.full_name || localUser.name,
          phone: profile.mobile_number || localUser.phone,
          role: profile.role || localUser.role,
          roles: profile.roles || localUser.roles,
          province: profile.province || localUser.province,
          district: profile.district || localUser.district,
          municipality: profile.municipality || localUser.municipality,
          ward: profile.ward || localUser.ward,
          profilePhotoUrl: profile.profile_picture_url || localUser.profilePhotoUrl
        });
        localUser = DB.getUserById(localUser.id);
      } else {
        // Create localStorage record from Supabase profile
        const newUser = {
          id: 'USR' + Date.now(),
          supabase_id: data.user.id,
          name: profile.full_name || '',
          phone: profile.mobile_number || '',
          email: email,
          roles: profile.roles || [profile.role || 'farmer'],
          role: profile.role || 'farmer',
          province: profile.province || '',
          district: profile.district || '',
          municipality: profile.municipality || '',
          ward: profile.ward || '',
          gender: profile.gender || '',
          dob: profile.dob || '',
          citizenshipNumber: profile.citizenship_number || '',
          avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(profile.full_name || email),
          profilePhotoUrl: profile.profile_picture_url || '',
          verified: profile.verified || false,
          suspended: profile.suspended || false,
          emailVerified: true,
          phoneVerified: false,
          mobileVerified: false,
          verificationMethod: 'email',
          createdAt: profile.created_at || new Date().toISOString()
        };
        DB.addUser(newUser);
        localUser = newUser;
      }
    } else if (localUser) {
      DB.updateUser(localUser.id, { emailVerified: true, supabase_id: data.user.id });
      localUser = DB.getUserById(localUser.id);
    }

    if (localUser && localUser.suspended) {
      return { success: false, message: 'Your account has been suspended' };
    }

    // Create session
    if (options.rememberMe) {
      const session = DB.createSession(localUser.id, this._getDeviceInfo());
      localStorage.setItem(this.SESSION_KEY, session.id);
    }

    DB.addAuditLog({ action: 'login', userId: localUser?.id, details: `User logged in: ${localUser?.name || email}`, ip: this._getIP() });

    return { success: true, user: localUser };
  },

  // ═══════════════════════════════════════════════════════
  // EMAIL VERIFICATION (Supabase built-in)
  // ═══════════════════════════════════════════════════════

  async sendEmailVerification(userId) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.email) return { success: false, message: 'No email address on file' };
    if (user.emailVerified) return { success: false, message: 'Email already verified' };

    const { error } = await SupabaseAuth.resendVerification(user.email);
    if (error) {
      return { success: false, message: error.message || 'Failed to send verification email.' };
    }
    return { success: true, message: `Verification email sent to ${user.email}` };
  },

  async resendEmailVerification(email) {
    const user = DB.getUserByEmail(email);
    if (!user) return { success: false, message: 'No account found with this email' };
    if (user.emailVerified) return { success: false, message: 'Email already verified' };

    const { error } = await SupabaseAuth.resendVerification(email);
    if (error) {
      return { success: false, message: error.message || 'Failed to resend verification email.' };
    }
    return { success: true, message: `Verification email sent to ${email}` };
  },

  // ═══════════════════════════════════════════════════════
  // PASSWORD RESET (Supabase built-in)
  // ═══════════════════════════════════════════════════════

  async sendPasswordReset(email) {
    const redirectUrl = window.location.origin + '/forgot-password.html?step=newpassword';
    const { error } = await SupabaseAuth.resetPassword(email, redirectUrl);
    if (error) {
      return { success: false, message: error.message || 'Failed to send reset email.' };
    }
    return { success: true, message: `Password reset email sent to ${email}` };
  },

  async resetPasswordWithCode(code, newPassword) {
    const { error: sessionError } = await SupabaseAuth.exchangeCodeForSession(code);
    if (sessionError) {
      return { success: false, message: 'Invalid or expired reset link. Please request a new one.' };
    }
    const { error } = await SupabaseAuth.updatePassword(newPassword);
    if (error) {
      return { success: false, message: error.message || 'Failed to reset password.' };
    }
    return { success: true };
  },

  // ═══════════════════════════════════════════════════════
  // PROFILE COMPLETION
  // ═══════════════════════════════════════════════════════

  hasUploadedPhoto(user) {
    if (!user) return false;
    return !!(user.profilePhotoUrl && !user.profilePhotoUrl.includes('dicebear'));
  },

  requiresPhotoUpload(user) {
    if (!user) return false;
    if (user.role === 'admin') return false;
    return user.requiresPhotoUpload !== false && !this.hasUploadedPhoto(user);
  },

  getProfileCompletion(user) {
    if (!user) return { percentage: 0, tasks: [] };
    let completed = 0;
    const total = 10;
    const tasks = [];
    if (user.name) completed++; else tasks.push('Add your name');
    if (user.email) completed++; else tasks.push('Add email address');
    if (user.emailVerified) completed++; else tasks.push('Verify your email');
    if (user.phone) completed++; else tasks.push('Add phone number');
    if (user.district) completed++; else tasks.push('Add your district');
    if (user.roles && user.roles.length > 0) completed++; else tasks.push('Select your role');
    if (this.hasUploadedPhoto(user)) completed++; else tasks.push('Upload profile photo');
    if (user.phoneVerified || user.mobileVerified) completed++; else tasks.push('Verify phone (future)');
    if (user.citizenshipNumber) completed++; else tasks.push('Add citizenship number');
    if (user.verified) completed++; else tasks.push('Get verified');
    const notCompleted = total - completed;
    return { percentage: Math.round((completed / total) * 100), completed, total, tasks: tasks.slice(0, 4), notCompleted };
  },

  // ═══════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════
  // PHONE OTP (localStorage-based for now)
  // ═══════════════════════════════════════════════════════

  async sendPhoneOtp(userId) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    const otp = DB.createPhoneOtp(user.id, user.phone);
    console.log('[Phone OTP] Sent to:', user.phone);
    return { success: true, message: `OTP sent to ${user.phone}` };
  },

  verifyPhone(otp) {
    const user = DB.getUserById(localStorage.getItem('agri_currentUser'));
    const phone = user ? user.phone : '';
    const result = DB.verifyPhoneOtp(phone, otp);
    if (result.success && result.userId) {
      DB.updateUser(result.userId, { phoneVerified: true, mobileVerified: true });
    }
    return result;
  },

  // ═══════════════════════════════════════════════════════
  // PASSWORD RESET (localStorage-based for phone)
  // ═══════════════════════════════════════════════════════

  async sendPasswordResetOtp(phone) {
    const user = DB.getUserByPhone(phone);
    if (!user) return { success: false, message: 'No account found with this phone number' };
    const otp = DB.createPasswordReset(user.id, phone);
    console.log('[Password Reset OTP] Sent to:', phone);
    return { success: true, userId: user.id, message: `OTP sent to ${phone}` };
  },

  verifyPasswordResetOtp(userId, otp) {
    return DB.verifyPasswordReset(userId, otp);
  },

  async resetPassword(userId, newPassword) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    DB.updateUser(userId, { password: this.hashPassword(newPassword) });
    DB.addAuditLog({ action: 'password_reset', userId, details: `Password reset for: ${user.name || user.email}` });
    return { success: true, message: 'Password reset successful' };
  },

  // ═══════════════════════════════════════════════════════
  // PASSWORD HASHING
  // ═══════════════════════════════════════════════════════

  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'hashed_' + Math.abs(hash).toString(36);
  },

  // ═══════════════════════════════════════════════════════

  _getIP() { return '192.168.1.' + Math.floor(Math.random() * 255); },

  _getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Unknown Device';
    if (/iPhone/.test(ua)) device = 'iPhone';
    else if (/iPad/.test(ua)) device = 'iPad';
    else if (/Android/.test(ua)) device = 'Android Phone';
    else if (/Windows/.test(ua)) device = 'Windows PC';
    else if (/Mac/.test(ua)) device = 'Mac';
    else if (/Linux/.test(ua)) device = 'Linux PC';
    return { type: device, browser: this._getBrowser(), os: this._getOS(), fingerprint: btoa(ua).substr(0, 16), lastSeen: new Date().toISOString() };
  },

  _getBrowser() {
    const ua = navigator.userAgent;
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'Chrome';
    if (/Firefox/.test(ua)) return 'Firefox';
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
    if (/Edge/.test(ua)) return 'Edge';
    return 'Other';
  },

  _getOS() {
    const ua = navigator.userAgent;
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad/.test(ua)) return 'iOS';
    return 'Unknown';
  }
};
