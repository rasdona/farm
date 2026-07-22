const DB = {
  _get(key) { try { return JSON.parse(localStorage.getItem('agri_' + key)); } catch { return null; } },
  _set(key, val) { localStorage.setItem('agri_' + key, JSON.stringify(val)); },
  _remove(key) { localStorage.removeItem('agri_' + key); },
  init() {
    if (!this._get('initialized')) {
      this._set('users', SAMPLE_USERS);
      this._set('jobs', SAMPLE_JOBS);
      this._set('applications', SAMPLE_APPLICATIONS);
      this._set('chats', SAMPLE_CHATS);
      this._set('messages', SAMPLE_MESSAGES);
      this._set('notifications', SAMPLE_NOTIFICATIONS);
      this._set('reviews', SAMPLE_REVIEWS);
      this._set('savedJobs', []);
      this._set('savedWorkers', []);
      this._set('auditLogs', SAMPLE_AUDIT_LOGS);
      this._set('announcements', []);
      this._set('faqs', SAMPLE_FAQS);
      this._set('categories', SAMPLE_CATEGORIES);
      this._set('locations', SAMPLE_LOCATIONS);
      this._set('armaParmaRequests', SAMPLE_ARMA_PARMA);
      this._set('laborCredits', SAMPLE_LABOR_CREDITS);
      this._set('exchangeHistory', SAMPLE_EXCHANGES);
      this._set('communityPosts', SAMPLE_COMMUNITY_POSTS);
      this._set('calendarEvents', SAMPLE_CALENDAR_EVENTS);
      this._set('roles', AUTH_ROLES);
      this._set('userRoles', []);
      this._set('phoneVerification', []);
      this._set('emailVerification', []);
      this._set('emailVerificationTokens', []);
      this._set('passwordReset', []);
      this._set('sessions', []);
      this._set('devices', []);
      this._set('verificationDocuments', []);
      this._set('loginHistory', []);
      this._set('initialized', true);
    }
  },
  getUsers() { return this._get('users') || []; },
  setUsers(u) { this._set('users', u); },
  getUserById(id) { return this.getUsers().find(u => u.id === id); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email === email); },
  getUserByPhone(phone) { return this.getUsers().find(u => u.phone === phone); },
  addUser(user) { const u = this.getUsers(); user.id = 'USR' + Date.now(); user.createdAt = new Date().toISOString(); user.verified = false; user.suspended = false; user.avatar = user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user.name); user.profilePhotoUrl = ''; user.profilePhotoVerified = false; user.requiresPhotoUpload = true; u.push(user); this.setUsers(u); return user; },
  updateUser(id, data) { const u = this.getUsers(); const i = u.findIndex(x => x.id === id); if (i >= 0) { u[i] = { ...u[i], ...data }; this.setUsers(u); return u[i]; } return null; },
  deleteUser(id) { this.setUsers(this.getUsers().filter(u => u.id !== id)); },
  getJobs() { return this._get('jobs') || []; },
  setJobs(j) { this._set('jobs', j); },
  getJobById(id) { return this.getJobs().find(j => j.id === id); },
  getJobsByFarmer(id) { return this.getJobs().filter(j => j.farmerId === id); },
  addJob(job) { const j = this.getJobs(); job.id = 'JOB' + Date.now(); job.createdAt = new Date().toISOString(); job.status = 'active'; job.applications = 0; job.urgent = job.urgent || false; job.workMode = job.workMode || 'paid'; j.push(job); this.setJobs(j); return job; },
  updateJob(id, data) { const j = this.getJobs(); const i = j.findIndex(x => x.id === id); if (i >= 0) { j[i] = { ...j[i], ...data }; this.setJobs(j); return j[i]; } return null; },
  deleteJob(id) { this.setJobs(this.getJobs().filter(j => j.id !== id)); },
  getApplications() { return this._get('applications') || []; },
  setApplications(a) { this._set('applications', a); },
  getApplicationsByJob(jobId) { return this.getApplications().filter(a => a.jobId === jobId); },
  getApplicationsByWorker(workerId) { return this.getApplications().filter(a => a.workerId === workerId); },
  addApplication(app) { const a = this.getApplications(); app.id = 'APP' + Date.now(); app.createdAt = new Date().toISOString(); app.status = 'pending'; a.push(app); this.setApplications(a); const job = this.getJobById(app.jobId); if (job) this.updateJob(app.jobId, { applications: (job.applications || 0) + 1 }); return app; },
  updateApplication(id, data) { const a = this.getApplications(); const i = a.findIndex(x => x.id === id); if (i >= 0) { a[i] = { ...a[i], ...data }; this.setApplications(a); return a[i]; } return null; },
  getChats() { return this._get('chats') || []; },
  setChats(c) { this._set('chats', c); },
  getMessages() { return this._get('messages') || []; },
  setMessages(m) { this._set('messages', m); },
  getMessagesByChat(chatId) { return this.getMessages().filter(m => m.chatId === chatId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); },
  addMessage(msg) { const m = this.getMessages(); msg.id = 'MSG' + Date.now(); msg.createdAt = new Date().toISOString(); msg.read = false; m.push(msg); this.setMessages(m); return msg; },
  getOrCreateChat(userId1, userId2) { let chat = this.getChats().find(c => c.participants.includes(userId1) && c.participants.includes(userId2)); if (!chat) { chat = { id: 'CHT' + Date.now(), participants: [userId1, userId2], createdAt: new Date().toISOString(), lastMessage: '', lastMessageAt: new Date().toISOString() }; const chats = this.getChats(); chats.push(chat); this.setChats(chats); } return chat; },
  getChatsByUser(userId) { return this.getChats().filter(c => c.participants.includes(userId)); },
  getNotifications(userId) { return (this._get('notifications') || []).filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); },
  addNotification(notif) { const n = this._get('notifications') || []; notif.id = 'NTF' + Date.now(); notif.createdAt = new Date().toISOString(); notif.read = false; n.push(notif); this._set('notifications', n); return notif; },
  markNotificationsRead(userId) { const n = this._get('notifications') || []; n.forEach(x => { if (x.userId === userId) x.read = true; }); this._set('notifications', n); },
  getReviews(userId) { return (this._get('reviews') || []).filter(r => r.reviewedId === userId); },
  getReviewsByReviewer(reviewerId) { return (this._get('reviews') || []).filter(r => r.reviewerId === reviewerId); },
  addReview(review) { const r = this._get('reviews') || []; review.id = 'REV' + Date.now(); review.createdAt = new Date().toISOString(); r.push(review); this._set('reviews', r); return review; },
  getAvgRating(userId) { const revs = this.getReviews(userId); if (!revs.length) return 0; return (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1); },
  getSavedJobs(userId) { return (this._get('savedJobs') || []).filter(s => s.userId === userId); },
  saveJob(userId, jobId) { const s = this._get('savedJobs') || []; if (!s.find(x => x.userId === userId && x.jobId === jobId)) { s.push({ userId, jobId, createdAt: new Date().toISOString() }); this._set('savedJobs', s); } },
  unsaveJob(userId, jobId) { this._set('savedJobs', this._get('savedJobs').filter(x => !(x.userId === userId && x.jobId === jobId))); },
  isJobSaved(userId, jobId) { return (this._get('savedJobs') || []).some(x => x.userId === userId && x.jobId === jobId); },
  getSavedWorkers(userId) { return (this._get('savedWorkers') || []).filter(s => s.userId === userId); },
  saveWorker(userId, workerId) { const s = this._get('savedWorkers') || []; if (!s.find(x => x.userId === userId && x.workerId === workerId)) { s.push({ userId, workerId, createdAt: new Date().toISOString() }); this._set('savedWorkers', s); } },
  unsaveWorker(userId, workerId) { this._set('savedWorkers', this._get('savedWorkers').filter(x => !(x.userId === userId && x.workerId === workerId))); },
  isWorkerSaved(userId, workerId) { return (this._get('savedWorkers') || []).some(x => x.userId === userId && x.workerId === workerId); },
  addAuditLog(log) { const l = this._get('auditLogs') || []; log.id = 'LOG' + Date.now(); log.createdAt = new Date().toISOString(); l.push(log); this._set('auditLogs', l); },
  getAuditLogs() { return this._get('auditLogs') || []; },
  getCategories() { return this._get('categories') || SAMPLE_CATEGORIES; },
  getLocations() { return this._get('locations') || SAMPLE_LOCATIONS; },
  getFaqs() { return this._get('faqs') || SAMPLE_FAQS; },
  getAnnouncements() { return this._get('announcements') || []; },
  addAnnouncement(a) { const ann = this.getAnnouncements(); a.id = 'ANN' + Date.now(); a.createdAt = new Date().toISOString(); ann.push(a); this._set('announcements', ann); },

  // ── Arma Parma (Labor Exchange) ──────────────────────
  getArmaParmaRequests() { return this._get('armaParmaRequests') || []; },
  setArmaParmaRequests(r) { this._set('armaParmaRequests', r); },
  getArmaParmaById(id) { return this.getArmaParmaRequests().find(r => r.id === id); },
  getArmaParmaByUser(userId) { return this.getArmaParmaRequests().filter(r => r.farmerId === userId); },
  addArmaParmaRequest(req) {
    const r = this.getArmaParmaRequests();
    req.id = 'AP' + Date.now();
    req.createdAt = new Date().toISOString();
    req.status = 'open';
    req.applicants = [];
    req.agreementAccepted = false;
    r.push(req);
    this.setArmaParmaRequests(r);
    return req;
  },
  updateArmaParmaRequest(id, data) {
    const r = this.getArmaParmaRequests();
    const i = r.findIndex(x => x.id === id);
    if (i >= 0) { r[i] = { ...r[i], ...data }; this.setArmaParmaRequests(r); return r[i]; }
    return null;
  },
  deleteArmaParmaRequest(id) { this.setArmaParmaRequests(this.getArmaParmaRequests().filter(r => r.id !== id)); },

  // ── Labor Credits ────────────────────────────────────
  getLaborCredits() { return this._get('laborCredits') || []; },
  setLaborCredits(c) { this._set('laborCredits', c); },
  getLaborCreditsByUser(userId) {
    const credits = this.getLaborCredits();
    const earned = credits.filter(c => c.earnerId === userId && c.status === 'completed').reduce((s, c) => s + c.days, 0);
    const owed = credits.filter(c => c.debtorId === userId && c.status === 'completed').reduce((s, c) => s + c.days, 0);
    const pendingEarned = credits.filter(c => c.earnerId === userId && c.status === 'pending').reduce((s, c) => s + c.days, 0);
    const pendingOwed = credits.filter(c => c.debtorId === userId && c.status === 'pending').reduce((s, c) => s + c.days, 0);
    return { earned, owed, balance: earned - owed, pendingEarned, pendingOwed };
  },
  addLaborCredit(credit) {
    const c = this.getLaborCredits();
    credit.id = 'LC' + Date.now();
    credit.createdAt = new Date().toISOString();
    credit.status = credit.status || 'pending';
    c.push(credit);
    this.setLaborCredits(c);
    return credit;
  },
  updateLaborCredit(id, data) {
    const c = this.getLaborCredits();
    const i = c.findIndex(x => x.id === id);
    if (i >= 0) { c[i] = { ...c[i], ...data }; this.setLaborCredits(c); return c[i]; }
    return null;
  },

  // ── Exchange History ─────────────────────────────────
  getExchangeHistory() { return this._get('exchangeHistory') || []; },
  setExchangeHistory(e) { this._set('exchangeHistory', e); },
  getExchangesByUser(userId) {
    return this.getExchangeHistory().filter(e => e.farmer1Id === userId || e.farmer2Id === userId);
  },
  addExchange(exchange) {
    const e = this.getExchangeHistory();
    exchange.id = 'EX' + Date.now();
    exchange.createdAt = new Date().toISOString();
    e.push(exchange);
    this.setExchangeHistory(e);
    return exchange;
  },
  updateExchange(id, data) {
    const e = this.getExchangeHistory();
    const i = e.findIndex(x => x.id === id);
    if (i >= 0) { e[i] = { ...e[i], ...data }; this.setExchangeHistory(e); return e[i]; }
    return null;
  },

  // ── Community Posts ──────────────────────────────────
  getCommunityPosts() { return this._get('communityPosts') || []; },
  setCommunityPosts(p) { this._set('communityPosts', p); },
  addCommunityPost(post) {
    const p = this.getCommunityPosts();
    post.id = 'CP' + Date.now();
    post.createdAt = new Date().toISOString();
    post.likes = [];
    post.comments = [];
    p.push(post);
    this.setCommunityPosts(p);
    return post;
  },
  updateCommunityPost(id, data) {
    const p = this.getCommunityPosts();
    const i = p.findIndex(x => x.id === id);
    if (i >= 0) { p[i] = { ...p[i], ...data }; this.setCommunityPosts(p); return p[i]; }
    return null;
  },
  deleteCommunityPost(id) { this.setCommunityPosts(this.getCommunityPosts().filter(p => p.id !== id)); },

  // ── Calendar Events ──────────────────────────────────
  getCalendarEvents() { return this._get('calendarEvents') || []; },
  setCalendarEvents(e) { this._set('calendarEvents', e); },
  getCalendarEventsByUser(userId) { return this.getCalendarEvents().filter(e => e.userId === userId); },
  addCalendarEvent(event) {
    const e = this.getCalendarEvents();
    event.id = 'CAL' + Date.now();
    e.push(event);
    this.setCalendarEvents(e);
    return event;
  },
  deleteCalendarEvent(id) { this.setCalendarEvents(this.getCalendarEvents().filter(e => e.id !== id)); },
  getStats() { const users = this.getUsers(); const jobs = this.getJobs(); const ap = this.getArmaParmaRequests(); return { totalUsers: users.length, totalFarmers: users.filter(u => u.role === 'farmer').length, totalWorkers: users.filter(u => u.role === 'worker').length, totalJobs: jobs.length, activeJobs: jobs.filter(j => j.status === 'active').length, filledJobs: jobs.filter(j => j.status === 'filled').length, totalApplications: this.getApplications().length, verifiedUsers: users.filter(u => u.verified).length, armaParmaRequests: ap.length, activeArmaParma: ap.filter(r => r.status === 'open').length, completedExchanges: this.getExchangeHistory().filter(e => e.status === 'completed').length }; },
  hasUploadedPhoto(userId) {
    const user = this.getUserById(userId);
    if (!user) return false;
    return !!(user.profilePhotoUrl && !user.profilePhotoUrl.includes('dicebear'));
  },
  getProfilePhoto(userId) {
    const user = this.getUserById(userId);
    if (!user) return '';
    return user.profilePhotoUrl || user.avatar || '';
  },
  setProfilePhoto(userId, photoUrl) {
    const user = this.getUserById(userId);
    this.updateUser(userId, {
      profilePhotoUrl: photoUrl,
      profilePhotoVerified: true,
      requiresPhotoUpload: false,
      avatar: photoUrl || (user ? user.avatar : '')
    });
  },
  reset() { Object.keys(localStorage).filter(k => k.startsWith('agri_')).forEach(k => localStorage.removeItem(k)); this.init(); },

  // ══════════════════════════════════════════════════════════
  // AUTH SYSTEM DB METHODS
  // ══════════════════════════════════════════════════════════

  // ── Roles ────────────────────────────────────────────
  getRoles() { return this._get('roles') || AUTH_ROLES; },

  // ── User Roles ───────────────────────────────────────
  getUserRoles(userId) {
    const user = this.getUserById(userId);
    if (!user) return [];
    const explicit = (this._get('userRoles') || []).filter(ur => ur.userId === userId).map(ur => ur.role);
    const legacy = user.role ? [user.role] : [];
    return [...new Set([...legacy, ...explicit])];
  },
  addUserRole(userId, role) {
    const roles = this._get('userRoles') || [];
    if (!roles.find(r => r.userId === userId && r.role === role)) {
      roles.push({ userId, role, addedAt: new Date().toISOString() });
      this._set('userRoles', roles);
    }
    const user = this.getUserById(userId);
    if (user && !user.roles) {
      const existing = this.getUserRoles(userId);
      this.updateUser(userId, { roles: existing });
    }
  },
  removeUserRole(userId, role) {
    const roles = (this._get('userRoles') || []).filter(r => !(r.userId === userId && r.role === role));
    this._set('userRoles', roles);
  },
  hasRole(userId, role) { return this.getUserRoles(userId).includes(role); },

  // ── Phone Verification ───────────────────────────────
  createPhoneOtp(userId, phone) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const codes = (this._get('phoneVerification') || []).filter(c => c.phone !== phone);
    codes.push({ id: 'PV' + Date.now(), userId, phone, otp, attempts: 0, maxAttempts: 5, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), verified: false });
    this._set('phoneVerification', codes);
    return { id: codes[codes.length - 1].id, otp };
  },
  verifyPhoneOtp(phone, otp) {
    const codes = this._get('phoneVerification') || [];
    const code = codes.find(c => c.phone === phone && !c.verified && new Date(c.expiresAt) > new Date());
    if (!code) return { success: false, message: 'OTP has expired. Please request a new one.' };
    if (code.attempts >= code.maxAttempts) return { success: false, message: 'Too many failed attempts. Please try again later.' };
    code.attempts++;
    if (code.otp !== otp) { this._set('phoneVerification', codes); return { success: false, message: `Incorrect OTP. ${code.maxAttempts - code.attempts} attempts remaining.` }; }
    code.verified = true;
    this._set('phoneVerification', codes);
    if (code.userId) this.updateUser(code.userId, { phoneVerified: true });
    return { success: true, userId: code.userId };
  },
  isPhoneVerified(phone) {
    return (this._get('phoneVerification') || []).some(c => c.phone === phone && c.verified);
  },

  // ── Email Verification ───────────────────────────────
  createEmailOtp(userId, email) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const codes = (this._get('emailVerification') || []).filter(c => c.email !== email);
    codes.push({ id: 'EV' + Date.now(), userId, email, otp, attempts: 0, maxAttempts: 5, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), verified: false });
    this._set('emailVerification', codes);
    return { id: codes[codes.length - 1].id, otp };
  },
  verifyEmailOtp(email, otp) {
    const codes = this._get('emailVerification') || [];
    const code = codes.find(c => c.email === email && !c.verified && new Date(c.expiresAt) > new Date());
    if (!code) return { success: false, message: 'Verification code has expired.' };
    if (code.attempts >= code.maxAttempts) return { success: false, message: 'Too many failed attempts.' };
    code.attempts++;
    if (code.otp !== otp) { this._set('emailVerification', codes); return { success: false, message: 'Incorrect code.' }; }
    code.verified = true;
    this._set('emailVerification', codes);
    if (code.userId) this.updateUser(code.userId, { emailVerified: true });
    return { success: true, userId: code.userId };
  },

  // ── Email Verification Link Tokens ───────────────────
  createEmailVerificationLink(userId, email) {
    const token = 'EVT' + Date.now() + Math.random().toString(36).substr(2, 16);
    const tokens = this._get('emailVerificationTokens') || [];
    tokens.push({
      id: 'EVT' + Date.now(),
      userId,
      email,
      token,
      attempts: 0,
      maxAttempts: 5,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false
    });
    this._set('emailVerificationTokens', tokens);
    return { id: tokens[tokens.length - 1].id, token };
  },
  verifyEmailLinkToken(token) {
    const tokens = this._get('emailVerificationTokens') || [];
    const entry = tokens.find(t => t.token === token && !t.used && new Date(t.expiresAt) > new Date());
    if (!entry) return { success: false, message: 'Verification link is invalid or has expired.' };
    if (entry.attempts >= entry.maxAttempts) return { success: false, message: 'Too many failed attempts.' };
    entry.attempts++;
    entry.used = true;
    this._set('emailVerificationTokens', tokens);
    if (entry.userId) {
      this.updateUser(entry.userId, { emailVerified: true });
      DB.addAuditLog({ action: 'email_verified', userId: entry.userId, details: `Email verified via link: ${entry.email}` });
    }
    return { success: true, userId: entry.userId };
  },

  // ── Password Reset ───────────────────────────────────
  createPasswordReset(userId, phone) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const resets = (this._get('passwordReset') || []).filter(r => r.userId !== userId);
    resets.push({ id: 'PR' + Date.now(), userId, phone, otp, attempts: 0, maxAttempts: 3, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), used: false });
    this._set('passwordReset', resets);
    return { id: resets[resets.length - 1].id, otp };
  },
  verifyPasswordReset(userId, otp) {
    const resets = (this._get('passwordReset') || []).filter(r => r.userId === userId && !r.used && new Date(r.expiresAt) > new Date());
    const reset = resets[resets.length - 1];
    if (!reset) return { success: false, message: 'Reset code has expired.' };
    if (reset.attempts >= reset.maxAttempts) return { success: false, message: 'Too many failed attempts.' };
    reset.attempts++;
    if (reset.otp !== otp) { this._set('passwordReset', this._get('passwordReset')); return { success: false, message: 'Incorrect code.' }; }
    reset.used = true;
    this._set('passwordReset', this._get('passwordReset'));
    return { success: true };
  },

  // ── Sessions ─────────────────────────────────────────
  createSession(userId, deviceInfo) {
    const sessions = this._get('sessions') || [];
    const token = 'SES' + Date.now() + Math.random().toString(36).substr(2, 9);
    const session = { id: token, userId, deviceInfo: deviceInfo || 'Unknown Device', createdAt: new Date().toISOString(), lastActive: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), active: true };
    sessions.push(session);
    this._set('sessions', sessions);
    return session;
  },
  getSessions(userId) { return (this._get('sessions') || []).filter(s => s.userId === userId && s.active); },
  getAllSessions(userId) { return (this._get('sessions') || []).filter(s => s.userId === userId); },
  invalidateSession(sessionId) {
    const sessions = this._get('sessions') || [];
    const s = sessions.find(x => x.id === sessionId);
    if (s) { s.active = false; this._set('sessions', sessions); }
  },
  invalidateAllSessions(userId) {
    const sessions = (this._get('sessions') || []).map(s => { if (s.userId === userId) s.active = false; return s; });
    this._set('sessions', sessions);
  },
  updateSessionActivity(sessionId) {
    const sessions = this._get('sessions') || [];
    const s = sessions.find(x => x.id === sessionId);
    if (s) { s.lastActive = new Date().toISOString(); this._set('sessions', sessions); }
  },

  // ── Devices ──────────────────────────────────────────
  addDevice(userId, deviceInfo) {
    const devices = this._get('devices') || [];
    const existing = devices.find(d => d.userId === userId && d.fingerprint === deviceInfo.fingerprint);
    if (existing) { existing.lastSeen = new Date().toISOString(); existing.loginCount++; this._set('devices', devices); return existing; }
    const device = { id: 'DEV' + Date.now(), userId, ...deviceInfo, lastSeen: new Date().toISOString(), loginCount: 1, trusted: false };
    devices.push(device);
    this._set('devices', devices);
    return device;
  },
  getDevices(userId) { return (this._get('devices') || []).filter(d => d.userId === userId); },

  // ── Verification Documents ───────────────────────────
  addVerificationDocument(userId, doc) {
    const docs = this._get('verificationDocuments') || [];
    doc.id = 'VD' + Date.now();
    doc.userId = userId;
    doc.status = 'pending';
    doc.submittedAt = new Date().toISOString();
    docs.push(doc);
    this._set('verificationDocuments', docs);
    return doc;
  },
  getVerificationDocuments(userId) { return (this._get('verificationDocuments') || []).filter(d => d.userId === userId); },
  getAllPendingVerifications() { return (this._get('verificationDocuments') || []).filter(d => d.status === 'pending'); },
  updateVerificationDocument(docId, status, reviewedBy, notes) {
    const docs = this._get('verificationDocuments') || [];
    const doc = docs.find(d => d.id === docId);
    if (doc) {
      doc.status = status;
      doc.reviewedBy = reviewedBy;
      doc.reviewedAt = new Date().toISOString();
      doc.notes = notes || '';
      this._set('verificationDocuments', docs);
      if (status === 'approved') this.updateUser(doc.userId, { verified: true, verifiedAt: new Date().toISOString() });
      return doc;
    }
    return null;
  },

  // ── Login History ────────────────────────────────────
  addLoginHistory(userId, data) {
    const history = this._get('loginHistory') || [];
    history.unshift({ id: 'LH' + Date.now(), userId, ...data, timestamp: new Date().toISOString() });
    if (history.length > 100) history.length = 100;
    this._set('loginHistory', history);
  },
  getLoginHistory(userId) { return (this._get('loginHistory') || []).filter(h => h.userId === userId).slice(0, 20); },
  getFailedLoginAttempts(phone) {
    const history = this._get('loginHistory') || [];
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    return history.filter(h => (h.phone === phone || h.identifier === phone) && !h.success && h.timestamp > cutoff).length;
  },

  // ── Rate Limiting ────────────────────────────────────
  _rateLimits: {},
  checkRateLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    if (!this._rateLimits[key]) this._rateLimits[key] = [];
    this._rateLimits[key] = this._rateLimits[key].filter(t => now - t < windowMs);
    if (this._rateLimits[key].length >= maxAttempts) return false;
    this._rateLimits[key].push(now);
    return true;
  },

  // ── Account Lock ─────────────────────────────────────
  isAccountLocked(userId) {
    const user = this.getUserById(userId);
    if (!user) return false;
    return user.lockedUntil && new Date(user.lockedUntil) > new Date();
  },
  lockAccount(userId, minutes) {
    this.updateUser(userId, { lockedUntil: new Date(Date.now() + minutes * 60 * 1000).toISOString() });
  },
  unlockAccount(userId) { this.updateUser(userId, { lockedUntil: null }); },
  incrementFailedLogin(userId) {
    const user = this.getUserById(userId);
    if (!user) return;
    const count = (user.failedLoginAttempts || 0) + 1;
    this.updateUser(userId, { failedLoginAttempts: count });
    if (count >= 5) this.lockAccount(userId, 30);
    else if (count >= 3) this.lockAccount(userId, 5);
  },
  resetFailedLogin(userId) { this.updateUser(userId, { failedLoginAttempts: 0, lockedUntil: null }); },

  // ── Password Hashing (bcrypt-like) ───────────────────
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'krishiconnect_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  async verifyPassword(password, hash) {
    const newHash = await this.hashPassword(password);
    return newHash === hash;
  }
};

const SAMPLE_CATEGORIES = [
  { id: 'CAT1', name: 'Rice Farming', icon: '🌾', count: 45 },
  { id: 'CAT2', name: 'Wheat Cultivation', icon: '🌿', count: 32 },
  { id: 'CAT3', name: 'Vegetable Farming', icon: '🥬', count: 58 },
  { id: 'CAT4', name: 'Fruit Orchard', icon: '🍎', count: 27 },
  { id: 'CAT5', name: 'Tea Plantation', icon: '🍵', count: 18 },
  { id: 'CAT6', name: 'Coffee Growing', icon: '☕', count: 14 },
  { id: 'CAT7', name: 'Dairy Farming', icon: '🐄', count: 36 },
  { id: 'CAT8', name: 'Poultry Farming', icon: '🐔', count: 41 },
  { id: 'CAT9', name: 'Fish Farming', icon: '🐟', count: 22 },
  { id: 'CAT10', name: 'Mushroom Farming', icon: '🍄', count: 15 },
  { id: 'CAT11', name: 'Spice Farming', icon: '🌶️', count: 19 },
  { id: 'CAT12', name: 'Flower Farming', icon: '🌸', count: 11 }
];

const SAMPLE_LOCATIONS = {
  provinces: [
    { name: 'Koshi', districts: ['Jhapa', 'Morang', 'Sunsari', 'Taplejung', 'Panchthar', 'Ilam', 'Dhankuta', 'Terhathum', 'Sankhuwasabha', 'Bhojpur', 'Solukhumbu', 'Khotang', 'Udayapur'] },
    { name: 'Madhesh', districts: ['Saptari', 'Siraha', 'Dhanusha', 'Mahottari', 'Sarlahi', 'Bara', 'Parsa'] },
    { name: 'Bagmati', districts: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavrepalanchok', 'Nuwakot', 'Rasuwa', 'Dhading', 'Makwanpur', 'Chitwan', 'Sindhuli', 'Ramechhap', 'Dolakha'] },
    { name: 'Gandaki', districts: ['Gorkha', 'Nawalparasi East', 'Tanahu', 'Syangja', 'Kaski', 'Manang', 'Mustang', 'Myagdi', 'Parbat', 'Baglung', 'Gulmi', 'Palpa', 'Lamjung'] },
    { name: 'Lumbini', districts: ['Kapilvastu', 'Rupandehi', 'Nawalparasi West', 'Rolpa', 'Rukum East', 'Syangja', 'Arghakhanchi', 'Pyuthan', 'Dang', 'Banke', 'Bardiya'] },
    { name: 'Karnali', districts: ['Humla', 'Jumla', 'Dolpa', 'Mugu', 'Kalikot', 'Jajarkot', 'Dailekh', 'Surkhet', 'Rukum West'] },
    { name: 'Sudurpashchim', districts: ['Darchula', 'Baitadi', 'Dadeldhura', 'Doti', 'Achham', 'Kailali', 'Kanchanpur', 'Bajhang', 'Bajura', 'Seti'] }
  ]
};

const SAMPLE_USERS = [
  { id: 'USR1', name: 'Ram Prasad Sharma', email: 'ram@farm.com', phone: '9841234567', password: 'password123', role: 'farmer', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ram+Sharma', farmName: 'Sharma Organic Farm', farmSize: '12 hectares', crops: ['Rice', 'Wheat', 'Vegetables'], district: 'Chitwan', municipality: 'Bharatpur', ward: 10, description: 'Third-generation organic farmer specializing in rice and seasonal vegetables. Our farm has been certified organic since 2018.', verified: true, suspended: false, createdAt: '2024-01-15T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email' },
  { id: 'USR2', name: 'Sita Devi Thapa', email: 'sita@farm.com', phone: '9841234568', password: 'password123', role: 'farmer', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sita+Thapa', farmName: 'Green Valley Farm', farmSize: '8 hectares', crops: ['Tea', 'Coffee', 'Cardamom'], district: 'Ilam', municipality: 'Ilam Municipality', ward: 5, description: 'Premium tea and coffee farm in the hills of Eastern Nepal. Known for high-quality orthodox tea.', verified: true, suspended: false, createdAt: '2024-02-20T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email' },
  { id: 'USR3', name: 'Hari Bahadur Gurung', email: 'hari@farm.com', phone: '9841234569', password: 'password123', role: 'farmer', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Hari+Gurung', farmName: 'Gurung Dairy Farm', farmSize: '5 hectares', crops: ['Fodder', 'Maize'], district: 'Kaski', municipality: 'Pokhara', ward: 15, description: 'Modern dairy farm with 50+ cattle. We produce fresh milk and dairy products for Pokhara market.', verified: true, suspended: false, createdAt: '2024-03-10T08:00:00Z', emailVerified: false, phoneVerified: true, mobileVerified: true, verificationMethod: 'email' },
  { id: 'USR4', name: 'Bishnu Maya Limbu', email: 'bishnu@worker.com', phone: '9841234570', password: 'password123', role: 'worker', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Bishnu+Limbu', skills: ['Rice Planting', 'Tea Plucking', 'Weeding', 'Harvesting'], experience: 8, languages: ['Nepali', 'Limbu', 'English'], district: 'Ilam', availableDistricts: ['Ilam', 'Jhapa', 'Morang', 'Sunsari'], expectedWage: { daily: 800, monthly: 18000 }, bio: 'Experienced agricultural worker with 8 years in tea plantations and rice farming. Hard working and reliable.', verified: true, suspended: false, createdAt: '2024-01-20T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email', availability: 'available' },
  { id: 'USR5', name: 'Krishna Prasad Yadav', email: 'krishna@worker.com', phone: '9841234571', password: 'password123', role: 'worker', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Krishna+Yadav', skills: ['Tractor Driving', 'Irrigation', 'Fertilizing', 'Pest Control', 'Harvesting'], experience: 12, languages: ['Nepali', 'Hindi', 'Bhojpuri'], district: 'Bara', availableDistricts: ['Bara', 'Parsa', 'Rautahat', 'Sarlahi'], expectedWage: { daily: 1000, monthly: 22000 }, bio: 'Skilled farm machinery operator and agricultural worker. Licensed tractor driver with expertise in modern farming techniques.', verified: true, suspended: false, createdAt: '2024-02-05T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email', availability: 'available' },
  { id: 'USR6', name: 'Laxmi Poudel', email: 'laxmi@worker.com', phone: '9841234572', password: 'password123', role: 'worker', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Laxmi+Poudel', skills: ['Vegetable Farming', 'Greenhouse Management', 'Organic Farming', 'Composting'], experience: 5, languages: ['Nepali', 'English'], district: 'Kaski', availableDistricts: ['Kaski', 'Tanahu', 'Syangja', 'Gorkha'], expectedWage: { daily: 750, monthly: 17000 }, bio: 'Passionate about organic farming and sustainable agriculture. Experienced in greenhouse management and composting.', verified: false, suspended: false, createdAt: '2024-03-15T08:00:00Z', emailVerified: false, phoneVerified: false, mobileVerified: false, verificationMethod: 'email', availability: 'available' },
  { id: 'USR7', name: 'Gopal Basnet', email: 'gopal@farm.com', phone: '9841234573', password: 'password123', role: 'farmer', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Gopal+Basnet', farmName: 'Basnet Poultry Farm', farmSize: '3 hectares', crops: ['Poultry', 'Fish'], district: 'Chitwan', municipality: 'Bharatpur', ward: 22, description: 'Large-scale poultry and fish farm supplying to major markets in Chitwan and Kathmandu.', verified: true, suspended: false, createdAt: '2024-04-01T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email' },
  { id: 'USR8', name: 'Sunita Tamang', email: 'sunita@worker.com', phone: '9841234574', password: 'password123', role: 'worker', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sunita+Tamang', skills: ['Mushroom Farming', 'Milk Processing', 'Food Preservation', 'Packaging'], experience: 3, languages: ['Nepali', 'Tamang'], district: 'Dhading', availableDistricts: ['Dhading', 'Nuwakot', 'Kathmandu', 'Lalitpur'], expectedWage: { daily: 700, monthly: 16000 }, bio: 'Young and enthusiastic worker skilled in modern agricultural techniques including mushroom cultivation.', verified: false, suspended: false, createdAt: '2024-05-10T08:00:00Z', emailVerified: false, phoneVerified: false, mobileVerified: false, verificationMethod: 'email', availability: 'busy' },
  { id: 'USR9', name: 'Admin User', email: 'admin@agrinepal.com', phone: '9841000000', password: 'admin123', role: 'admin', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin', verified: true, suspended: false, createdAt: '2024-01-01T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email' },
  { id: 'USR10', name: 'Raj Kumar Magar', email: 'raj@worker.com', phone: '9841234575', password: 'password123', role: 'worker', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Raj+Magar', skills: ['Sugarcane Farming', 'Tobacco Farming', 'Land Preparation', 'Canal Irrigation'], experience: 15, languages: ['Nepali', 'Magar', 'Hindi'], district: 'Rupandehi', availableDistricts: ['Rupandehi', 'Kapilvastu', 'Dang', 'Banke'], expectedWage: { daily: 900, monthly: 20000 }, bio: 'Highly experienced farmer with 15 years in sugarcane and tobacco cultivation. Expert in irrigation systems.', verified: true, suspended: false, createdAt: '2024-02-15T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email', availability: 'available' }
];

const SAMPLE_JOBS = [
  { id: 'JOB1', farmerId: 'USR1', workMode: 'paid', title: 'Rice Planting Workers Needed', description: 'Looking for experienced rice paddy workers for the upcoming planting season. Must be comfortable working in muddy fields for extended hours. Lunch and water will be provided.', cropType: 'Rice', farmType: 'Organic', requiredSkills: ['Rice Planting', 'Weeding'], workersNeeded: 15, wage: { daily: 800, weekly: 5000, monthly: 18000 }, foodProvided: true, accommodationProvided: false, workingHours: '6 AM - 4 PM', workingDays: 'Mon-Sat', startDate: '2026-06-01', endDate: '2026-08-30', district: 'Chitwan', municipality: 'Bharatpur', ward: 10, location: { lat: 27.6867, lng: 84.4264 }, status: 'active', urgent: true, applications: 12, createdAt: '2026-05-15T08:00:00Z', photos: [] },
  { id: 'JOB2', farmerId: 'USR2', workMode: 'paid', title: 'Tea Plucking Workers - Season', description: 'Seasonal tea plucking position available at our premium tea estate in Ilam. Experience preferred but willing to train dedicated workers. Beautiful hill station environment.', cropType: 'Tea', farmType: 'Commercial', requiredSkills: ['Tea Plucking'], workersNeeded: 20, wage: { daily: 750, weekly: 4500, monthly: 17000 }, foodProvided: true, accommodationProvided: true, workingHours: '7 AM - 3 PM', workingDays: 'Mon-Fri', startDate: '2026-04-15', endDate: '2026-09-30', district: 'Ilam', municipality: 'Ilam Municipality', ward: 5, location: { lat: 26.9132, lng: 87.9264 }, status: 'active', urgent: false, applications: 8, createdAt: '2026-04-01T08:00:00Z', photos: [] },
  { id: 'JOB3', farmerId: 'USR3', workMode: 'paid', title: 'Dairy Farm Helper - Full Time', description: 'Seeking a dedicated helper for our dairy farm. Daily tasks include milking, feeding cattle, cleaning barns, and managing fodder. Must be comfortable around animals.', cropType: 'Dairy', farmType: 'Commercial', requiredSkills: ['Dairy Farming', 'Fodder Management'], workersNeeded: 2, wage: { daily: 900, monthly: 22000 }, foodProvided: true, accommodationProvided: true, workingHours: '5 AM - 11 AM, 4 PM - 7 PM', workingDays: 'Everyday', startDate: '2026-05-01', endDate: '2026-12-31', district: 'Kaski', municipality: 'Pokhara', ward: 15, location: { lat: 28.2096, lng: 83.9856 }, status: 'active', urgent: false, applications: 5, createdAt: '2026-04-20T08:00:00Z', photos: [] },
  { id: 'JOB4', farmerId: 'USR7', workMode: 'paid', title: 'Poultry Farm Workers Urgent', description: 'Immediate requirement for poultry farm workers. Must be willing to work in clean environment with proper hygiene. Training will be provided for beginners.', cropType: 'Poultry', farmType: 'Commercial', requiredSkills: ['Poultry Farming'], workersNeeded: 8, wage: { daily: 850, weekly: 5200, monthly: 19000 }, foodProvided: true, accommodationProvided: false, workingHours: '5 AM - 12 PM, 5 PM - 8 PM', workingDays: 'Mon-Sat', startDate: '2026-05-20', endDate: '2026-11-30', district: 'Chitwan', municipality: 'Bharatpur', ward: 22, location: { lat: 27.6800, lng: 84.4300 }, status: 'active', urgent: true, applications: 15, createdAt: '2026-05-10T08:00:00Z', photos: [] },
  { id: 'JOB5', farmerId: 'USR1', workMode: 'paid', title: 'Vegetable Farm Workers', description: 'Organic vegetable farm needs workers for planting, weeding, and harvesting various vegetables including tomatoes, potatoes, and leafy greens.', cropType: 'Vegetables', farmType: 'Organic', requiredSkills: ['Vegetable Farming', 'Organic Farming', 'Composting'], workersNeeded: 6, wage: { daily: 750, monthly: 17000 }, foodProvided: true, accommodationProvided: false, workingHours: '7 AM - 4 PM', workingDays: 'Mon-Sat', startDate: '2026-06-15', endDate: '2026-10-30', district: 'Chitwan', municipality: 'Bharatpur', ward: 10, location: { lat: 27.6867, lng: 84.4264 }, status: 'active', urgent: false, applications: 9, createdAt: '2026-05-25T08:00:00Z', photos: [] },
  { id: 'JOB6', farmerId: 'USR2', workMode: 'paid', title: 'Coffee Bean Processing Worker', description: 'Looking for workers to help with coffee bean harvesting and initial processing. Must have stamina for physical work in hilly terrain.', cropType: 'Coffee', farmType: 'Specialty', requiredSkills: ['Coffee Farming', 'Processing'], workersNeeded: 4, wage: { daily: 800, monthly: 18000 }, foodProvided: true, accommodationProvided: true, workingHours: '8 AM - 5 PM', workingDays: 'Mon-Fri', startDate: '2026-10-01', endDate: '2027-01-31', district: 'Illam', municipality: 'Illam Municipality', ward: 3, location: { lat: 26.9200, lng: 87.9300 }, status: 'active', urgent: false, applications: 3, createdAt: '2026-05-28T08:00:00Z', photos: [] },
  { id: 'JOB7', farmerId: 'USR7', workMode: 'paid', title: 'Fish Pond Maintenance Workers', description: 'Need workers for fish pond maintenance, feeding, water quality management, and fish harvesting in our aquaculture facility.', cropType: 'Fishery', farmType: 'Commercial', requiredSkills: ['Fish Farming', 'Water Management'], workersNeeded: 3, wage: { daily: 800, monthly: 18500 }, foodProvided: false, accommodationProvided: false, workingHours: '6 AM - 2 PM', workingDays: 'Mon-Sat', startDate: '2026-06-01', endDate: '2026-12-31', district: 'Chitwan', municipality: 'Bharatpur', ward: 22, location: { lat: 27.6810, lng: 84.4280 }, status: 'filled', urgent: false, applications: 7, createdAt: '2026-04-15T08:00:00Z', photos: [] },
  { id: 'JOB8', farmerId: 'USR3', workMode: 'paid', title: 'Mushroom Farm Worker', description: 'Small mushroom farm seeking careful and detail-oriented worker for spawn inoculation, substrate preparation, and harvesting.', cropType: 'Mushroom', farmType: 'Small Scale', requiredSkills: ['Mushroom Farming'], workersNeeded: 2, wage: { daily: 700, monthly: 16000 }, foodProvided: false, accommodationProvided: false, workingHours: '8 AM - 5 PM', workingDays: 'Mon-Fri', startDate: '2026-05-15', endDate: '2026-09-30', district: 'Kaski', municipality: 'Pokhara', ward: 15, location: { lat: 28.2100, lng: 83.9860 }, status: 'closed', urgent: false, applications: 4, createdAt: '2026-04-28T08:00:00Z', photos: [] }
];

const SAMPLE_APPLICATIONS = [
  { id: 'APP1', jobId: 'JOB1', workerId: 'USR4', farmerId: 'USR1', message: 'I have 8 years of experience in rice farming. I am available for the full season and can bring 2 more workers.', status: 'pending', createdAt: '2026-05-16T10:00:00Z' },
  { id: 'APP2', jobId: 'JOB1', workerId: 'USR5', farmerId: 'USR1', message: 'Experienced in large-scale farming operations. I can also help with tractor operations if needed.', status: 'accepted', createdAt: '2026-05-17T08:30:00Z' },
  { id: 'APP3', jobId: 'JOB2', workerId: 'USR4', farmerId: 'USR2', message: 'I am from Ilam and very familiar with tea plucking. I would love to work at your estate.', status: 'pending', createdAt: '2026-04-05T09:00:00Z' },
  { id: 'APP4', jobId: 'JOB3', workerId: 'USR6', farmerId: 'USR3', message: 'I have experience with dairy management and I am looking for a full-time position in Pokhara area.', status: 'rejected', createdAt: '2026-04-25T14:00:00Z' },
  { id: 'APP5', jobId: 'JOB4', workerId: 'USR5', farmerId: 'USR7', message: 'I have worked in poultry farms before and understand biosecurity requirements. Available immediately.', status: 'accepted', createdAt: '2026-05-11T07:00:00Z' },
  { id: 'APP6', jobId: 'JOB5', workerId: 'USR8', farmerId: 'USR1', message: 'Passionate about organic farming. I have experience with composting and vegetable cultivation.', status: 'pending', createdAt: '2026-05-26T11:00:00Z' }
];

const SAMPLE_CHATS = [
  { id: 'CHT1', participants: ['USR1', 'USR5'], createdAt: '2026-05-17T08:30:00Z', lastMessage: 'See you on Monday at the farm entrance!', lastMessageAt: '2026-05-20T14:30:00Z' },
  { id: 'CHT2', participants: ['USR2', 'USR4'], createdAt: '2026-04-05T09:00:00Z', lastMessage: 'The tea season starts next week. Are you ready?', lastMessageAt: '2026-05-19T10:15:00Z' },
  { id: 'CHT3', participants: ['USR1', 'USR4'], createdAt: '2026-05-16T10:00:00Z', lastMessage: 'Thank you for your application! We will review it soon.', lastMessageAt: '2026-05-18T16:00:00Z' }
];

const SAMPLE_MESSAGES = [
  { id: 'MSG1', chatId: 'CHT1', senderId: 'USR1', text: 'Hello Krishna! Your application has been accepted.', createdAt: '2026-05-17T09:00:00Z', read: true },
  { id: 'MSG2', chatId: 'CHT1', senderId: 'USR5', text: 'Thank you sir! When should I come?', createdAt: '2026-05-17T09:15:00Z', read: true },
  { id: 'MSG3', chatId: 'CHT1', senderId: 'USR1', text: 'Please come on Monday morning at 6 AM. Bring your own lunch.', createdAt: '2026-05-17T09:30:00Z', read: true },
  { id: 'MSG4', chatId: 'CHT1', senderId: 'USR5', text: 'Got it! I will be there on time.', createdAt: '2026-05-17T09:45:00Z', read: true },
  { id: 'MSG5', chatId: 'CHT1', senderId: 'USR1', text: 'Great! See you on Monday at the farm entrance!', createdAt: '2026-05-20T14:30:00Z', read: false },
  { id: 'MSG6', chatId: 'CHT2', senderId: 'USR2', text: 'Hi Bishnu! We saw your application for tea plucking.', createdAt: '2026-04-05T10:00:00Z', read: true },
  { id: 'MSG7', chatId: 'CHT2', senderId: 'USR4', text: 'Yes maam! I am very interested. When can I start?', createdAt: '2026-04-05T10:20:00Z', read: true },
  { id: 'MSG8', chatId: 'CHT2', senderId: 'USR2', text: 'The tea season starts next week. Are you ready?', createdAt: '2026-05-19T10:15:00Z', read: true }
];

const SAMPLE_NOTIFICATIONS = [
  { id: 'NTF1', userId: 'USR1', type: 'application', text: 'Krishna Prasad Yadav applied for Rice Planting Workers Needed', read: false, createdAt: '2026-05-17T08:30:00Z', link: 'job-detail.html?id=JOB1' },
  { id: 'NTF2', userId: 'USR1', type: 'application', text: 'Bishnu Maya Limbu applied for Rice Planting Workers Needed', read: false, createdAt: '2026-05-16T10:00:00Z', link: 'job-detail.html?id=JOB1' },
  { id: 'NTF3', userId: 'USR5', type: 'accepted', text: 'Your application for Rice Planting Workers Needed has been accepted!', read: true, createdAt: '2026-05-17T09:00:00Z', link: 'job-detail.html?id=JOB1' },
  { id: 'NTF4', userId: 'USR4', type: 'message', text: 'New message from Sita Devi Thapa', read: false, createdAt: '2026-05-19T10:15:00Z', link: 'chat.html' },
  { id: 'NTF5', userId: 'USR1', type: 'message', text: 'New message from Krishna Prasad Yadav', read: false, createdAt: '2026-05-17T09:45:00Z', link: 'chat.html' },
  { id: 'NTF6', userId: 'USR6', type: 'rejected', text: 'Your application for Dairy Farm Helper was not selected', read: true, createdAt: '2026-04-28T08:00:00Z', link: 'job-detail.html?id=JOB3' }
];

const SAMPLE_REVIEWS = [
  { id: 'REV1', reviewerId: 'USR1', reviewedId: 'USR5', jobId: 'JOB7', rating: 5, text: 'Excellent worker! Krishna showed great skill in fish pond management. Very reliable and punctual.', createdAt: '2026-05-05T08:00:00Z' },
  { id: 'REV2', reviewerId: 'USR5', reviewedId: 'USR1', jobId: 'JOB7', rating: 4, text: 'Good farmer to work with. Fair wages and respectful treatment. Farm could use better tools.', createdAt: '2026-05-06T08:00:00Z' },
  { id: 'REV3', reviewerId: 'USR7', reviewedId: 'USR5', jobId: 'JOB4', rating: 5, text: 'Krishna is our best worker. Professional, hardworking, and follows all biosecurity protocols perfectly.', createdAt: '2026-05-18T08:00:00Z' },
  { id: 'REV4', reviewerId: 'USR2', reviewedId: 'USR4', jobId: 'JOB2', rating: 5, text: 'Bishnu is an exceptional tea plucker. She knows exactly how to pick the best leaves. Highly recommended!', createdAt: '2026-05-15T08:00:00Z' }
];

const SAMPLE_AUDIT_LOGS = [
  { id: 'LOG1', action: 'user_register', userId: 'USR1', details: 'New farmer registered: Ram Prasad Sharma', createdAt: '2024-01-15T08:00:00Z' },
  { id: 'LOG2', action: 'user_register', userId: 'USR4', details: 'New worker registered: Bishnu Maya Limbu', createdAt: '2024-01-20T08:00:00Z' },
  { id: 'LOG3', action: 'job_posted', userId: 'USR1', details: 'Job posted: Rice Planting Workers Needed', createdAt: '2026-05-15T08:00:00Z' },
  { id: 'LOG4', action: 'user_verified', userId: 'USR5', details: 'Account verified: Krishna Prasad Yadav', createdAt: '2026-02-10T08:00:00Z' },
  { id: 'LOG5', action: 'application_submitted', userId: 'USR5', details: 'Application submitted for JOB1', createdAt: '2026-05-17T08:30:00Z' }
];

const SAMPLE_FAQS = [
  { id: 'FAQ1', question: 'How do I register as a farmer?', answer: 'Click on Register, select Farmer role, fill in your details including farm information, and verify your account. Once verified, you can start posting jobs immediately.' },
  { id: 'FAQ2', question: 'How do I find agricultural workers?', answer: 'Use our advanced search to filter workers by skill, location, experience, and availability. You can also post a job and let workers apply to you.' },
  { id: 'FAQ3', question: 'Is AgriConnect Nepal free to use?', answer: 'Yes! Basic registration and job posting are completely free. Workers can also create profiles and apply for jobs at no cost.' },
  { id: 'FAQ4', question: 'How does the rating system work?', answer: 'After a job is completed, both the farmer and worker can rate each other on a 1-5 scale. This builds trust and reputation on the platform.' },
  { id: 'FAQ5', question: 'How do payments work?', answer: 'AgriConnect Nepal does not handle payments directly. Payment arrangements are made between the farmer and worker as per the agreed terms.' },
  { id: 'FAQ6', question: 'Can I verify my account?', answer: 'Yes! Account verification builds trust. Farmers can verify their farm ownership, and workers can verify their identity documents through our verification process.' },
  { id: 'FAQ7', question: 'What is Arma Parma?', answer: 'Arma Parma is a traditional Nepali labor exchange system where farmers help each other on their farms instead of paying money. The help received is tracked as Labor Credits, and you return the same amount of labor when the other farmer needs it.' },
  { id: 'FAQ8', question: 'How do Labor Credits work?', answer: 'When you help another farmer through Arma Parma, you earn Labor Credits equal to the days you worked. When you need help, farmers with credits can assist you, and the balance adjusts accordingly.' },
  { id: 'FAQ9', question: 'Can I be both a farmer and a worker?', answer: 'Yes! Every user can act as both a farmer (posting jobs or Arma Parma requests) and a worker (joining paid jobs or helping through Arma Parma). No separate accounts needed.' },
  { id: 'FAQ10', question: 'How does smart matching work?', answer: 'Our system recommends Arma Parma partners based on your location, crop types, farming seasons, previous successful exchanges, and trust ratings.' }
];

// ══════════════════════════════════════════════════════════
// ARMA PARMA SEED DATA
// ══════════════════════════════════════════════════════════

const SAMPLE_ARMA_PARMA = [
  {
    id: 'AP1', farmerId: 'USR1', title: 'Rice Transplanting Help Needed',
    description: 'Need help with rice transplanting in our paddy fields. We are a group of organic farmers who believe in the traditional Arma Parma system. Will return the favor during wheat sowing season.',
    cropType: 'Rice', workType: 'Transplanting', district: 'Chitwan', municipality: 'Bharatpur', ward: 10,
    location: { lat: 27.6867, lng: 84.4264 },
    helpersNeeded: 8, date: '2026-07-15', startTime: '06:00', expectedDuration: '3 days',
    foodProvided: true, teaSnacksProvided: true, equipmentProvided: true,
    returnCommitment: 'I will help for 3 days during wheat sowing in November.',
    additionalNotes: 'Bring your own water bottle. We work early morning to avoid heat.',
    photos: [], status: 'open', applicants: [], agreementAccepted: false, createdAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'AP2', farmerId: 'USR2', title: 'Tea Leaf Plucking Exchange',
    description: 'Looking for fellow tea farmers for Arma Parma during our peak plucking season. Our estate in Ilam produces premium orthodox tea. Happy to help with coffee harvesting in return.',
    cropType: 'Tea', workType: 'Plucking', district: 'Ilam', municipality: 'Ilam Municipality', ward: 5,
    location: { lat: 26.9132, lng: 87.9264 },
    helpersNeeded: 10, date: '2026-08-01', startTime: '07:00', expectedDuration: '5 days',
    foodProvided: true, teaSnacksProvided: true, equipmentProvided: false,
    returnCommitment: 'Will help for 5 days during coffee harvest in October-November.',
    additionalNotes: 'Experience with tea plucking preferred. Beautiful hill station views!',
    photos: [], status: 'open', applicants: [], agreementAccepted: false, createdAt: '2026-05-20T08:00:00Z'
  },
  {
    id: 'AP3', farmerId: 'USR7', title: 'Fish Pond Cleaning Exchange',
    description: 'Need helping hands for cleaning and maintaining our fish ponds before the monsoon season. Experienced in aquaculture. Happy to help with poultry management in return.',
    cropType: 'Fishery', workType: 'Maintenance', district: 'Chitwan', municipality: 'Bharatpur', ward: 22,
    location: { lat: 27.6800, lng: 84.4300 },
    helpersNeeded: 4, date: '2026-06-20', startTime: '06:00', expectedDuration: '2 days',
    foodProvided: true, teaSnacksProvided: true, equipmentProvided: true,
    returnCommitment: 'Will assist with poultry farm duties for 2 days anytime.',
    additionalNotes: 'Must be comfortable working near water. Lunch provided.',
    photos: [], status: 'open', applicants: [], agreementAccepted: false, createdAt: '2026-06-05T08:00:00Z'
  },
  {
    id: 'AP4', farmerId: 'USR3', title: 'Fodder Harvesting Help',
    description: 'Looking for farmers to help with maize and fodder harvesting for our dairy cattle. Need strong workers comfortable with field work. Happy to share dairy knowledge and help with other farms.',
    cropType: 'Dairy', workType: 'Harvesting', district: 'Kaski', municipality: 'Pokhara', ward: 15,
    location: { lat: 28.2096, lng: 83.9856 },
    helpersNeeded: 5, date: '2026-07-10', startTime: '06:30', expectedDuration: '2 days',
    foodProvided: true, teaSnacksProvided: true, equipmentProvided: true,
    returnCommitment: 'Will help with vegetable harvesting for 2 days.',
    additionalNotes: 'Near Pokhara. Fresh dairy products available for helpers!',
    photos: [], status: 'completed', applicants: [], agreementAccepted: true, createdAt: '2026-05-01T08:00:00Z'
  },
  {
    id: 'AP5', farmerId: 'USR1', title: 'Vegetable Garden Weeding Exchange',
    description: 'Our organic vegetable garden needs weeding before the next planting cycle. Looking for neighbors interested in Arma Parma. Weeds will be composted for organic farming.',
    cropType: 'Vegetables', workType: 'Weeding', district: 'Chitwan', municipality: 'Bharatpur', ward: 10,
    location: { lat: 27.6867, lng: 84.4264 },
    helpersNeeded: 6, date: '2026-06-25', startTime: '07:00', expectedDuration: '1 day',
    foodProvided: true, teaSnacksProvided: true, equipmentProvided: true,
    returnCommitment: 'Will help with rice transplanting for 1 day.',
    additionalNotes: 'Organic garden. Tools provided. Great for learning organic methods.',
    photos: [], status: 'open', applicants: ['USR4'], agreementAccepted: false, createdAt: '2026-06-10T08:00:00Z'
  }
];

const SAMPLE_LABOR_CREDITS = [
  { id: 'LC1', earnerId: 'USR3', debtorId: 'USR1', days: 2, exchangeId: 'EX1', status: 'completed', createdAt: '2026-05-15T08:00:00Z' },
  { id: 'LC2', earnerId: 'USR1', debtorId: 'USR3', days: 2, exchangeId: 'EX1', status: 'completed', createdAt: '2026-05-20T08:00:00Z' },
  { id: 'LC3', earnerId: 'USR4', debtorId: 'USR2', days: 3, exchangeId: 'EX2', status: 'completed', createdAt: '2026-04-10T08:00:00Z' },
  { id: 'LC4', earnerId: 'USR2', debtorId: 'USR4', days: 2, exchangeId: 'EX2', status: 'pending', createdAt: '2026-04-15T08:00:00Z' },
  { id: 'LC5', earnerId: 'USR5', debtorId: 'USR7', days: 1, exchangeId: null, status: 'completed', createdAt: '2026-05-01T08:00:00Z' }
];

const SAMPLE_EXCHANGES = [
  {
    id: 'EX1', armaParmaId: 'AP4', farmer1Id: 'USR1', farmer2Id: 'USR3',
    cropType: 'Dairy', workType: 'Harvesting', days: 2,
    farmer1Worked: true, farmer2Worked: true,
    farmer1CompletedDate: '2026-05-15', farmer2CompletedDate: '2026-05-20',
    status: 'completed', agreementAcceptedAt: '2026-05-02T08:00:00Z',
    createdAt: '2026-05-01T08:00:00Z'
  },
  {
    id: 'EX2', armaParmaId: 'AP2', farmer1Id: 'USR2', farmer2Id: 'USR4',
    cropType: 'Tea', workType: 'Plucking', days: 3,
    farmer1Worked: false, farmer2Worked: true,
    farmer1CompletedDate: null, farmer2CompletedDate: '2026-04-10',
    status: 'partial', agreementAcceptedAt: '2026-04-01T08:00:00Z',
    createdAt: '2026-03-28T08:00:00Z'
  }
];

const SAMPLE_COMMUNITY_POSTS = [
  {
    id: 'CP1', userId: 'USR1', type: 'tip',
    title: 'Best Time for Rice Transplanting in Chitwan',
    content: 'In our experience, the best time for rice transplanting in the Chitwan region is mid-July to early August. The monsoon rains should be well-established by then. We have been doing organic rice farming for 3 generations and this timing consistently gives the best yield.',
    tags: ['Rice', 'Planting', 'Chitwan'],
    likes: ['USR2', 'USR3', 'USR5'], comments: [
      { id: 'CC1', userId: 'USR2', text: 'Very helpful! We follow similar timing in Ilam too.', createdAt: '2026-06-02T10:00:00Z' },
      { id: 'CC2', userId: 'USR5', text: 'What variety of rice do you plant?', createdAt: '2026-06-02T12:00:00Z' }
    ],
    createdAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'CP2', userId: 'USR2', type: 'question',
    title: 'Organic Pest Control for Tea Plants?',
    content: 'We are looking for organic alternatives to chemical pesticides for our tea estate. Has anyone successfully used neem-based solutions or companion planting? Our tea quality must remain premium grade.',
    tags: ['Tea', 'Organic', 'Pest Control'],
    likes: ['USR1'], comments: [
      { id: 'CC3', userId: 'USR1', text: 'Neem oil works great for our vegetables. Dilute 5ml per liter of water.', createdAt: '2026-06-03T09:00:00Z' }
    ],
    createdAt: '2026-06-02T08:00:00Z'
  },
  {
    id: 'CP3', userId: 'USR5', type: 'event',
    title: 'Community Farming Day - Chitwan',
    content: 'We are organizing a community farming day on June 20th at Bharatpur. Farmers and workers can come together, share knowledge, and practice Arma Parma. Free lunch provided! Please bring your own tools.',
    tags: ['Event', 'Chitwan', 'Arma Parma'],
    likes: ['USR1', 'USR7', 'USR3', 'USR4'], comments: [],
    createdAt: '2026-06-05T08:00:00Z'
  },
  {
    id: 'CP4', userId: 'USR7', type: 'celebration',
    title: 'Record Fish Harvest This Season!',
    content: 'Excited to share that our fish farm in Chitwan had a record harvest this season - over 2 tonnes of Rohu and Catla! Thank you to all the Arma Parma partners who helped with pond maintenance.',
    tags: ['Fishery', 'Success', 'Chitwan'],
    likes: ['USR1', 'USR2', 'USR3', 'USR4', 'USR5'], comments: [
      { id: 'CC4', userId: 'USR1', text: 'Congratulations! That is amazing.', createdAt: '2026-06-06T10:00:00Z' }
    ],
    createdAt: '2026-06-06T08:00:00Z'
  }
];

const SAMPLE_CALENDAR_EVENTS = [
  { id: 'CAL1', userId: 'USR1', type: 'arma-parma', title: 'Rice Transplanting Help', date: '2026-07-15', endDate: '2026-07-17', color: '#16a34a', armaParmaId: 'AP1' },
  { id: 'CAL2', userId: 'USR1', type: 'arma-parma', title: 'Vegetable Weeding Exchange', date: '2026-06-25', endDate: '2026-06-25', color: '#16a34a', armaParmaId: 'AP5' },
  { id: 'CAL3', userId: 'USR2', type: 'paid-job', title: 'Tea Plucking Season', date: '2026-08-01', endDate: '2026-08-05', color: '#2563eb', jobId: 'JOB2' },
  { id: 'CAL4', userId: 'USR1', type: 'planting', title: 'Wheat Sowing Season', date: '2026-11-01', endDate: '2026-11-15', color: '#f59e0b' },
  { id: 'CAL5', userId: 'USR1', type: 'harvest', title: 'Rice Harvest Season', date: '2026-10-15', endDate: '2026-11-30', color: '#ef4444' },
  { id: 'CAL6', userId: 'USR3', type: 'paid-job', title: 'Dairy Farm Helper', date: '2026-05-01', endDate: '2026-12-31', color: '#2563eb', jobId: 'JOB3' },
  { id: 'CAL7', userId: 'USR5', type: 'paid-job', title: 'Poultry Farm Workers', date: '2026-05-20', endDate: '2026-11-30', color: '#2563eb', jobId: 'JOB4' }
];

// ══════════════════════════════════════════════════════════
// AUTH ROLES
// ══════════════════════════════════════════════════════════
const AUTH_ROLES = [
  { id: 'farmer', name: 'Farmer', nameNe: 'किसान', icon: '🌾', description: 'Post jobs, manage farms, Arma Parma' },
  { id: 'worker', name: 'Worker', nameNe: 'श्रमिक', icon: '👷', description: 'Find jobs, earn credits, build reputation' },
  { id: 'buyer', name: 'Buyer', nameNe: 'किन्ने व्यक्ति', icon: '🛒', description: 'Buy agricultural products' },
  { id: 'equipment_owner', name: 'Equipment Owner', nameNe: 'उपकरण स्वामी', icon: '🚜', description: 'Rent/sell farm equipment' },
  { id: 'expert', name: 'Agriculture Expert', nameNe: 'कृषि विशेषज्ञ', icon: '🎓', description: 'Provide consulting & advice' },
  { id: 'cooperative', name: 'Cooperative Member', nameNe: 'सहकारी सदस्य', icon: '🏛️', description: 'Represent a cooperative' }
];
