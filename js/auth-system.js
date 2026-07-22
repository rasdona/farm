const AuthSystem = {
  SESSION_KEY: 'agri_session',
  REDIRECT_KEY: 'agri_redirect_after',

  // ═══════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════

  validateRegistration(data) {
    const errors = [];
    if (!data.name || data.name.trim().length < 2) errors.push({ field: 'name', message: 'कृपया पूरा नाम लेख्नुहोस् / Full name is required' });
    if (!data.phone || !/^[9][0-9]{9}$/.test(data.phone.replace(/\s/g, ''))) errors.push({ field: 'phone', message: 'मान्य फोन नम्बर लेख्नुहोस् (98XXXXXXXX) / Valid 10-digit phone number required' });
    if (!data.password || data.password.length < 8) errors.push({ field: 'password', message: 'पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ / Password must be at least 8 characters' });
    if (!/[A-Z]/.test(data.password)) errors.push({ field: 'password', message: 'पासवर्डमा ठूलो अक्षर हुनुपर्छ / Password must contain uppercase letter' });
    if (!/[a-z]/.test(data.password)) errors.push({ field: 'password', message: 'पासवर्डमा सानो अक्षर हुनुपर्छ / Password must contain lowercase letter' });
    if (!/[0-9]/.test(data.password)) errors.push({ field: 'password', message: 'पासवर्डमा अंक हुनुपर्छ / Password must contain a number' });
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) errors.push({ field: 'password', message: 'पासवर्डमा विशेष चिह्न हुनुपर्छ / Password must contain special character' });
    if (data.password !== data.confirmPassword) errors.push({ field: 'confirmPassword', message: 'पासवर्ड मिल्दैन / Passwords do not match' });
    if (!data.roles || data.roles.length === 0) errors.push({ field: 'roles', message: 'कम्तिमा एउटा भूमिका छान्नुहोस् / Select at least one role' });
    if (!data.province) errors.push({ field: 'province', message: 'प्रदेश छान्नुहोस् / Select province' });
    if (!data.district) errors.push({ field: 'district', message: 'जिल्ला छान्नुहोस् / Select district' });
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push({ field: 'email', message: 'मान्य इमेल लेख्नुहोस् / Valid email address required' });
    return errors;
  },

  async register(data) {
    const validation = this.validateRegistration(data);
    if (validation.length > 0) return { success: false, errors: validation };

    if (DB.getUserByPhone(data.phone)) return { success: false, errors: [{ field: 'phone', message: 'यो फोन नम्बर पहिले नै दर्ता भएको छ / Mobile number already registered' }] };
    if (data.email && DB.getUserByEmail(data.email)) return { success: false, errors: [{ field: 'email', message: 'यो इमेल पहिले नै दर्ता भएको छ / Email already registered' }] };

    const hashedPassword = await DB.hashPassword(data.password);
    const phone = data.phone.replace(/\s/g, '');

    const user = {
      name: data.name.trim(),
      phone: phone,
      email: data.email || '',
      password: hashedPassword,
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
      avatar: '',
      verified: false,
      phoneVerified: false,
      emailVerified: false,
      farmVerified: false,
      suspended: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString()
    };

    const created = DB.addUser(user);
    data.roles.forEach(role => DB.addUserRole(created.id, role));
    const otpResult = DB.createPhoneOtp(created.id, phone);
    DB.addAuditLog({ action: 'register', userId: created.id, details: `New user registered: ${created.name} (${data.roles.join(', ')})`, ip: this._getIP() });
    DB.addNotification({ userId: created.id, type: 'welcome', text: `स्वागत छ, ${created.name}! / Welcome to KrishiConnect Nepal!`, link: '#' });

    return { success: true, user: created, otpId: otpResult.id, otp: otpResult.otp };
  },

  // ═══════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════

  detectInputType(input) {
    const cleaned = input.replace(/\s/g, '');
    if (/^[9][0-9]{9}$/.test(cleaned)) return 'phone';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return 'email';
    return 'unknown';
  },

  validatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    if (password.length >= 16) score++;
    const labels = ['बलियो / Strong', 'राम्रो / Good', 'ठीकै / Fair', 'कमजोर / Weak', 'अति कमजोर / Very Weak'];
    const labelIndex = score >= 5 ? 0 : score >= 4 ? 1 : score >= 3 ? 2 : score >= 2 ? 3 : 4;
    return { score, label: labels[labelIndex], percentage: Math.min(100, (score / 6) * 100) };
  },

  async login(identifier, password, options = {}) {
    const type = this.detectInputType(identifier);
    let user = null;
    if (type === 'phone') user = DB.getUserByPhone(identifier.replace(/\s/g, ''));
    else if (type === 'email') user = DB.getUserByEmail(identifier);

    if (!user) return { success: false, message: 'यो खाता फेला भएन / No account found with this credential', field: 'identifier' };
    if (user.suspended) return { success: false, message: 'तपाईंको खाता निलम्बन गरिएको छ / Your account has been suspended', field: 'identifier' };
    if (DB.isAccountLocked(user.id)) return { success: false, message: 'धेरै पटक गलत प्रयास भएको छ। कृपया पछि लगइन गर्नुहोस् / Account temporarily locked due to multiple failed attempts', field: 'identifier' };

    const valid = await DB.verifyPassword(password, user.password);
    if (!valid) {
      DB.incrementFailedLogin(user.id);
      DB.addLoginHistory(user.id, { identifier, success: false, reason: 'invalid_password', ip: this._getIP(), userAgent: navigator.userAgent, phone: user.phone });
      const attempts = user.failedLoginAttempts || 0;
      if (attempts >= 4) return { success: false, message: 'खाता लक भयो। ३० मिनेट पर्खनुहोस् / Account locked. Wait 30 minutes', field: 'password' };
      return { success: false, message: `गलत पासवर्ड। ${5 - attempts - 1} पटक बाँकी / Incorrect password. ${4 - attempts} attempts remaining`, field: 'password' };
    }

    DB.resetFailedLogin(user.id);
    if (options.rememberMe) {
      const session = DB.createSession(user.id, this._getDeviceInfo());
      localStorage.setItem(this.SESSION_KEY, session.id);
    }
    DB.addLoginHistory(user.id, { identifier, success: true, ip: this._getIP(), userAgent: navigator.userAgent, phone: user.phone });
    DB.addAuditLog({ action: 'login', userId: user.id, details: `User logged in: ${user.name}`, ip: this._getIP() });

    return { success: true, user };
  },

  // ═══════════════════════════════════════════════════════
  // OTP VERIFICATION
  // ═══════════════════════════════════════════════════════

  sendPhoneOtp(userId) {
    const user = DB.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    const result = DB.createPhoneOtp(userId, user.phone);
    console.log(`[OTP] Phone: ${user.phone} OTP: ${result.otp} (simulated SMS)`);
    return { success: true, otpId: result.id, otp: result.otp, message: `OTP sent to ${user.phone}` };
  },

  verifyPhone(otp) {
    const pendingPhone = sessionStorage.getItem('agri_pendingPhone');
    if (!pendingPhone) return { success: false, message: 'Session expired. Please login again.' };
    const result = DB.verifyPhoneOtp(pendingPhone, otp);
    if (result.success) {
      DB.addAuditLog({ action: 'phone_verified', userId: result.userId, details: `Phone verified: ${pendingPhone}` });
      sessionStorage.removeItem('agri_pendingPhone');
    }
    return result;
  },

  sendPasswordResetOtp(phone) {
    const user = DB.getUserByPhone(phone.replace(/\s/g, ''));
    if (!user) return { success: false, message: 'यो फोन नम्बरमा खाता छैन / No account found with this phone number' };
    const result = DB.createPasswordReset(user.id, phone);
    console.log(`[Password Reset] Phone: ${phone} OTP: ${result.otp} (simulated SMS)`);
    return { success: true, userId: user.id, otp: result.otp, message: `OTP sent to ${phone}` };
  },

  verifyPasswordResetOtp(userId, otp) {
    return DB.verifyPasswordReset(userId, otp);
  },

  async resetPassword(userId, newPassword) {
    if (newPassword.length < 8) return { success: false, message: 'Password must be at least 8 characters' };
    const hash = await DB.hashPassword(newPassword);
    DB.updateUser(userId, { password: hash });
    DB.addAuditLog({ action: 'password_reset', userId, details: 'Password was reset via OTP' });
    return { success: true };
  },

  // ═══════════════════════════════════════════════════════
  // ROLES
  // ═══════════════════════════════════════════════════════

  getRoles() { return DB.getRoles(); },
  getUserRoles(userId) { return DB.getUserRoles(userId); },
  hasRole(userId, role) { return DB.hasRole(userId, role); },

  addRole(userId, role) {
    DB.addUserRole(userId, role);
    const roles = DB.getUserRoles(userId);
    DB.updateUser(userId, { roles, role: roles[0] });
    DB.addAuditLog({ action: 'role_added', userId, details: `Role added: ${role}` });
    return roles;
  },

  removeRole(userId, role) {
    const roles = DB.getUserRoles(userId);
    if (roles.length <= 1) return { success: false, message: 'At least one role is required' };
    DB.removeUserRole(userId, role);
    const updated = DB.getUserRoles(userId);
    DB.updateUser(userId, { roles: updated, role: updated[0] });
    return { success: true, roles: updated };
  },

  // ═══════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════

  submitVerificationDocument(userId, docData) {
    return DB.addVerificationDocument(userId, docData);
  },
  getUserVerifications(userId) { return DB.getVerificationDocuments(userId); },
  getPendingVerifications() { return DB.getAllPendingVerifications(); },
  reviewVerification(docId, status, reviewedBy, notes) {
    const doc = DB.updateVerificationDocument(docId, status, reviewedBy, notes);
    if (doc && status === 'approved') {
      DB.addNotification({ userId: doc.userId, type: 'verification', text: 'तपाईंको पहिचान सत्यापित भयो! / Your identity has been verified!', link: 'profile.html' });
    }
    return doc;
  },

  // ═══════════════════════════════════════════════════════
  // SESSIONS & DEVICES
  // ═══════════════════════════════════════════════════════

  getActiveSessions(userId) { return DB.getSessions(userId); },
  getAllSessions(userId) { return DB.getAllSessions(userId); },
  logoutSession(sessionId) { DB.invalidateSession(sessionId); },
  logoutAllDevices(userId) { DB.invalidateAllSessions(userId); },
  getLoginHistory(userId) { return DB.getLoginHistory(userId); },
  getDevices(userId) { return DB.getDevices(userId); },

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
    if (user.phone) completed++; else tasks.push('Add phone number');
    if (user.district) completed++; else tasks.push('Add your district');
    if (user.roles && user.roles.length > 0) completed++; else tasks.push('Select your role');
    if (this.hasUploadedPhoto(user)) completed++; else tasks.push('Upload profile photo');
    if (user.phoneVerified) completed++; else tasks.push('Verify your phone');
    if (user.email) completed++; else tasks.push('Add email (optional)');
    if (user.emailVerified) completed++; else tasks.push('Verify email');
    if (user.citizenshipNumber) completed++; else tasks.push('Add citizenship number');
    if (user.verified) completed++; else tasks.push('Get verified');
    const notCompleted = total - completed;
    return { percentage: Math.round((completed / total) * 100), completed, total, tasks: tasks.slice(0, 4), notCompleted };
  },

  // ═══════════════════════════════════════════════════════
  // UTILITIES
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