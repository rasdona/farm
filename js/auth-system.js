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
    if (data.roles && data.roles.length > 0) { /* roles optional — anyone can register */ }
    if (!data.province) errors.push({ field: 'province', message: 'Select province' });
    if (!data.district) errors.push({ field: 'district', message: 'Select district' });
    return errors;
  },

  // ═══════════════════════════════════════════════════════
  // REGISTRATION (Supabase Auth)
  // ═══════════════════════════════════════════════════════

  async register(data) {
    const steps = [];
    const log = (step, status, detail) => {
      const entry = { step, status, detail: detail || '', time: new Date().toISOString() };
      steps.push(entry);
      const icon = status === 'started' ? '▶' : status === 'success' ? '✓' : '✗';
      console.log('[Reg ' + icon + '] Step ' + step + ': ' + status + (detail ? ' — ' + detail : ''));
    };

    // ── Step 1: Validate ──
    log(1, 'started', 'Validating form data');
    const validation = this.validateRegistration(data);
    if (validation.length > 0) {
      log(1, 'failed', validation[0].message);
      return { success: false, errors: validation, steps };
    }
    log(1, 'success', 'Validation passed');

    const phone = data.phone.replace(/\s/g, '');
    const email = data.email.trim().toLowerCase();

    // ── Step 2: Check Supabase client ──
    log(2, 'started', 'Checking Supabase client');
    try {
      if (!SupabaseAuth._initialized) {
        SupabaseAuth.init();
      }
      SupabaseAuth._guard();
      log(2, 'success', 'Supabase client ready');
    } catch (err) {
      log(2, 'failed', err.message);
      return { success: false, message: 'Cannot connect to server. Please refresh the page and try again.', steps };
    }

    // ── Step 3: Duplicate check (mobile) ──
    log(3, 'started', 'Checking mobile number: ' + phone);
    try {
      const { profile: existingMobile, error: mobileErr } = await SupabaseAuth.getProfileByMobile(phone);
      if (mobileErr && mobileErr.message && !mobileErr.message.includes('PGRST116')) {
        log(3, 'failed', 'Mobile check error: ' + mobileErr.message);
      }
      if (existingMobile) {
        log(3, 'failed', 'Mobile number already registered');
        return { success: false, errors: [{ field: 'phone', message: 'यो फोन नम्बर पहिले नै दर्ता भएको छ' }], steps };
      }
      log(3, 'success', 'Mobile number available');
    } catch (err) {
      log(3, 'failed', 'Mobile check exception: ' + err.message);
    }

    // ── Step 4: Duplicate check (email, localStorage) ──
    log(4, 'started', 'Checking email in local storage');
    try {
      if (DB.getUserByEmail(email)) {
        log(4, 'failed', 'Email already registered locally');
        return { success: false, errors: [{ field: 'email', message: 'यो इमेल पहिले नै दर्ता भएको छ' }], steps };
      }
      log(4, 'success', 'Email available locally');
    } catch (err) {
      log(4, 'failed', 'Email check exception: ' + err.message);
    }

    // ── Step 5: Supabase Auth signUp ──
    const userRoles = (data.roles && data.roles.length > 0) ? data.roles : ['farmer'];
    log(5, 'started', 'Creating Supabase Auth user for: ' + email);
    let authData = null;
    try {
      const result = await SupabaseAuth.signUp(email, data.password, {
        full_name: data.name.trim(),
        mobile_number: phone,
        role: userRoles[0],
        roles: JSON.stringify(userRoles)
      });

      if (result.error) {
        const msg = result.error.message || 'Sign up failed';
        log(5, 'failed', msg);
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          return { success: false, errors: [{ field: 'email', message: 'यो इमेल पहिले नै दर्ता भएको छ' }], steps };
        }
        return { success: false, message: 'Account creation failed: ' + msg, steps };
      }

      authData = result.data;
      if (!authData || !authData.user) {
        log(5, 'failed', 'No user returned from signUp');
        return { success: false, message: 'Account creation failed. No user data returned.', steps };
      }
      log(5, 'success', 'Auth user created, id: ' + authData.user.id);
    } catch (err) {
      log(5, 'failed', 'SignUp exception: ' + err.message);
      return { success: false, message: 'Account creation failed: ' + err.message, steps };
    }

    // ── Step 6: Upload photo to Storage (if provided) ──
    let profilePhotoUrl = '';
    if (data.photoDataUrl) {
      log(6, 'started', 'Uploading profile photo to storage');
      try {
        if (data.photoFile) {
          const { url, error: uploadErr } = await SupabaseAuth.uploadAvatar(authData.user.id, data.photoFile);
          if (url) {
            profilePhotoUrl = url;
            log(6, 'success', 'Photo uploaded to storage: ' + url);
          } else {
            log(6, 'failed', 'Storage upload failed: ' + (uploadErr || 'unknown'));
            console.warn('[Registration] Photo storage upload failed, continuing without photo:', uploadErr);
          }
        } else if (data.photoDataUrl && data.photoDataUrl.startsWith('http')) {
          profilePhotoUrl = data.photoDataUrl;
          log(6, 'success', 'Using existing photo URL');
        } else {
          log(6, 'failed', 'No photo file to upload');
        }
      } catch (err) {
        log(6, 'failed', 'Photo upload exception: ' + err.message);
        console.warn('[Registration] Photo upload failed, continuing without photo:', err.message);
      }
    } else {
      log(6, 'success', 'No photo to upload (skipped)');
    }

    // ── Step 7: Save profile to Supabase DB ──
    const profileData = {
      user_id: authData.user.id,
      full_name: data.name.trim(),
      mobile_number: phone,
      role: userRoles[0],
      roles: userRoles,
      province: data.province || '',
      district: data.district || '',
      municipality: data.municipality || '',
      ward: data.ward || '',
      gender: data.gender || '',
      dob: data.dob || '',
      citizenship_number: data.citizenshipNumber || '',
      preferred_language: data.preferredLanguage || 'ne'
    };
    if (profilePhotoUrl) {
      profileData.profile_picture_url = profilePhotoUrl;
    }

    log(7, 'started', 'Saving profile to database');
    try {
      const { data: profileResult, error: profileErr } = await SupabaseAuth.saveProfile(profileData);
      if (profileErr) {
        log(7, 'failed', 'Profile save SQL error: ' + (profileErr.message || JSON.stringify(profileErr)));
        console.error('[Registration] Profile save failed (non-blocking):', profileErr);
      } else {
        log(7, 'success', 'Profile saved to database');
      }
    } catch (err) {
      log(7, 'failed', 'Profile save exception: ' + err.message);
      console.error('[Registration] Profile save exception (non-blocking):', err.message);
    }

    // ── Step 8: Cache user in localStorage ──
    log(8, 'started', 'Caching user in localStorage');
    const localUser = {
      id: 'USR' + Date.now(),
      supabase_id: authData.user.id,
      name: data.name.trim(),
      phone: phone,
      email: email,
      roles: userRoles,
      role: userRoles[0],
      activeRole: userRoles[0],
      province: data.province || '',
      district: data.district || '',
      municipality: data.municipality || '',
      ward: data.ward || '',
      gender: data.gender || '',
      dob: data.dob || '',
      citizenshipNumber: data.citizenshipNumber || '',
      preferredLanguage: data.preferredLanguage || 'ne',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(data.name.trim()),
      profilePhotoUrl: profilePhotoUrl || '',
      profilePhotoVerified: false,
      requiresPhotoUpload: !profilePhotoUrl,
      verified: false,
      suspended: false,
      emailVerified: false,
      phoneVerified: false,
      mobileVerified: false,
      verificationMethod: 'email',
      createdAt: new Date().toISOString()
    };

    try {
      DB.addUser(localUser);
      log(8, 'success', 'User cached in localStorage, id: ' + localUser.id);
    } catch (err) {
      log(8, 'failed', 'localStorage write failed: ' + err.message);
      console.error('[Registration] localStorage write failed (non-blocking):', err.message);
    }

    // ── Step 9: Done ──
    log(9, 'success', 'Registration complete');
    console.log('[Registration] ALL STEPS:', steps.map(s => s.step + ':' + s.status).join(' → '));

    return {
      success: true,
      user: localUser,
      message: 'Your account has been created successfully. Please check your email and click the verification link before logging in.',
      requiresEmailVerification: true,
      steps
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
  // DYNAMIC ROLE MANAGEMENT
  // ═══════════════════════════════════════════════════════

  setActiveRole(userId, role) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.roles || !user.roles.includes(role)) {
      return { success: false, message: 'You do not have this role. Add it first.' };
    }
    DB.updateUser(userId, { activeRole: role });
    const currentUser = JSON.parse(localStorage.getItem('agri_currentUser'));
    if (currentUser && currentUser.id === userId) {
      currentUser.activeRole = role;
      localStorage.setItem('agri_currentUser', JSON.stringify(currentUser));
    }
    return { success: true, activeRole: role };
  },

  getActiveRole(userId) {
    const user = DB.getUserById(userId);
    return user?.activeRole || user?.role || 'farmer';
  },

  addRole(userId, role) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.roles) user.roles = [];
    if (user.roles.includes(role)) return { success: false, message: 'You already have this role' };
    user.roles.push(role);
    DB.updateUser(userId, { roles: user.roles });
    const currentUser = JSON.parse(localStorage.getItem('agri_currentUser'));
    if (currentUser && currentUser.id === userId) {
      currentUser.roles = user.roles;
      localStorage.setItem('agri_currentUser', JSON.stringify(currentUser));
    }
    return { success: true, roles: user.roles };
  },

  removeRole(userId, role) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.roles || !user.roles.includes(role)) return { success: false, message: 'You do not have this role' };
    if (user.roles.length <= 1) return { success: false, message: 'Cannot remove your only role. Add another role first.' };
    user.roles = user.roles.filter(r => r !== role);
    const newActive = (user.activeRole === role) ? user.roles[0] : user.activeRole;
    DB.updateUser(userId, { roles: user.roles, activeRole: newActive });
    const currentUser = JSON.parse(localStorage.getItem('agri_currentUser'));
    if (currentUser && currentUser.id === userId) {
      currentUser.roles = user.roles;
      currentUser.activeRole = newActive;
      localStorage.setItem('agri_currentUser', JSON.stringify(currentUser));
    }
    return { success: true, roles: user.roles, activeRole: newActive };
  },

  getUserRoles(userId) {
    const user = DB.getUserById(userId);
    if (!user) return [];
    const allRoles = AUTH_ROLES || DB.getRoles() || [];
    return (user.roles || []).map(roleId => {
      const meta = allRoles.find(r => r.id === roleId);
      return meta || { id: roleId, name: roleId, icon: '👤' };
    });
  },

  getAvailableRolesToAdd(userId) {
    const user = DB.getUserById(userId);
    if (!user) return [];
    const allRoles = AUTH_ROLES || DB.getRoles() || [];
    const userRoles = user.roles || [];
    return allRoles.filter(r => !userRoles.includes(r.id));
  },

  canAccessFeature(userId, feature) {
    const role = this.getActiveRole(userId);
    const features = {
      'post-jobs': ['farmer', 'cooperative'],
      'apply-jobs': ['worker'],
      'create-listing': ['seller', 'farmer', 'cooperative'],
      'buy-products': ['buyer', 'farmer', 'worker'],
      'rent-equipment': ['buyer', 'farmer', 'worker'],
      'list-equipment': ['equipment_owner', 'farmer'],
      'provide-transport': ['transport_provider', 'worker'],
      'arma-parma': ['farmer', 'cooperative'],
      'manage-farm': ['farmer', 'cooperative'],
      'dashboard-farmer': ['farmer', 'cooperative'],
      'dashboard-worker': ['worker', 'farmer'],
    };
    return features[feature]?.includes(role) || false;
  },

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
