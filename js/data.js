const DB = {
  _get(key) { try { return JSON.parse(localStorage.getItem('agri_' + key)); } catch { return null; } },
  _set(key, val) { localStorage.setItem('agri_' + key, JSON.stringify(val)); },
  _remove(key) { localStorage.removeItem('agri_' + key); },
  init() {
    if (!this._get('initialized')) {
      this._set('users', SAMPLE_USERS);
      this._set('jobs', []);
      this._set('applications', []);
      this._set('chats', []);
      this._set('messages', []);
      this._set('notifications', []);
      this._set('reviews', []);
      this._set('savedJobs', []);
      this._set('savedWorkers', []);
      this._set('auditLogs', []);
      this._set('announcements', []);
      this._set('faqs', SAMPLE_FAQS);
      this._set('categories', SAMPLE_CATEGORIES);
      this._set('locations', SAMPLE_LOCATIONS);
      this._set('armaParmaRequests', []);
      this._set('laborCredits', []);
      this._set('exchangeHistory', []);
      this._set('communityPosts', []);
      this._set('calendarEvents', []);
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
      this._set('farmProfiles', []);
      this._set('listings', []);
      this._set('preHarvestBookings', []);
      this._set('equipmentRentals', []);
      this._set('equipmentRequests', []);
      this._set('transportServices', []);
      this._set('transportRequests', []);
      this._set('workRequests', []);
      this._set('groups', []);
      this._set('friends', []);
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

  // ── Friends / Connections (Facebook-style) ────────────
  getFriends() { return this._get('friends') || []; },
  setFriends(f) { this._set('friends', f); },
  getFriendStatus(userId, otherId) {
    if (userId === otherId) return 'self';
    const rel = this.getFriends().find(r => (r.userId === userId && r.friendId === otherId) || (r.userId === otherId && r.friendId === userId));
    if (!rel) return 'none';
    if (rel.status === 'accepted') return 'friends';
    return rel.userId === userId ? 'pending_sent' : 'pending_received';
  },
  getConnectionIds(userId) {
    return this.getFriends().filter(r => r.status === 'accepted' && (r.userId === userId || r.friendId === userId))
      .map(r => r.userId === userId ? r.friendId : r.userId);
  },
  getConnections(userId) { return this.getConnectionIds(userId).map(id => this.getUserById(id)).filter(Boolean); },
  getFriendRequests(userId) { return this.getFriends().filter(r => r.status === 'pending' && r.friendId === userId); },
  getPendingRequests(userId) { return this.getFriends().filter(r => r.status === 'pending' && r.userId === userId); },
  sendFriendRequest(userId, friendId) {
    const f = this.getFriends();
    const existing = f.find(r => (r.userId === userId && r.friendId === friendId) || (r.userId === friendId && r.friendId === userId));
    if (existing) return existing;
    const rel = { id: 'FR' + Date.now(), userId, friendId, status: 'pending', createdAt: new Date().toISOString() };
    f.push(rel);
    this.setFriends(f);
    return rel;
  },
  acceptFriendRequest(userId, friendId) {
    const f = this.getFriends();
    const rel = f.find(r => r.userId === friendId && r.friendId === userId && r.status === 'pending');
    if (!rel) return null;
    rel.status = 'accepted';
    rel.acceptedAt = new Date().toISOString();
    this.setFriends(f);
    return rel;
  },
  rejectFriendRequest(userId, friendId) {
    this.setFriends(this.getFriends().filter(r => !(r.userId === friendId && r.friendId === userId && r.status === 'pending')));
  },
  removeFriend(userId, friendId) {
    this.setFriends(this.getFriends().filter(r => !((r.userId === userId && r.friendId === friendId) || (r.userId === friendId && r.friendId === userId))));
  },
  getFriendsOf(userId) { return this.getConnections(userId); },
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
  updateCalendarEvent(id, data) {
    const e = this.getCalendarEvents();
    const i = e.findIndex(x => x.id === id);
    if (i >= 0) { e[i] = { ...e[i], ...data }; this.setCalendarEvents(e); return e[i]; }
    return null;
  },
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
  },

  // ══════════════════════════════════════════════════════════
  // ECOSYSTEM FEATURES
  // ══════════════════════════════════════════════════════════

  // ── Active Role Management ────────────────────────────
  setActiveRole(userId, role) {
    this.updateUser(userId, { activeRole: role });
    const u = JSON.parse(localStorage.getItem('agri_currentUser'));
    if (u && u.id === userId) { u.activeRole = role; localStorage.setItem('agri_currentUser', JSON.stringify(u)); }
  },
  getActiveRole(userId) {
    const user = this.getUserById(userId);
    return user?.activeRole || user?.role || 'farmer';
  },

  // ── Availability Status ───────────────────────────────
  getUserAvailability(userId, date) {
    const events = this.getCalendarEventsByUser(userId);
    const d = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const busy = events.filter(e => e.date <= d && (!e.endDate || e.endDate >= d));
    if (busy.length === 0) return 'available';
    if (busy.length >= 3) return 'busy';
    return 'partial';
  },
  getAvailabilityInfo(userId) {
    const today = new Date().toISOString().split('T')[0];
    const events = this.getCalendarEventsByUser(userId);
    const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const status = this.getUserAvailability(userId, today);
    let nextAvailable = null;
    if (status !== 'available' && upcoming.length) {
      const lastBusy = upcoming.filter(e => e.endDate || e.date).pop();
      if (lastBusy) {
        const end = lastBusy.endDate || lastBusy.date;
        const d = new Date(end);
        d.setDate(d.getDate() + 1);
        nextAvailable = d.toISOString().split('T')[0];
      }
    }
    return { status, nextAvailable, upcomingCount: upcoming.length };
  },

  // ── Farm Profiles ─────────────────────────────────────
  getListings() { return this._get('listings') || []; },
  getListingsByUser(userId) { return this.getListings().filter(l => l.userId === userId); },
  addListing(listing) {
    const l = this.getListings();
    listing.id = 'LST' + Date.now();
    listing.createdAt = new Date().toISOString();
    listing.status = 'active';
    l.push(listing);
    this._set('listings', l);
    return listing;
  },
  updateListing(id, data) {
    const l = this.getListings();
    const i = l.findIndex(x => x.id === id);
    if (i >= 0) { l[i] = { ...l[i], ...data }; this._set('listings', l); return l[i]; }
    return null;
  },

  getFarmProfiles() { return this._get('farmProfiles') || []; },
  getFarmProfileByUser(userId) { return this.getFarmProfiles().find(f => f.userId === userId); },
  addFarmProfile(profile) {
    const p = this.getFarmProfiles();
    profile.id = 'FARM' + Date.now();
    profile.createdAt = new Date().toISOString();
    p.push(profile);
    this._set('farmProfiles', p);
    return profile;
  },
  updateFarmProfile(userId, data) {
    const p = this.getFarmProfiles();
    const i = p.findIndex(f => f.userId === userId);
    if (i >= 0) { p[i] = { ...p[i], ...data }; this._set('farmProfiles', p); return p[i]; }
    return this.addFarmProfile({ ...data, userId });
  },

  // ── Pre-Harvest Bookings ──────────────────────────────
  getPreHarvestBookings() { return this._get('preHarvestBookings') || []; },
  getPreHarvestBySeller(sellerId) { return this.getPreHarvestBookings().filter(b => b.sellerId === sellerId); },
  addPreHarvestBooking(booking) {
    const b = this.getPreHarvestBookings();
    booking.id = 'PHB' + Date.now();
    booking.createdAt = new Date().toISOString();
    booking.status = 'open';
    b.push(booking);
    this._set('preHarvestBookings', b);
    return booking;
  },
  updatePreHarvestBooking(id, data) {
    const b = this.getPreHarvestBookings();
    const i = b.findIndex(x => x.id === id);
    if (i >= 0) { b[i] = { ...b[i], ...data }; this._set('preHarvestBookings', b); return b[i]; }
    return null;
  },
  bookPreHarvest(bookingId, buyerId, quantity) {
    const b = this.getPreHarvestBookings();
    const booking = b.find(x => x.id === bookingId);
    if (!booking) return null;
    if (!booking.bookings) booking.bookings = [];
    booking.bookings.push({ buyerId, quantity, bookedAt: new Date().toISOString(), status: 'reserved' });
    const totalBooked = booking.bookings.reduce((s, x) => s + x.quantity, 0);
    if (totalBooked >= booking.expectedQuantity) booking.status = 'fully-booked';
    this._set('preHarvestBookings', b);
    return booking;
  },

  // ── Marketplace Products ──────────────────────────────
  getProducts() { return this._get('products') || []; },
  addProduct(product) {
    const p = this.getProducts();
    product.id = 'PRD' + Date.now();
    product.createdAt = new Date().toISOString();
    p.push(product);
    this._set('products', p);
    return product;
  },
  updateProduct(id, data) {
    const p = this.getProducts();
    const i = p.findIndex(x => x.id === id);
    if (i >= 0) { p[i] = { ...p[i], ...data }; this._set('products', p); return p[i]; }
    return null;
  },

  // ── Equipment Rentals ─────────────────────────────────
  getEquipmentRentals() { return this._get('equipmentRentals') || []; },
  getEquipmentByOwner(ownerId) { return this.getEquipmentRentals().filter(e => e.ownerId === ownerId); },
  addEquipmentRental(equipment) {
    const e = this.getEquipmentRentals();
    equipment.id = 'EQP' + Date.now();
    equipment.createdAt = new Date().toISOString();
    equipment.available = true;
    e.push(equipment);
    this._set('equipmentRentals', e);
    return equipment;
  },
  updateEquipmentRental(id, data) {
    const e = this.getEquipmentRentals();
    const i = e.findIndex(x => x.id === id);
    if (i >= 0) { e[i] = { ...e[i], ...data }; this._set('equipmentRentals', e); return e[i]; }
    return null;
  },

  // ── Equipment Rental Requests ─────────────────────────
  getEquipmentRequests() { return this._get('equipmentRequests') || []; },
  addEquipmentRequest(req) {
    const r = this.getEquipmentRequests();
    req.id = 'EQR' + Date.now();
    req.createdAt = new Date().toISOString();
    req.status = 'pending';
    r.push(req);
    this._set('equipmentRequests', r);
    return req;
  },
  updateEquipmentRequest(id, data) {
    const r = this.getEquipmentRequests();
    const i = r.findIndex(x => x.id === id);
    if (i >= 0) { r[i] = { ...r[i], ...data }; this._set('equipmentRequests', r); return r[i]; }
    return null;
  },

  // ── Transport Services ────────────────────────────────
  getTransportServices() { return this._get('transportServices') || []; },
  getTransportByProvider(providerId) { return this.getTransportServices().filter(t => t.providerId === providerId); },
  addTransportService(service) {
    const s = this.getTransportServices();
    service.id = 'TRS' + Date.now();
    service.createdAt = new Date().toISOString();
    service.available = true;
    s.push(service);
    this._set('transportServices', s);
    return service;
  },
  updateTransportService(id, data) {
    const s = this.getTransportServices();
    const i = s.findIndex(x => x.id === id);
    if (i >= 0) { s[i] = { ...s[i], ...data }; this._set('transportServices', s); return s[i]; }
    return null;
  },
  getTransportRequests() { return this._get('transportRequests') || []; },
  addTransportRequest(req) {
    const r = this.getTransportRequests();
    req.id = 'TRR' + Date.now();
    req.createdAt = new Date().toISOString();
    req.status = 'pending';
    r.push(req);
    this._set('transportRequests', r);
    return req;
  },
  updateTransportRequest(id, data) {
    const r = this.getTransportRequests();
    const i = r.findIndex(x => x.id === id);
    if (i >= 0) { r[i] = { ...r[i], ...data }; this._set('transportRequests', r); return r[i]; }
    return null;
  },

  // ── Work Requests (Smart System) ──────────────────────
  getWorkRequests() { return this._get('workRequests') || []; },
  addWorkRequest(req) {
    const r = this.getWorkRequests();
    req.id = 'WR' + Date.now();
    req.createdAt = new Date().toISOString();
    req.status = 'open';
    r.push(req);
    this._set('workRequests', r);
    return req;
  },
  updateWorkRequest(id, data) {
    const r = this.getWorkRequests();
    const i = r.findIndex(x => x.id === id);
    if (i >= 0) { r[i] = { ...r[i], ...data }; this._set('workRequests', r); return r[i]; }
    return null;
  },

  // ── Groups / Teams ────────────────────────────────────
  getGroups() { return this._get('groups') || []; },
  addGroup(group) {
    const g = this.getGroups();
    group.id = 'GRP' + Date.now();
    group.createdAt = new Date().toISOString();
    g.push(group);
    this._set('groups', g);
    return group;
  },
  updateGroup(id, data) {
    const g = this.getGroups();
    const i = g.findIndex(x => x.id === id);
    if (i >= 0) { g[i] = { ...g[i], ...data }; this._set('groups', g); return g[i]; }
    return null;
  },
  getGroupsByUser(userId) {
    return this.getGroups().filter(g => g.members && g.members.includes(userId));
  },

  // ── Trust Score Calculation ───────────────────────────
  getTrustScore(userId) {
    const user = this.getUserById(userId);
    if (!user) return 0;
    let score = 0;
    if (user.verified || user.emailVerified) score += 15;
    if (user.phoneVerified || user.mobileVerified) score += 10;
    if (DB.hasUploadedPhoto(userId)) score += 10;
    const reviews = this.getReviews(userId);
    if (reviews.length) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      score += Math.round(avg * 6);
    }
    const apps = this.getApplicationsByWorker(userId);
    score += Math.min(apps.filter(a => a.status === 'accepted').length * 5, 20);
    const apApps = (this._get('armaParmaRequests') || []).filter(r => r.applicants && r.applicants.includes(userId));
    score += Math.min(apApps.length * 3, 15);
    const phBookings = this.getPreHarvestBookings().filter(b => b.sellerId === userId && b.status === 'sold');
    score += Math.min(phBookings.length * 4, 15);
    if (user.createdAt) {
      const days = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
      score += Math.min(Math.floor(days / 30), 10);
    }
    const chats = this.getChatsByUser(userId);
    const msgs = this.getMessages().filter(m => chats.some(c => c.id === m.chatId));
    const responses = msgs.filter(m => m.senderId !== userId);
    if (responses.length > 0) score += 5;
    return Math.min(score, 100);
  },
  getTrustLevel(score) {
    if (score >= 80) return { level: 'Platinum', icon: '💎', color: '#6366f1' };
    if (score >= 60) return { level: 'Gold', icon: '🥇', color: '#f59e0b' };
    if (score >= 40) return { level: 'Silver', icon: '🥈', color: '#94a3b8' };
    if (score >= 20) return { level: 'Bronze', icon: '🥉', color: '#d97706' };
    return { level: 'New', icon: '🌱', color: '#16a34a' };
  },

  // ── Groups ────────────────────────────────────────────
  getGroupByUser(userId) { return this.getGroups().filter(g => g.memberIds && g.memberIds.includes(userId)); },

  // ── Weather (mock) ────────────────────────────────────
  getWeather(district) {
    const districts = {
      'Chitwan': { temp: 32, condition: 'Partly Cloudy', humidity: 75, rain: 40, icon: '⛅', wind: 12, suggestions: ['Good day for planting', 'Ensure adequate irrigation', 'Monitor for pest activity'] },
      'Ilam': { temp: 22, condition: 'Misty', humidity: 85, rain: 60, icon: '🌫️', wind: 8, suggestions: ['Avoid pesticide spraying today', 'Good for tea plucking', 'Cover sensitive crops'] },
      'Kathmandu': { temp: 28, condition: 'Sunny', humidity: 55, rain: 10, icon: '☀️', wind: 15, suggestions: ['Perfect for field work', 'Stay hydrated', 'Good harvest day'] },
      'Kaski': { temp: 25, condition: 'Light Rain', humidity: 80, rain: 70, icon: '🌧️', wind: 10, suggestions: ['Postpone spraying', 'Check drainage systems', 'Good for rice transplanting'] },
      'Bara': { temp: 34, condition: 'Hot', humidity: 65, rain: 20, icon: '🌡️', wind: 18, suggestions: ['Work early morning', 'Provide extra water for crops', 'Heat warning for livestock'] },
    };
    const forecast = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const conditions = ['☀️', '⛅', '🌤️', '🌧️', '⛈️'];
      const condNames = ['Sunny', 'Partly Cloudy', 'Mostly Sunny', 'Rainy', 'Thunderstorm'];
      const ci = Math.floor(Math.random() * 5);
      forecast.push({
        date: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        temp: Math.floor(20 + Math.random() * 15),
        icon: conditions[ci],
        condition: condNames[ci],
        rain: Math.floor(Math.random() * 100),
      });
    }
    return { current: districts[district] || districts['Kathmandu'], forecast };
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
    { name: 'Koshi', districts: ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum', 'Udayapur'] },
    { name: 'Madhesh', districts: ['Parsa', 'Bara', 'Rautahat', 'Saptari', 'Siraha', 'Dhanusha', 'Mahottari', 'Sarlahi'] },
    { name: 'Bagmati', districts: ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kavrepalanchowk', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'] },
    { name: 'Gandaki', districts: ['Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalparasi East', 'Parbat', 'Syangja', 'Tanahun'] },
    { name: 'Lumbini', districts: ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum', 'Gulmi', 'Kapilvastu', 'Parasi', 'Palpa', 'Pyuthan', 'Rolpa', 'Rupandehi'] },
    { name: 'Karnali', districts: ['Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan', 'Surkhet', 'Western Rukum'] },
    { name: 'Sudurpashchim', districts: ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur'] }
  ]
};

const SAMPLE_LOCAL_LEVELS = {
  'Achham': [
    { c: '68-206', n: 'Bannigadi Jayagad', np: 'बान्नीगडी जयगड' },
    { c: '68-204', n: 'Chaurpati', np: 'चौरपाटी' },
    { c: '68-208', n: 'Dhakari', np: 'ढकारी' },
    { c: '68-201', n: 'Kamalbazar', np: 'कमलबजार' },
    { c: '68-200', n: 'Mangalsen', np: 'मंगलसेन' },
    { c: '68-205', n: 'Mellekh', np: 'मेल्लेख' },
    { c: '68-203', n: 'Panchadewal Binayak', np: 'पंचदेवल विनायक' },
    { c: '68-207', n: 'Ramaroshan', np: 'रामारोशन' },
    { c: '68-202', n: 'Sanphebagar', np: 'साँफेबगर' },
    { c: '68-209', n: 'Turmakhand', np: 'तुर्माखाद' },
  ],
  'Arghakhanchi': [
    { c: '44-202', n: 'Bhumikasthan', np: 'भूमिकास्थान' },
    { c: '44-203', n: 'Chhatradev', np: 'छत्रदेव' },
    { c: '44-205', n: 'Malarani', np: 'मालारानी' },
    { c: '44-204', n: 'Pandini', np: 'पाणिनी' },
    { c: '44-200', n: 'Sandhikharka', np: 'सन्धिखर्क' },
    { c: '44-201', n: 'Sitganga', np: 'शितगंगा' },
  ],
  'Baglung': [
    { c: '50-209', n: 'Badigad', np: 'वडिगाड' },
    { c: '50-200', n: 'Baglung', np: 'बागलुङ' },
    { c: '50-204', n: 'Bareng', np: 'वरेङ' },
    { c: '50-203', n: 'Dhorpatan', np: 'ढोरपाटन' },
    { c: '50-201', n: 'Galkot', np: 'गल्कोट' },
    { c: '50-202', n: 'Jaimini', np: 'जैमिनी' },
    { c: '50-205', n: 'Kathekhola', np: 'काठेखोला' },
    { c: '50-208', n: 'Nisikhola', np: 'निसीखोला' },
    { c: '50-206', n: 'Tamankhola', np: 'तमानखोला' },
    { c: '50-207', n: 'Tarakhola', np: 'ताराखोला' },
  ],
  'Baitadi': [
    { c: '73-200', n: 'Dasharathchand', np: 'दशरथचन्द' },
    { c: '73-209', n: 'Dilashaini', np: 'डिलासैनी' },
    { c: '73-208', n: 'Dogdakedar', np: 'दोगडाकेदार' },
    { c: '73-202', n: 'Melauli', np: 'मेलौली' },
    { c: '73-207', n: 'Pancheshwar', np: 'पन्चेश्वर' },
    { c: '73-201', n: 'Patan', np: 'पाटन' },
    { c: '73-203', n: 'Purchaundi', np: 'पुर्चौडी' },
    { c: '73-206', n: 'Shivanath', np: 'शिवनाथ' },
    { c: '73-205', n: 'Sigas', np: 'सिगास' },
    { c: '73-204', n: 'Surnaya', np: 'सुर्नया' },
  ],
  'Bajhang': [
    { c: '69-206', n: 'Bitthadchir', np: 'वित्थडचिर' },
    { c: '69-201', n: 'Bungal', np: 'बुंगल' },
    { c: '69-208', n: 'Chhabis Pathibhera', np: 'छविसपाथिभेरा' },
    { c: '69-209', n: 'Durgathali', np: 'दुर्गाथली' },
    { c: '69-200', n: 'Jaya Prithvi', np: 'जयपृथ्वी' },
    { c: '69-210', n: 'Kedarsyu', np: 'केदारस्युँ' },
    { c: '69-204', n: 'KhaptadChhanna', np: 'खप्तडछान्ना' },
    { c: '69-203', n: 'Masta', np: 'मष्टा' },
    { c: '69-211', n: 'Sa pal', np: 'सा पाल' },
    { c: '69-207', n: 'Surma', np: 'सूर्मा' },
    { c: '69-202', n: 'Talkot', np: 'तलकोट' },
    { c: '69-205', n: 'Thalara', np: 'थलारा' },
  ],
  'Bajura': [
    { c: '67-200', n: 'Badimalika', np: 'बडिमालिका' },
    { c: '9-109', n: 'Budhiganga', np: 'बुढीगंगा' },
    { c: '67-203', n: 'Budhinanda', np: 'बुढिनन्दा' },
    { c: '67-204', n: 'Gaumul', np: 'गौमुल' },
    { c: '67-208', n: 'Himali', np: 'हिमाली' },
    { c: '67-205', n: 'Jagannath', np: 'जगन्नाथ' },
    { c: '67-207', n: 'Khaptad Chhededaha', np: 'खप्तड छेडेदह' },
    { c: '67-206', n: 'Swami Kartik Khapar', np: 'स्वामिकार्तिक खापर' },
    { c: '52-207', n: 'Tribeni', np: 'त्रिवेणी' },
  ],
  'Banke': [
    { c: '65-204', n: 'Baijnath', np: 'बैजनाथ' },
    { c: '65-206', n: 'Duduwa', np: 'डुडुवा' },
    { c: '65-207', n: 'Janaki', np: 'जानकी' },
    { c: '65-205', n: 'Khajura', np: 'खजुरा' },
    { c: '65-201', n: 'Kohalpur', np: 'कोहलपुर' },
    { c: '65-202', n: 'Narainapur', np: 'नरैनापुर' },
    { c: '65-200', n: 'Nepalgunj', np: 'नेपालगन्ज' },
    { c: '65-203', n: 'Raptisonari', np: 'राप्तीसोनारी' },
  ],
  'Bara': [
    { c: '33-106', n: 'Adarsha Kotwal', np: 'आदर्श कोतवाल' },
    { c: '33-113', n: 'Baragadhi', np: 'बारागढी' },
    { c: '33-4944', n: 'Bishrampur', np: 'विश्रामपुर' },
    { c: '33-108', n: 'Devtal', np: 'देवताल' },
    { c: '33-101', n: 'Jitpur Simara', np: 'जीतपुरसिमरा' },
    { c: '33-100', n: 'Kalaiya', np: 'कलैया' },
    { c: '33-107', n: 'Karaiyamai', np: 'करैयामाई' },
    { c: '33-102', n: 'Kolhabi', np: 'कोल्हवी' },
    { c: '33-104', n: 'Mahagadhimai', np: 'महागढीमाई' },
    { c: '33-103', n: 'Nijgadh', np: 'निजगढ' },
    { c: '33-109', n: 'Pachrauta', np: 'पचरौता' },
    { c: '33-110', n: 'Parawanipur', np: 'परवानीपुर' },
    { c: '33-112', n: 'Pheta', np: 'फेटा' },
    { c: '33-111', n: 'Prasauni', np: 'प्रसौनी' },
    { c: '33-105', n: 'Simraungadh', np: 'सिम्रौनगढ' },
    { c: '33-114', n: 'Subarna', np: 'सुवर्ण ' },
  ],
  'Bardiya': [
    { c: '66-206', n: 'Badhaiyatal', np: 'बढैयाताल' },
    { c: '66-204', n: 'Bansgadhi', np: 'बाँसगढी' },
    { c: '66-205', n: 'Barbardiya', np: 'बारबर्दिया' },
    { c: '66-207', n: 'Geruwa', np: 'गेरुवा' },
    { c: '66-200', n: 'Gulariya', np: 'गुलरिया' },
    { c: '66-201', n: 'Madhuwan', np: 'मधुवन' },
    { c: '66-202', n: 'Rajapur', np: 'राजापुर' },
    { c: '66-203', n: 'Thakurbaba', np: 'ठाकुरबाबा' },
  ],
  'Bhaktapur': [
    { c: '27-201', n: 'Bhaktapur', np: 'भक्तपुर' },
    { c: '27-200', n: 'Changunarayan', np: 'चाँगुनारायण' },
    { c: '27-202', n: 'Madhyapur Thimi', np: 'मध्यपुर थिमि' },
    { c: '27-203', n: 'Suryabinayak', np: 'सूर्यविनायक' },
  ],
  'Bhojpur': [
    { c: '7-107', n: 'Aamchok', np: 'आमचोक' },
    { c: '7-104', n: 'Arun', np: 'अरुण' },
    { c: '7-100', n: 'Bhojpur', np: 'भोजपुर' },
    { c: '7-108', n: 'Hatuwagadhi', np: 'हतुवागढी' },
    { c: '7-105', n: 'Pauwadungma', np: 'पौवादुङमा' },
    { c: '7-103', n: 'Ramprasadrai', np: 'रामप्रसादराई' },
    { c: '7-106', n: 'Salpasilichho', np: 'साल्पासिलिछो' },
    { c: '7-101', n: 'Shadanand', np: 'षडानन्द' },
    { c: '7-102', n: 'Temkemaiyung', np: 'टेम्केमैयुङ' },
  ],
  'Chitwan': [
    { c: '35-200', n: 'Bharatpur', np: 'भरतपुर' },
    { c: '35-206', n: 'Ichchhakamana', np: 'इच्छाकामना' },
    { c: '23-201', n: 'Kalika', np: 'कालिका' },
    { c: '35-202', n: 'Khairhani', np: 'खैरहनी' },
    { c: '35-203', n: 'Madi', np: 'माडी' },
    { c: '35-205', n: 'Rapti', np: 'राप्ती' },
    { c: '35-204', n: 'Ratnanagar', np: 'रत्ननगर' },
  ],
  'Dadeldhura': [
    { c: '74-202', n: 'Aalitaal', np: 'आलिताल' },
    { c: '74-205', n: 'Ajaymeru', np: 'अजयमेरु' },
    { c: '74-200', n: 'Amargadhi', np: 'अमरगढी' },
    { c: '74-203', n: 'Bhageshwar', np: 'भागेश्वर' },
    { c: '74-206', n: 'Ganyapadhura', np: 'गन्यापधुरा' },
    { c: '74-204', n: 'Navadurga', np: 'नवदुर्गा' },
    { c: '74-201', n: 'Parashuram', np: 'परशुराम' },
  ],
  'Dailekh': [
    { c: '63-203', n: 'Aathabis', np: 'आठविस' },
    { c: '63-204', n: 'Bhagawatimai', np: 'भगवतिमाई' },
    { c: '63-209', n: 'Bhairabi', np: 'भैरवी' },
    { c: '63-202', n: 'Chamunda Bindrasaini', np: 'चामुण्डा विन्द्रासैनी' },
    { c: '63-201', n: 'Dullu', np: 'दुल्लु' },
    { c: '63-206', n: 'Dungeshwar', np: 'डुङ्गेश्वर' },
    { c: '63-205', n: 'Gurans', np: 'गुरास' },
    { c: '63-208', n: 'Mahabu', np: 'महावु' },
    { c: '63-200', n: 'Narayan', np: 'नारायण' },
    { c: '63-207', n: 'Naumule', np: 'नौमुले' },
    { c: '63-210', n: 'Thantikandh', np: 'ठाँटीकाध' },
  ],
  'Dang': [
    { c: '56-209', n: 'Babai', np: 'बबई' },
    { c: '56-203', n: 'Banglachuli', np: 'बँगलाचुली' },
    { c: '56-204', n: 'Dangisharan', np: 'दँगीशरण' },
    { c: '56-205', n: 'Gadhawa', np: 'गढवा' },
    { c: '56-201', n: 'Ghorahi', np: 'घोराही' },
    { c: '56-202', n: 'Lamahi', np: 'लमही' },
    { c: '32-115', n: 'Rajpur', np: 'राजपुर' },
    { c: '35-205', n: 'Rapti', np: 'राप्ती' },
    { c: '56-208', n: 'Shantinagar', np: 'शान्तिनगर' },
    { c: '56-200', n: 'Tulsipur', np: 'तुल्सीपुर' },
  ],
  'Darchula': [
    { c: '72-203', n: 'Api Himal', np: 'अपिहिमाल' },
    { c: '72-204', n: 'Duhu', np: 'दुहुँ' },
    { c: '72-207', n: 'Lekam', np: 'लेकम' },
    { c: '72-200', n: 'Mahakali', np: 'माहाकाली' },
    { c: '72-202', n: 'Malikarjun', np: 'मालिकार्जुन' },
    { c: '72-206', n: 'Marma', np: 'मार्मा' },
    { c: '72-205', n: 'Naugad', np: 'नौगाड' },
    { c: '72-201', n: 'Shailyashikhar', np: 'शैल्यशिखर' },
    { c: '72-208', n: 'Vyas', np: 'ब्यास' },
  ],
  'Dhading': [
    { c: '24-209', n: 'Benighat Rorang', np: 'बेनीघाट रोराङ्ग' },
    { c: '24-200', n: 'Dhunibeshi', np: 'धुनीबेंशी' },
    { c: '24-203', n: 'Gajuri', np: 'गजुरी' },
    { c: '24-204', n: 'Galchhi', np: 'गल्छी' },
    { c: '24-205', n: 'Gangajamuna', np: 'गङ्गाजमुना' },
    { c: '24-206', n: 'Jwalamukhi', np: 'ज्वालामूखी' },
    { c: '24-202', n: 'Khaniyabas', np: 'खनियाबास' },
    { c: '24-208', n: 'Netrawati Dabjong', np: 'नेत्रावती डबजोङ' },
    { c: '24-201', n: 'Nilkantha', np: 'नीलकण्ठ' },
    { c: '24-210', n: 'Ruby Valley', np: 'रुवी भ्याली' },
    { c: '24-211', n: 'Siddhalekh', np: 'सिद्धलेक' },
    { c: '24-207', n: 'Thakre', np: 'थाक्रे' },
    { c: '24-212', n: 'Tripura Sundari', np: 'त्रिपुरासुन्दरी' },
  ],
  'Dhankuta': [
    { c: '8-106', n: 'Chaubise', np: 'चौबिसे' },
    { c: '8-105', n: 'Chhathar Jorpati', np: 'छथर जोरपाटी' },
    { c: '8-101', n: 'Dhankuta', np: 'धनकुटा' },
    { c: '8-102', n: 'Mahalaxmi', np: 'महालक्ष्मी' },
    { c: '8-100', n: 'Pakhribas', np: 'पाख्रिवास' },
    { c: '8-104', n: 'Sahidbhumi', np: 'सहिदभूमि' },
    { c: '8-103', n: 'Sangurigadhi', np: 'साँगुरीगढी' },
  ],
  'Dhanusha': [
    { c: '16-207', n: 'Aaurahi', np: 'औरही' },
    { c: '20-211', n: 'Bateshwar', np: 'बटेश्वर' },
    { c: '20-205', n: 'Bideha', np: 'विदेह' },
    { c: '20-4938', n: 'Dhanauji', np: 'धनौजी' },
    { c: '20-203', n: 'Dhanushadham', np: 'धनुषाधाम' },
    { c: '20-202', n: 'Ganeshman Charnath', np: 'गणेशमान चारनाथ' },
    { c: '20-215', n: 'Hansapur', np: 'हंसपुर' },
    { c: '20-210', n: 'Janak Nandini', np: 'जनकनन्दिनी' },
    { c: '20-200', n: 'Janakpur', np: 'जनकपुर' },
    { c: '20-209', n: 'Kamala', np: 'कमला' },
    { c: '20-201', n: 'Kshireshwarnath', np: 'क्षिरेश्वरनाथ' },
    { c: '20-214', n: 'Laksminiya', np: 'लक्ष्मिनिया' },
    { c: '20-206', n: 'Mithila', np: 'मिथिला' },
    { c: '20-212', n: 'Mithila Bihari', np: 'मिथिला बिहारी' },
    { c: '20-213', n: 'Mukhiyapatti Musaharmiya', np: 'मुखियापट्टी मुसहरमिया' },
    { c: '20-204', n: 'Nagarain', np: 'नगराईन' },
    { c: '20-208', n: 'Sabaila', np: 'सबैला' },
    { c: '20-207', n: 'Shahidnagar', np: 'शहिदनगर' },
  ],
  'Dolakha': [
    { c: '17-207', n: 'Baiteshwar', np: 'वैतेश्वर' },
    { c: '17-201', n: 'Bhimeshwar', np: 'भीमेश्वर' },
    { c: '17-206', n: 'Bigu', np: 'विगु' },
    { c: '17-203', n: 'Gaurishankar', np: 'गौरिशंकर' },
    { c: '17-200', n: 'Jiri', np: 'जिरी' },
    { c: '17-202', n: 'Kalinchok', np: 'कालिन्चोक' },
    { c: '17-205', n: 'Melung', np: 'मेलुङ' },
    { c: '17-208', n: 'Shailung', np: 'शैलुङ' },
    { c: '17-204', n: 'Tamakoshi', np: 'तामाकोशी' },
  ],
  'Dolpa': [
    { c: '57-207', n: 'Chharka Tangsong', np: 'छार्का ताङसोङ' },
    { c: '57-202', n: 'Dolpa Buddha', np: 'डोल्पा वुद्ध' },
    { c: '57-204', n: 'Jagadulla', np: 'जगदुल्ला' },
    { c: '57-206', n: 'Kaike', np: 'काईके' },
    { c: '57-205', n: 'Mudkechula', np: 'मुड्केचुला' },
    { c: '57-203', n: 'She Phoksundo', np: 'शे फोक्सुण्डे' },
    { c: '57-200', n: 'Thuli Bheri', np: 'ठुलिभेरी' },
    { c: '24-212', n: 'Tripura Sundari', np: 'त्रिपुरासुन्दरी' },
  ],
  'Doti': [
    { c: '70-206', n: 'Aadarsha', np: 'आदर्श' },
    { c: '70-208', n: 'Bogatan', np: 'बोगटान' },
    { c: '70-203', n: 'Budikedar', np: 'बुडीकेदार' },
    { c: '70-200', n: 'Dipayal Silgadhi', np: 'दिपायल सिलगढी' },
    { c: '70-204', n: 'Jorayal', np: 'जोरायल' },
    { c: '70-207', n: 'K.I. Singh', np: 'के.आइ.सी' },
    { c: '70-202', n: 'Purbichauki', np: 'पुर्विचौकी' },
    { c: '70-205', n: 'Sayal', np: 'सायल' },
    { c: '70-201', n: 'Shikhar', np: 'शिखर' },
  ],
  'Eastern Rukum': [
    { c: '52-204', n: 'Bhume', np: 'भूमे' },
    { c: '52-203', n: 'Putha Uttarganga', np: 'पुथ उत्तरगँगा' },
    { c: '52-205', n: 'Sisne', np: 'सिस्ने' },
  ],
  'Gorkha': [
    { c: '36-205', n: 'Aarughat', np: 'आरूघाट' },
    { c: '36-204', n: 'Ajirkot', np: 'अजिरकोट' },
    { c: '36-202', n: 'Barpak Sulikot', np: 'बारपाक सुलीकोट' },
    { c: '36-209', n: 'Bhimsen Thapa', np: 'भिमसेनथापा' },
    { c: '36-207', n: 'Chumnuubri', np: 'चुमनुव्री' },
    { c: '36-208', n: 'Dharche', np: 'धार्चे' },
    { c: '36-206', n: 'Gandaki', np: 'गण्डकी' },
    { c: '36-200', n: 'Gorkha', np: 'गोरखा' },
    { c: '36-201', n: 'Palungtar', np: 'पालुङटार' },
    { c: '36-210', n: 'Shahid Lakhan', np: 'शहिद लखन' },
    { c: '36-203', n: 'Siranchok', np: 'सिरानचोक' },
  ],
  'Gulmi': [
    { c: '42-206', n: 'Chandrakot', np: 'चन्द्रकोट' },
    { c: '42-208', n: 'Chhatrakot', np: 'छत्रकोट' },
    { c: '42-209', n: 'Dhurkot', np: 'धुर्कोट' },
    { c: '42-204', n: 'Gulmidurbar', np: 'गुल्मीदरबार' },
    { c: '42-202', n: 'Isma', np: 'इस्मा' },
    { c: '41-207', n: 'Kaligandaki', np: 'कालीगण्डकी' },
    { c: '42-210', n: 'Madane', np: 'मदाने' },
    { c: '42-211', n: 'Malika', np: 'मालिका' },
    { c: '42-200', n: 'Musikot', np: 'मुसिकोट' },
    { c: '42-201', n: 'Resunga', np: 'रेसुङ्गा' },
    { c: '42-207', n: 'Ruru', np: 'रुरु' },
    { c: '42-205', n: 'Satyawati', np: 'सत्यवती' },
  ],
  'Humla': [
    { c: '61-205', n: 'Adanchuli', np: 'अदानचुली' },
    { c: '61-204', n: 'Chankheli', np: 'चंखेली' },
    { c: '61-202', n: 'Kharpunath', np: 'खार्पुनाथ' },
    { c: '61-201', n: 'Namkha', np: 'नाम्खा' },
    { c: '61-203', n: 'Sarkegad', np: 'सर्केगाड' },
    { c: '61-200', n: 'Simikot', np: 'सिमिकोट' },
    { c: '61-206', n: 'Tajakot', np: 'ताजाकोट' },
  ],
  'Ilam': [
    { c: '3-105', n: 'Chulachuli', np: 'चुलाचुली' },
    { c: '3-101', n: 'Deumai', np: 'देउमाई' },
    { c: '3-100', n: 'Ilam', np: 'ईलाम' },
    { c: '3-102', n: 'Mai', np: 'माई' },
    { c: '3-106', n: 'Mai Jogmai', np: 'माईजोगमाई' },
    { c: '3-107', n: 'Mangsebung', np: 'माङसेबुङ' },
    { c: '3-104', n: 'Phakphokthum', np: 'फाकफोकथुम' },
    { c: '3-108', n: 'Rong', np: 'रोङ' },
    { c: '3-109', n: 'Sandakpur', np: 'सन्दकपुर' },
    { c: '3-103', n: 'Suryodaya', np: 'सूर्योदय' },
  ],
  'Jajarkot': [
    { c: '62-205', n: 'Barekot', np: 'बारेकोट' },
    { c: '62-200', n: 'Bheri', np: 'भेरी' },
    { c: '62-201', n: 'Chhedagad', np: 'छेडागाड' },
    { c: '62-204', n: 'Junichade', np: 'जुनिचादे' },
    { c: '62-203', n: 'Kushe', np: 'कुसे' },
    { c: '62-202', n: 'Nalgad', np: 'नलगाड' },
    { c: '62-206', n: 'Sivalaya', np: 'सिवालय' },
  ],
  'Jhapa': [
    { c: '4-104', n: 'Arjundhara', np: 'अर्जुनधारा' },
    { c: '4-110', n: 'Barhadashi', np: 'बाह्रदशी' },
    { c: '4-103', n: 'Bhadrapur', np: 'भद्रपुर' },
    { c: '4-107', n: 'Birtamod', np: 'बिर्तामोड' },
    { c: '4-112', n: 'Buddha Shanti', np: 'बुद्धशान्ति' },
    { c: '4-101', n: 'Damak', np: 'दमक' },
    { c: '4-106', n: 'Gauradaha', np: 'गौरादह' },
    { c: '4-109', n: 'Gaurigunj', np: 'गौरिगंज' },
    { c: '4-113', n: 'Haldibari', np: 'हल्दीबारी' },
    { c: '4-111', n: 'Jhapa', np: 'झापा' },
    { c: '4-114', n: 'Kachankawal', np: 'कचनकवल' },
    { c: '4-108', n: 'Kamal', np: 'कमल' },
    { c: '4-102', n: 'Kankai', np: 'कन्काई' },
    { c: '4-100', n: 'Mechinagar', np: 'मेचीनगर' },
    { c: '4-105', n: 'Shivasatakshi', np: 'शिवसताक्षी' },
  ],
  'Jumla': [
    { c: '59-200', n: 'Chandannath', np: 'चन्दननाथ' },
    { c: '59-205', n: 'Guthichaur', np: 'गुठीचौर' },
    { c: '59-203', n: 'Hima', np: 'हिमा' },
    { c: '59-201', n: 'Kanaka Sundari', np: 'कनकासुन्दरी' },
    { c: '59-207', n: 'Patarasi', np: 'पातारासी' },
    { c: '59-202', n: 'Sinja', np: 'सिंजा' },
    { c: '59-206', n: 'Tatopani', np: 'तातोपानी' },
    { c: '59-204', n: 'Tila', np: 'तिला' },
  ],
  'Kailali': [
    { c: '71-208', n: 'Bardagoriya', np: 'बर्दगोरिया' },
    { c: '71-204', n: 'Bhajani', np: 'भजनी' },
    { c: '71-212', n: 'Chure', np: 'चुरे' },
    { c: '71-200', n: 'Dhangadhi', np: 'धनगढी' },
    { c: '71-206', n: 'Gauriganga', np: 'गौरीगंगा' },
    { c: '71-202', n: 'Ghodaghodi', np: 'घोडाघोडी' },
    { c: '28-201', n: 'Godawari, Seti', np: 'गोदावरी' },
    { c: '65-207', n: 'Janaki', np: 'जानकी' },
    { c: '71-211', n: 'Joshipur', np: 'जोशिपुर' },
    { c: '71-210', n: 'Kailari', np: 'कैलारी' },
    { c: '71-203', n: 'Lamki Chuha', np: 'लम्किचुहा' },
    { c: '71-209', n: 'Mohanyal', np: 'मोहन्याल' },
    { c: '71-201', n: 'Tikapur', np: 'टिकापुर' },
  ],
  'Kalikot': [
    { c: '60-200', n: 'Khadachakra', np: 'खाडाचक्र' },
    { c: '60-207', n: 'Mahawai', np: 'महावै' },
    { c: '60-205', n: 'Narharinath', np: 'नरहरीनाथ' },
    { c: '60-203', n: 'Pachaljharana', np: 'पचालझरना' },
    { c: '60-208', n: 'Palata', np: 'पलाता' },
    { c: '60-201', n: 'Raskot', np: 'रास्कोट' },
    { c: '60-204', n: 'Sanni Triveni', np: 'सान्नी त्रीवेणी' },
    { c: '60-206', n: 'Shubha Kalika', np: 'शुभ कालीका' },
    { c: '60-202', n: 'Tilagupha', np: 'तिलागुफा' },
  ],
  'Kanchanpur': [
    { c: '75-202', n: 'Bedkot', np: 'बेदकोट' },
    { c: '75-205', n: 'Belauri', np: 'बेलौरी' },
    { c: '75-207', n: 'Beldandi', np: 'बेलडाँडी' },
    { c: '75-200', n: 'Bhimdatta', np: 'भीमदत्त' },
    { c: '75-206', n: 'Krishnapur', np: 'कृष्णपुर' },
    { c: '75-208', n: 'Laljhadi', np: 'लालझाडी' },
    { c: '72-200', n: 'Mahakali', np: 'माहाकाली' },
    { c: '75-201', n: 'Punarbas', np: 'पुनर्वास' },
    { c: '75-204', n: 'Shuklaphanta', np: 'शुक्लाफाँटा' },
  ],
  'Kapilvastu': [
    { c: '47-205', n: 'Banganga', np: 'बाणगंगा' },
    { c: '47-208', n: 'Bijaynagar', np: 'विजयनगर' },
    { c: '47-201', n: 'Buddhabhumi', np: 'बुद्दभुमी' },
    { c: '47-200', n: 'Kapilvastu', np: 'कपिलवस्तु' },
    { c: '47-204', n: 'Krishnanagar', np: 'कृष्णनगर' },
    { c: '47-203', n: 'Maharajganj', np: 'महाराजगंज' },
    { c: '46-212', n: 'Mayadevi', np: 'मायादेवी' },
    { c: '47-202', n: 'Shivaraj', np: 'शिवराज' },
    { c: '47-209', n: 'Shuddhodhan', np: 'शुद्धोधन' },
    { c: '47-207', n: 'Yasodhara', np: 'यशोधरा' },
  ],
  'Kaski': [
    { c: '39-201', n: 'Annapurna', np: 'अन्नपुर्ण' },
    { c: '39-202', n: 'Machhapuchhre', np: 'माछापुछ्रे' },
    { c: '5-103', n: 'Madi', np: 'मादी' },
    { c: '39-200', n: 'Pokhara', np: 'पोखरा' },
    { c: '39-204', n: 'Rupa', np: 'रूपा' },
  ],
  'Kathmandu': [
    { c: '26-209', n: 'Budhanilkantha', np: 'बुढानिलकण्ठ' },
    { c: '26-204', n: 'Chandragiri', np: 'चन्द्रागिरी' },
    { c: '26-207', n: 'Dakshinkali', np: 'दक्षिणकाली' },
    { c: '26-203', n: 'Gokarneshwar', np: 'गोकर्णेश्वर' },
    { c: '26-201', n: 'Kageshwari-Manohara', np: 'कागेश्वरी मनोहरा' },
    { c: '26-200', n: 'Kathmandu', np: 'काठमाडौँ' },
    { c: '26-202', n: 'Kirtipur', np: 'कीर्तिपुर' },
    { c: '26-208', n: 'Nagarjun', np: 'नागार्जुन' },
    { c: '26-210', n: 'Shankharapur', np: 'शङ्खरापुर' },
    { c: '25-205', n: 'Tarakeshwar', np: 'तारकेश्वर' },
    { c: '26-205', n: 'Tokha', np: 'टोखा' },
  ],
  'Kavrepalanchowk': [
    { c: '29-201', n: 'Banepa', np: 'बनेपा' },
    { c: '29-208', n: 'Bethanchok', np: 'बेथानचोक' },
    { c: '29-209', n: 'Bhumlu', np: 'भुम्लु' },
    { c: '29-206', n: 'Chaunri Deurali', np: 'चौंरीदेउराली' },
    { c: '29-200', n: 'Dhulikhel', np: 'धुलिखेल' },
    { c: '29-205', n: 'Khanikhola', np: 'खानीखोला' },
    { c: '29-211', n: 'Mahabharat', np: 'महाभारत' },
    { c: '29-210', n: 'Mandandeupur', np: 'मण्डनदेउपुर' },
    { c: '29-204', n: 'Namobuddha', np: 'नमोबुद्ध' },
    { c: '29-203', n: 'Panchkhal', np: 'पाँचखाल' },
    { c: '29-202', n: 'Paunauti', np: 'पनौती' },
    { c: '29-212', n: 'Roshi', np: 'रोशी' },
    { c: '29-207', n: 'Temal', np: 'तेमाल' },
  ],
  'Khotang': [
    { c: '12-102', n: 'Aiselukharka', np: 'ऐसेलुखर्क' },
    { c: '12-109', n: 'Barahpokhari', np: 'बराहपोखरी' },
    { c: '12-101', n: 'Diktel Rupakot Majhuwagadhi', np: 'दिक्तेल रुपाकोट मझुवागढी' },
    { c: '12-107', n: 'Diprung Chuichumma', np: 'दिप्रुङ चुईचुम्मा' },
    { c: '12-100', n: 'Halesituwachung', np: 'हलेसीतुवाचुङ' },
    { c: '12-104', n: 'Jantedhunga', np: 'जन्तेढुङ्गा' },
    { c: '12-106', n: 'Kepilasgadhi', np: 'केपिलासगढी' },
    { c: '12-105', n: 'Khotehang', np: 'खोटेहाङ' },
    { c: '12-103', n: 'Rawa Besi', np: 'रावा बेसी' },
    { c: '12-108', n: 'Sakela', np: 'साकेला' },
  ],
  'Lalitpur': [
    { c: '28-204', n: 'Bagmati', np: 'वाग्मती' },
    { c: '28-201', n: 'Godawari', np: 'गोदावरी' },
    { c: '28-203', n: 'Konjyosom', np: 'कोन्ज्योसोम' },
    { c: '28-200', n: 'Lalitpur', np: 'ललितपुर' },
    { c: '8-102', n: 'Mahalaxmi', np: 'महालक्ष्मी' },
    { c: '28-205', n: 'Mahankal', np: 'महाङ्काल' },
  ],
  'Lamjung': [
    { c: '38-200', n: 'Besisahar', np: 'बेसीशहर' },
    { c: '38-206', n: 'Dordi', np: 'दोर्दी' },
    { c: '38-205', n: 'Dudhpokhari', np: 'दूधपोखरी' },
    { c: '38-204', n: 'Kwaholasothar', np: 'क्व्होलासोथार' },
    { c: '38-201', n: 'Madhya Nepal', np: 'मध्यनेपाल' },
    { c: '38-207', n: 'Marsyangdi', np: 'मर्स्याङदी' },
    { c: '38-202', n: 'Rainas', np: 'रार्इनास' },
    { c: '38-203', n: 'Sundarbazar', np: 'सुन्दरबजार' },
  ],
  'Mahottari': [
    { c: '16-207', n: 'Aurahi', np: 'औरही' },
    { c: '21-212', n: 'Balawa', np: 'बलवा' },
    { c: '21-201', n: 'Bardibas', np: 'बर्दिबास' },
    { c: '21-211', n: 'Bhangaha', np: 'भँगाहा' },
    { c: '21-203', n: 'Ekdara', np: 'एकडारा' },
    { c: '21-202', n: 'Gaushala', np: 'गौशाला' },
    { c: '21-200', n: 'Jaleshwar', np: 'जलेश्वर' },
    { c: '21-206', n: 'Loharpatti', np: 'लोहरपट्टी' },
    { c: '21-208', n: 'Mahottari', np: 'महोत्तरी' },
    { c: '21-209', n: 'Manara Shisawa', np: 'मनराशिस्वा' },
    { c: '21-210', n: 'Matihani', np: 'मटिहानी' },
    { c: '21-213', n: 'Pipara', np: 'पिपरा' },
    { c: '21-207', n: 'Ramgopalpur', np: 'रामगोपालपुर' },
    { c: '21-205', n: 'Samsi', np: 'साम्सी' },
    { c: '21-204', n: 'Sonama', np: 'सोनमा' },
  ],
  'Makwanpur': [
    { c: '31-205', n: 'Bagmati', np: 'वाग्मती' },
    { c: '31-204', n: 'Bakaiya', np: 'बकैया' },
    { c: '31-206', n: 'Bhimphedi', np: 'भीमफेदी' },
    { c: '31-200', n: 'Hetauda', np: 'हेटौडा' },
    { c: '31-202', n: 'Indrasarowar', np: 'इन्द्रसरोवर' },
    { c: '31-203', n: 'Kailash', np: 'कैलाश' },
    { c: '31-207', n: 'Makawanpurgadhi', np: 'मकवानपुरगढी' },
    { c: '31-208', n: 'Manhari', np: 'मनहरी' },
    { c: '31-209', n: 'Raksirang', np: 'राक्सिराङ्ग' },
    { c: '31-201', n: 'Thaha', np: 'थाहा' },
  ],
  'Manang': [
    { c: '37-203', n: 'Chame', np: 'चामे' },
    { c: '37-202', n: 'Manang Disyang', np: 'मनाङ डिस्याङ' },
    { c: '37-200', n: 'Narpa Bhumi', np: 'नार्पा भूमी' },
    { c: '37-201', n: 'Nason', np: 'नासोँ' },
  ],
  'Morang': [
    { c: '9-101', n: 'Belbari', np: 'बेलवारी' },
    { c: '9-100', n: 'Biratnagar', np: 'विराटनगर' },
    { c: '9-109', n: 'Budi Ganga', np: 'बुढीगंगा' },
    { c: '9-110', n: 'Dhanpalthan', np: 'धनपालथान' },
    { c: '9-111', n: 'Gramthan', np: 'ग्रामथान' },
    { c: '9-112', n: 'Jahada', np: 'जहदा' },
    { c: '9-113', n: 'Kanepokhari', np: 'कानेपोखरी' },
    { c: '9-114', n: 'Katahari', np: 'कटहरी' },
    { c: '9-115', n: 'Kerabari', np: 'केरावारी' },
    { c: '9-102', n: 'Letang Bhogateni', np: 'लेटाङ' },
    { c: '2-105', n: 'Miklajung', np: 'मिक्लाजुङ' },
    { c: '9-103', n: 'Pathari-Shanischare', np: 'पथरी शनिश्चरे' },
    { c: '9-104', n: 'Rangeli', np: 'रंगेली' },
    { c: '9-105', n: 'Ratuwamai', np: 'रतुवामाई' },
    { c: '9-106', n: 'Sunawarshi', np: 'सुनवर्षी' },
    { c: '9-108', n: 'Sundar Haraincha', np: 'सुन्दरहरैंचा' },
    { c: '9-107', n: 'Urlabari', np: 'उर्लाबारी' },
  ],
  'Mugu': [
    { c: '58-200', n: 'Chhayanath', np: 'छायानाथ' },
    { c: '58-203', n: 'Khatyad', np: 'खत्याङ' },
    { c: '58-201', n: 'KumugKarmarong', np: 'कुमुगकार्मारोंग' },
    { c: '58-202', n: 'Soru', np: 'सोरु' },
  ],
  'Mustang': [
    { c: '48-204', n: 'Baragung Muktichhetra', np: 'वारागुङ मुक्तिक्षेत्र' },
    { c: '48-200', n: 'Gharapjhong', np: 'घरपझोङ' },
    { c: '48-202', n: 'Lo-Ghekar Damodarkunda', np: 'लो-घेकर दामोदरकुण्ड' },
    { c: '48-203', n: 'Lomanthang', np: 'लोमन्थाङ' },
    { c: '48-201', n: 'Thasang', np: 'थासाङ' },
  ],
  'Myagdi': [
    { c: '49-201', n: 'Annapurna', np: 'अन्नपूर्ण' },
    { c: '49-200', n: 'Beni', np: 'बेनी' },
    { c: '49-202', n: 'Dhaulagiri', np: 'धवलागिरी' },
    { c: '42-211', n: 'Malika', np: 'मालिका' },
    { c: '49-203', n: 'Mangala', np: 'मंगला' },
    { c: '49-205', n: 'Raghuganga', np: 'रघुगंगा' },
  ],
  'Nawalparasi East': [
    { c: '45-210', n: 'Baudikali', np: 'बौदीकाली' },
    { c: '76-212', n: 'Binayi Triveni', np: 'विनयी त्रिबेणी' },
    { c: '45-211', n: 'Bulingtar', np: 'बुलिङटार' },
    { c: '45-202', n: 'Devchuli', np: 'देवचुली' },
    { c: '45-201', n: 'Gaindakot', np: 'गैंडाकोट' },
    { c: '45-214', n: 'Hupsekot', np: 'हुप्सेकोट' },
    { c: '45-200', n: 'Kawasoti', np: 'कावासोती' },
    { c: '45-204', n: 'Madhyabindu', np: 'मध्यविन्दु' },
  ],
  'Nuwakot': [
    { c: '25-201', n: 'Belkotgadhi', np: 'बेलकोटगढी' },
    { c: '25-200', n: 'Bidur', np: 'विदुर' },
    { c: '25-206', n: 'Dupcheshwar', np: 'दुप्चेश्वर' },
    { c: '25-202', n: 'Kakani', np: 'ककनी' },
    { c: '25-203', n: 'Kispang', np: 'किस्पाङ' },
    { c: '13-106', n: 'Likhu', np: 'लिखु' },
    { c: '25-209', n: 'Myagang', np: 'म्यागङ' },
    { c: '25-207', n: 'Panchakanya', np: 'पञ्चकन्या' },
    { c: '25-210', n: 'Shivapuri', np: 'शिवपुरी' },
    { c: '25-211', n: 'Suryagadhi', np: 'सूर्यगढी' },
    { c: '25-204', n: 'Tadi', np: 'तादी' },
    { c: '25-205', n: 'Tarkeshwar', np: 'तारकेश्वर' },
  ],
  'Okhaldhunga': [
    { c: '13-102', n: 'Champadevi', np: 'चम्पादेवी' },
    { c: '13-103', n: 'Chishankhugadhi', np: 'चिशंखुगढी' },
    { c: '13-101', n: 'Khijidemba', np: 'खिजीदेम्वा' },
    { c: '13-106', n: 'Likhu', np: 'लिखु' },
    { c: '13-104', n: 'Manebhanjyang', np: 'मानेभञ्ज्याङ' },
    { c: '13-105', n: 'Molung', np: 'मोलुङ' },
    { c: '13-100', n: 'Siddhicharan', np: 'सिद्धिचरण' },
    { c: '13-107', n: 'Sunkoshi', np: 'सुनकोशी' },
  ],
  'Palpa': [
    { c: '43-207', n: 'Baganaskali', np: 'बगनासकाली' },
    { c: '43-205', n: 'Mathagadhi', np: 'माथागढी' },
    { c: '43-202', n: 'Nisdi', np: 'निस्दि' },
    { c: '43-203', n: 'Purbakhola', np: 'पूर्वखोला' },
    { c: '43-209', n: 'Rainadevi Chhahara', np: 'रैनादेवी छहरा' },
    { c: '43-204', n: 'Rambha', np: 'रम्भा' },
    { c: '43-200', n: 'Rampur', np: 'रामपुर' },
    { c: '43-208', n: 'Ribdikot', np: 'रिब्दिकोट' },
    { c: '43-201', n: 'Tansen', np: 'तानसेन' },
    { c: '43-206', n: 'Tinau', np: 'तिनाउ' },
  ],
  'Panchthar': [
    { c: '2-103', n: 'Hilihang', np: 'हिलिहाङ' },
    { c: '2-104', n: 'Kummayak', np: 'कुम्मायक' },
    { c: '2-105', n: 'Miklajung', np: 'मिक्लाजुङ' },
    { c: '2-101', n: 'Phalelung', np: 'फालेलुङ' },
    { c: '2-102', n: 'Phalgunanda', np: 'फाल्गुनन्द' },
    { c: '2-100', n: 'Phidim', np: 'फिदिम' },
    { c: '2-106', n: 'Tumbewa', np: 'तुम्वेवा' },
    { c: '2-107', n: 'Yangwarak', np: 'याङवरक' },
  ],
  'Parasi': [
    { c: '45-203', n: 'Bardghat', np: 'बर्दघाट' },
    { c: '45-208', n: 'Palhi Nandan', np: 'पाल्हिनन्दन' },
    { c: '45-209', n: 'Pratappur', np: 'प्रतापपुर' },
    { c: '45-205', n: 'Ramgram', np: 'रामग्राम' },
    { c: '45-213', n: 'Sarawal', np: 'सरावल' },
    { c: '45-206', n: 'Sunwal', np: 'सुनवल' },
    { c: '45-207', n: 'Susta', np: 'सुस्ता' },
  ],
  'Parbat': [
    { c: '51-206', n: 'Bihadi', np: 'विहादी' },
    { c: '51-202', n: 'Jaljala', np: 'जलजला' },
    { c: '51-200', n: 'Kushma', np: 'कुश्मा' },
    { c: '51-204', n: 'Mahashila', np: 'महाशिला' },
    { c: '51-205', n: 'Modi', np: 'मोदी' },
    { c: '51-203', n: 'Painyu', np: 'पैयूं' },
    { c: '51-201', n: 'Phalewas', np: 'फलेवास' },
  ],
  'Parsa': [
    { c: '34-108', n: 'Bahudarmai', np: 'बहुदरमाई' },
    { c: '34-107', n: 'Bindabasini', np: 'बिन्दबासिनी' },
    { c: '34-100', n: 'Birganj', np: 'बिरगंज' },
    { c: '34-105', n: 'Chhipaharmai', np: 'छिपहरमाई' },
    { c: '34-104', n: 'Dhobini', np: 'धोबीनी' },
    { c: '34-103', n: 'Jagarnathpur', np: 'जगरनाथपुर' },
    { c: '34-4946', n: 'Jira Bhavani', np: 'जिराभवानी' },
    { c: '34-4945', n: 'Kalikamai', np: 'कालिकामाई' },
    { c: '34-106', n: 'Pakaha Mainapur', np: 'पकाहा मैनापुर' },
    { c: '34-110', n: 'Parsagadhi', np: 'पर्सागढी' },
    { c: '34-112', n: 'Paterwa Sugauli', np: 'पटेर्वा सुगौली' },
    { c: '34-101', n: 'Pokhariya', np: 'पोखरिया' },
    { c: '34-111', n: 'Sakhuwa Prasauni', np: 'सखुवा प्रसौनी' },
    { c: '34-102', n: 'Thori', np: 'ठोरी' },
  ],
  'Pyuthan': [
    { c: '54-208', n: 'Airawati', np: 'ऐरावती' },
    { c: '54-202', n: 'Gaumukhi', np: 'गौमुखी' },
    { c: '54-207', n: 'Jhimaruk', np: 'झिमरुक' },
    { c: '54-205', n: 'Mallarani', np: 'मल्लरानी' },
    { c: '54-203', n: 'Mandavi', np: 'माण्डवी' },
    { c: '54-206', n: 'Naubahini', np: 'नौबहिनी' },
    { c: '54-200', n: 'Pyuthan', np: 'प्यूठान' },
    { c: '54-204', n: 'Sarumarani', np: 'सरुमारानी' },
    { c: '54-201', n: 'Swargadwari', np: 'स्वर्गद्वारी' },
  ],
  'Ramechhap': [
    { c: '18-205', n: 'Doramba', np: 'दोरम्बा' },
    { c: '18-204', n: 'Gokulganga', np: 'गोकुलगङ्गा' },
    { c: '18-203', n: 'Khandadevi', np: 'खाँडादेवी' },
    { c: '18-206', n: 'Likhu Tamakoshi', np: 'लिखु तामाकोशी' },
    { c: '18-200', n: 'Manthali', np: 'मन्थली' },
    { c: '18-201', n: 'Ramechhap', np: 'रामेछाप' },
    { c: '18-207', n: 'Sunapati', np: 'सुनापती' },
    { c: '18-202', n: 'Umakunda', np: 'उमाकुण्ड' },
  ],
  'Rasuwa': [
    { c: '23-204', n: 'Aamachodingmo', np: 'आमाछोदिङमो' },
    { c: '23-202', n: 'Gosaikund', np: 'गोसाईकुण्ड' },
    { c: '23-201', n: 'Kalika', np: 'कालिका' },
    { c: '23-203', n: 'Naukunda', np: 'नौकुण्ड' },
    { c: '23-200', n: 'Uttargaya', np: 'उत्तरगया' },
  ],
  'Rautahat': [
    { c: '32-103', n: 'Baudhimai', np: 'बौधीमाई' },
    { c: '32-104', n: 'Brindaban', np: 'बृन्दावन' },
    { c: '32-100', n: 'Chandrapur', np: 'चन्द्रपुर' },
    { c: '32-105', n: 'Dewahi Gonahi', np: 'देवाही गोनाही' },
    { c: '32-106', n: 'Durga Bhagawati', np: 'दुर्गा भगवती' },
    { c: '32-107', n: 'Gadhimai', np: 'गढीमाई' },
    { c: '32-101', n: 'Garuda', np: 'गरुडा' },
    { c: '32-102', n: 'Gaur', np: 'गौर' },
    { c: '32-108', n: 'Gujara', np: 'गुजरा' },
    { c: '32-113', n: 'Ishnath', np: 'ईशनाथ' },
    { c: '32-109', n: 'Katahariya', np: 'कटहरीया' },
    { c: '32-110', n: 'Madhav Narayan', np: 'माधव नारायण' },
    { c: '32-111', n: 'Maulapur', np: 'मौलापुर' },
    { c: '32-114', n: 'Paroha', np: 'परोहा' },
    { c: '32-112', n: 'Phatuwa Bijayapur', np: 'फतुवा विजयपुर' },
    { c: '32-4942', n: 'Rajdevi', np: 'राजदेवी' },
    { c: '32-115', n: 'Rajpur', np: 'राजपुर' },
    { c: '32-4943', n: 'Yamunamai', np: 'यमुनामाई' },
  ],
  'Rolpa': [
    { c: '53-206', n: 'Gangadev', np: 'गंगादेव' },
    { c: '53-205', n: 'Lungri', np: 'लुङ्ग्री' },
    { c: '35-203', n: 'Madi', np: 'माडी' },
    { c: '53-202', n: 'Paribartan', np: 'परिवर्तन' },
    { c: '53-200', n: 'Rolpa', np: 'रोल्पा' },
    { c: '53-204', n: 'Runtigadhi', np: 'रुन्टीगढी' },
    { c: '53-207', n: 'Sunchhahari', np: 'सुनछहरी' },
    { c: '53-208', n: 'Sunil Smriti', np: 'सुनिल स्मृति' },
    { c: '53-209', n: 'Thawang', np: 'थबाङ' },
    { c: '52-207', n: 'Triveni', np: 'त्रिवेणी' },
  ],
  'Rupandehi': [
    { c: '46-200', n: 'Butwal', np: 'बुटवल' },
    { c: '46-204', n: 'Devdaha', np: 'देवदह' },
    { c: '46-208', n: 'Gaidhawa', np: 'गैडहवा' },
    { c: '46-209', n: 'Kanchan', np: 'कन्चन' },
    { c: '46-210', n: 'Kotahimai', np: 'कोटहीमाई' },
    { c: '46-201', n: 'Lumbini Sanskritik', np: 'लुम्बिनी सांस्कृतिक' },
    { c: '46-211', n: 'Marchawari', np: 'मर्चवारी' },
    { c: '46-212', n: 'Mayadevi', np: 'मायादेवी' },
    { c: '46-213', n: 'Om Satiya', np: 'ओमसतिया' },
    { c: '46-214', n: 'Rohini', np: 'रोहिणी' },
    { c: '46-205', n: 'Sainamaina', np: 'सैनामैना' },
    { c: '46-203', n: 'Sammarimai', np: 'सम्मरीमाई' },
    { c: '46-215', n: 'Shuddhodhan', np: 'शुद्धोधन' },
    { c: '46-202', n: 'Siddharthanagar', np: 'सिद्धार्थनगर' },
    { c: '46-207', n: 'Siyari', np: 'सियारी' },
    { c: '46-206', n: 'Tilottama', np: 'तिलोत्तमा' },
  ],
  'Salyan': [
    { c: '55-201', n: 'Bagchaur', np: 'बागचौर' },
    { c: '55-202', n: 'Bangad', np: 'बनगाड' },
    { c: '55-206', n: 'Chhatreshwari', np: 'छत्रेश्वरी' },
    { c: '55-209', n: 'Darma', np: 'दार्मा' },
    { c: '55-203', n: 'Kalimati', np: 'कालीमाटी' },
    { c: '55-205', n: 'Kapurkot', np: 'कपुरकोट' },
    { c: '55-208', n: 'Kumakh', np: 'कुमाख' },
    { c: '55-200', n: 'Sarada', np: 'सारदा' },
    { c: '55-207', n: 'Siddha Kumakh', np: 'सिद्ध कुमाख' },
    { c: '52-207', n: 'Triveni', np: 'त्रिवेणी' },
  ],
  'Sankhuwasabha': [
    { c: '5-105', n: 'Bhot Khola', np: 'भोटखोला' },
    { c: '5-100', n: 'Chainpur', np: 'चैनपुर' },
    { c: '5-106', n: 'Chichila', np: 'चिचिला' },
    { c: '5-101', n: 'Dharmadevi', np: 'धर्मदेवी' },
    { c: '5-102', n: 'Khandbari', np: 'खादँवारी' },
    { c: '5-103', n: 'Madi', np: 'मादी' },
    { c: '5-107', n: 'Makalu', np: 'मकालु' },
    { c: '5-104', n: 'Panchkhapan', np: 'पाँचखपन' },
    { c: '5-108', n: 'Sabhapokhari', np: 'सभापोखरी' },
    { c: '5-109', n: 'Silichong', np: 'सिलीचोङ' },
  ],
  'Saptari': [
    { c: '15-208', n: 'Aagnisaira Krishnasawaran', np: 'अग्निसाइर कृष्णासवरन' },
    { c: '15-4937', n: 'Balan-Bihul', np: 'बलान-विहुल' },
    { c: '15-216', n: 'Bishnupur', np: 'बिष्णुपुर' },
    { c: '15-203', n: 'Bodebarsain', np: 'बोदेबरसाइन' },
    { c: '15-209', n: 'Chhinnamasta', np: 'छिन्नमस्ता' },
    { c: '15-202', n: 'Dakneshwari', np: 'डाक्नेश्वरी' },
    { c: '15-207', n: 'Hanumannagar Kankalini', np: 'हनुमाननगर कंकालिनी' },
    { c: '15-201', n: 'Kanchanrup', np: 'कञ्चनरूप' },
    { c: '15-204', n: 'Khadak', np: 'खडक' },
    { c: '15-210', n: 'Mahadeva', np: 'महादेवा' },
    { c: '15-200', n: 'Rajbiraj', np: 'राजबिराज' },
    { c: '15-215', n: 'Rajgadh', np: 'राजगढ' },
    { c: '15-214', n: 'Rupani', np: 'रुपनी' },
    { c: '15-211', n: 'Saptakoshi', np: 'सप्तकोशी' },
    { c: '15-205', n: 'Shambhunath', np: 'शम्भुनाथ' },
    { c: '15-206', n: 'Surunga', np: 'सुरुङ्‍गा' },
    { c: '15-213', n: 'Tilathi Koiladi', np: 'तिलाठी कोईलाडी' },
    { c: '15-212', n: 'Tirhut', np: 'तिरहुत' },
  ],
  'Sarlahi': [
    { c: '22-209', n: 'Bagmati', np: 'बागमती' },
    { c: '22-206', n: 'Balara', np: 'बलरा' },
    { c: '22-205', n: 'Barahathwa', np: 'बरहथवा' },
    { c: '22-4939', n: 'Basbariya', np: 'बसबरिया' },
    { c: '22-216', n: 'Bishnu', np: 'विष्णु' },
    { c: '22-214', n: 'Bramhapuri', np: 'ब्रह्मपुरी' },
    { c: '22-211', n: 'Chakraghatta', np: 'चक्रघट्टा' },
    { c: '22-212', n: 'Chandranagar', np: 'चन्द्रनगर' },
    { c: '22-213', n: 'Dhankaul', np: 'धनकौल' },
    { c: '22-207', n: 'Godaita', np: 'गोडैटा' },
    { c: '22-202', n: 'Haripur', np: 'हरिपुर' },
    { c: '22-203', n: 'Haripurwa', np: 'हरिपुर्वा' },
    { c: '22-204', n: 'Hariwan', np: 'हरिवन' },
    { c: '22-200', n: 'Ishworpur', np: 'ईश्वरपुर' },
    { c: '22-210', n: 'Kabilasi', np: 'कविलासी' },
    { c: '22-4940', n: 'Kaudena', np: 'कौडेना' },
    { c: '22-201', n: 'Lalbandi', np: 'लालबन्दी' },
    { c: '22-208', n: 'Malangwa', np: 'मलंगवा' },
    { c: '22-4941', n: 'Parsa', np: 'पर्सा' },
    { c: '22-215', n: 'Ramnagar', np: 'रामनगर' },
  ],
  'Sindhuli': [
    { c: '19-201', n: 'Dudhauli', np: 'दुधौली' },
    { c: '19-203', n: 'Ghyanglekh', np: 'घ्याङलेख' },
    { c: '19-202', n: 'Golanjor', np: 'गोलन्जोर' },
    { c: '19-208', n: 'Hariharpurgadhi', np: 'हरिहरपुरगढी' },
    { c: '19-200', n: 'Kamalamai', np: 'कमलामाई' },
    { c: '19-206', n: 'Marin', np: 'मरिण' },
    { c: '19-205', n: 'Phikkal', np: 'फिक्कल' },
    { c: '13-107', n: 'Sunkoshi', np: 'सुनकोशी' },
    { c: '19-204', n: 'Tinpatan', np: 'तीनपाटन' },
  ],
  'Sindhupalchok': [
    { c: '30-206', n: 'Balephi', np: 'बलेफी' },
    { c: '30-201', n: 'Barhabise', np: 'वाह्रविसे' },
    { c: '30-207', n: 'Bhotekoshi', np: 'भोटेकोशी' },
    { c: '30-200', n: 'Chautara Sangachokgadhi', np: 'चौतारा साँगाचोकगढी' },
    { c: '30-210', n: 'Helambu', np: 'हेलम्बु' },
    { c: '30-203', n: 'Indrawati', np: 'र्इन्द्रावती' },
    { c: '30-204', n: 'Jugal', np: 'जुगल' },
    { c: '30-208', n: 'Lisankhu Pakhar', np: 'लिसंखु पाखर' },
    { c: '30-202', n: 'Melamchi', np: 'मेलम्ची' },
    { c: '30-205', n: 'Panchpokhari Thangpal', np: 'पाँचपोखरी थाङपाल' },
    { c: '13-107', n: 'Sunkoshi', np: 'सुनकोशी' },
    { c: '24-212', n: 'Tripura Sundari', np: 'त्रिपुरासुन्दरी' },
  ],
  'Siraha': [
    { c: '16-207', n: 'Aaurahi', np: 'औरही' },
    { c: '16-215', n: 'Arnama', np: 'अर्नमा' },
    { c: '16-211', n: 'Bariyarpatti', np: 'बरियारपट्टी' },
    { c: '16-206', n: 'Bhagawanpur', np: 'भगवानपुर' },
    { c: '16-208', n: 'Bishnupur', np: 'बिष्णुपुर' },
    { c: '16-201', n: 'Dhangadimai', np: 'धनगढीमाई' },
    { c: '16-203', n: 'Golbazar', np: 'गोलबजार' },
    { c: '16-205', n: 'Kalyanpur', np: 'कल्याणपुर' },
    { c: '16-210', n: 'Karjanha', np: 'कर्जन्हा' },
    { c: '16-200', n: 'Lahan', np: 'लहान' },
    { c: '16-212', n: 'Laksmipur Patari', np: 'लक्ष्मीपुर पतारी' },
    { c: '16-204', n: 'Mirchaiya', np: 'मिर्चैया' },
    { c: '16-213', n: 'Naraha', np: 'नरहा' },
    { c: '16-216', n: 'Nawarajpur', np: 'नवराजपुर' },
    { c: '16-214', n: 'Sakhuwanankarkatti', np: 'सखुवानान्कारकट्टी' },
    { c: '16-202', n: 'Siraha', np: 'सिरहा' },
    { c: '16-209', n: 'Sukhipur', np: 'सुखीपुर' },
  ],
  'Solukhumbu': [
    { c: '11-102', n: 'Khumbu Pasang Lhamu', np: 'खुम्बु पासाङल्हमु' },
    { c: '11-106', n: 'Likhu Pike', np: 'लिखु पिके' },
    { c: '11-105', n: 'Maha Kulung', np: 'महाकुलुङ' },
    { c: '11-101', n: 'Mapya Dudhkoshi', np: 'माप्य दुधकोशी' },
    { c: '11-104', n: 'Necha Salyan', np: 'नेचासल्यान' },
    { c: '11-100', n: 'Solu Dudhkunda', np: 'सोलुदुधकुण्ड' },
    { c: '11-107', n: 'Sotang', np: 'सोताङ' },
    { c: '11-103', n: 'Thulung Dudhakoshi', np: 'थुलुङ दुधकोशी' },
  ],
  'Sunsari': [
    { c: '10-105', n: 'Barahachhetra', np: 'बराहक्षेत्र' },
    { c: '10-109', n: 'Barju', np: 'बर्जु' },
    { c: '10-110', n: 'Bhokraha Narsinha', np: 'भोक्राहा नरसिंह' },
    { c: '10-106', n: 'Dewanganj', np: 'देवानगन्ज' },
    { c: '10-101', n: 'Dharan', np: 'धरान' },
    { c: '10-103', n: 'Duhabi', np: 'दुहवी' },
    { c: '10-108', n: 'Gadhi', np: 'गढी' },
    { c: '10-111', n: 'Harinagar', np: 'हरिनगर' },
    { c: '10-102', n: 'Inaruwa', np: 'ईनरूवा' },
    { c: '10-100', n: 'Itahari', np: 'ईटहरी' },
    { c: '10-107', n: 'Koshi', np: 'कोशी' },
    { c: '10-104', n: 'Ramdhuni', np: 'रामधुनी' },
  ],
  'Surkhet': [
    { c: '64-206', n: 'Barahatal', np: 'बराहताल' },
    { c: '64-201', n: 'Bheriganga', np: 'भेरिगंगा' },
    { c: '64-200', n: 'Birendranagar', np: 'वीरेन्द्रनगर' },
    { c: '64-205', n: 'Chaukune', np: 'चौकुने' },
    { c: '64-207', n: 'Chingad', np: 'चिङ्गाड' },
    { c: '64-202', n: 'Gurbhakot', np: 'गुर्भाकोट' },
    { c: '64-204', n: 'Lekbeshi', np: 'लेकबेशी' },
    { c: '64-203', n: 'Panchapuri', np: 'पञ्चपुरी' },
    { c: '64-208', n: 'Simta', np: 'सिम्ता' },
  ],
  'Syangja': [
    { c: '41-206', n: 'Aandhikhola', np: 'आँधीखोला' },
    { c: '41-205', n: 'Arjun Chaupari', np: 'अर्जुनचौपारी' },
    { c: '41-203', n: 'Bhirkot', np: 'भीरकोट' },
    { c: '41-209', n: 'Biruwa', np: 'बिरुवा' },
    { c: '41-201', n: 'Chapkot', np: 'चापकोट' },
    { c: '41-200', n: 'Galyang', np: 'गल्याङ' },
    { c: '41-210', n: 'Harinas', np: 'हरिनास' },
    { c: '41-207', n: 'Kaligandaki', np: 'कालीगण्डकी' },
    { c: '41-208', n: 'Phedikhola', np: 'फेदीखोला' },
    { c: '41-202', n: 'Putalibazar', np: 'पुतलीबजार' },
    { c: '41-204', n: 'Waling', np: 'वालिङ' },
  ],
  'Tanahun': [
    { c: '40-204', n: 'Aanbu Khaireni', np: 'आँबुखैरेनी' },
    { c: '40-209', n: 'Bandipur', np: 'बन्दिपुर' },
    { c: '40-200', n: 'Bhanu', np: 'भानु' },
    { c: '40-201', n: 'Bhimad', np: 'भिमाद' },
    { c: '40-207', n: 'Devghat', np: 'देवघाट' },
    { c: '40-206', n: 'Ghiring', np: 'घिरिङ' },
    { c: '40-208', n: 'Myagde', np: 'म्याग्दे' },
    { c: '40-205', n: 'Rishing', np: 'ऋषिङ' },
    { c: '40-203', n: 'Shuklagandaki', np: 'शुक्लागण्डकी' },
    { c: '40-202', n: 'Vyas', np: 'व्यास' },
  ],
  'Taplejung': [
    { c: '1-101', n: 'Aathrai Triveni', np: 'आठराई त्रिवेणी' },
    { c: '1-106', n: 'Maiwa Khola', np: 'मैवाखोला' },
    { c: '1-105', n: 'Meringden', np: 'मेरिङदेन' },
    { c: '1-104', n: 'Mikwa Khola', np: 'मिक्वाखोला' },
    { c: '1-107', n: 'Pathibhara Yangwarak', np: 'पाथीभरा याङवरक' },
    { c: '1-103', n: 'Phaktanglung', np: 'फक्ताङलुङ' },
    { c: '1-102', n: 'Sidingwa', np: 'सिदिङ्वा' },
    { c: '1-108', n: 'Sirijangha', np: 'सिरीजङ्घा' },
    { c: '1-100', n: 'Taplejung(Phungling)', np: 'फुङलिङ' },
  ],
  'Terhathum': [
    { c: '6-102', n: 'Aathrai', np: 'आठराई' },
    { c: '6-103', n: 'Chhathar', np: 'छथर' },
    { c: '6-101', n: 'Laligurans', np: 'लालीगुराँस' },
    { c: '6-105', n: 'Menchayayem', np: 'मेन्छयायेम' },
    { c: '6-100', n: 'Myanglung', np: 'म्याङलुङ' },
    { c: '6-104', n: 'Phedap', np: 'फेदाप' },
  ],
  'Udayapur': [
    { c: '14-103', n: 'Belaka', np: 'वेलका' },
    { c: '14-101', n: 'Chaudandigadhi', np: 'चौदण्डीगढी' },
    { c: '14-100', n: 'Katari', np: 'कटारी' },
    { c: '14-107', n: 'Limchungbung', np: 'लिम्चुङ्बुङ' },
    { c: '14-106', n: 'Rautamai', np: 'रौतामाई' },
    { c: '14-105', n: 'Tapli', np: 'ताप्ली' },
    { c: '14-102', n: 'Triyuga', np: 'त्रियुगा' },
    { c: '14-104', n: 'Udayapurgadhi', np: 'उदयपुरगढी' },
  ],
  'Western Rukum': [
    { c: '52-202', n: 'Aathabiskot', np: 'आठबिसकोट' },
    { c: '52-206', n: 'Banphikot', np: 'बाँफिकोट' },
    { c: '52-201', n: 'Chaurjahari', np: 'चौरजहारी' },
    { c: '42-200', n: 'Musikot', np: 'मुसिकोट' },
    { c: '52-208', n: 'Sani Bheri', np: 'सानीभेरी' },
    { c: '52-207', n: 'Triveni', np: 'त्रिवेणी' },
  ],
};


const SAMPLE_USERS = [

  { id: 'USR9', name: 'Admin User', email: 'admin@agrinepal.com', phone: '9841000000', password: 'admin123', role: 'admin', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin', verified: true, suspended: false, createdAt: '2024-01-01T08:00:00Z', emailVerified: true, phoneVerified: true, mobileVerified: true, verificationMethod: 'email' }
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
  { id: 'FAQ3', question: 'Is Ekrishi Nepal free to use?', answer: 'Yes! Basic registration and job posting are completely free. Workers can also create profiles and apply for jobs at no cost.' },
  { id: 'FAQ4', question: 'How does the rating system work?', answer: 'After a job is completed, both the farmer and worker can rate each other on a 1-5 scale. This builds trust and reputation on the platform.' },
  { id: 'FAQ5', question: 'How do payments work?', answer: 'Ekrishi Nepal does not handle payments directly. Payment arrangements are made between the farmer and worker as per the agreed terms.' },
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
  { id: 'seller', name: 'Seller', nameNe: 'बिक्रेता', icon: '🏷️', description: 'Sell agricultural products on marketplace' },
  { id: 'buyer', name: 'Buyer', nameNe: 'किन्ने व्यक्ति', icon: '🛒', description: 'Buy agricultural products' },
  { id: 'equipment_owner', name: 'Equipment Owner', nameNe: 'उपकरण स्वामी', icon: '🚜', description: 'Rent/sell farm equipment' },
  { id: 'transport_provider', name: 'Transport Provider', nameNe: 'यातायात सेवा', icon: '🚛', description: 'Provide farm transport services' },
  { id: 'expert', name: 'Agriculture Expert', nameNe: 'कृषि विशेषज्ञ', icon: '🎓', description: 'Provide consulting & advice' },
  { id: 'cooperative', name: 'Cooperative Member', nameNe: 'सहकारी सदस्य', icon: '🏛️', description: 'Represent a cooperative' }
];

// ══════════════════════════════════════════════════════════
// ECOSYSTEM SAMPLE DATA
// ══════════════════════════════════════════════════════════

const SAMPLE_FARM_PROFILES = [
  {
    id: 'FARMP1', userId: 'USR001', name: 'Shrestha Organic Farm', district: 'Chitwan',
    areaInRopani: 5.5, soilType: 'Loamy', irrigation: 'Canal', mainCrops: ['Rice', 'Vegetables', 'Spices'],
    certifications: ['Organic Certified'], farmPhotos: [], establishedYear: 2018,
    description: 'Family-run organic farm specializing in seasonal vegetables and spices.',
    latitude: 27.55, longitude: 84.35, createdAt: '2025-06-01T06:00:00.000Z'
  },
  {
    id: 'FARMP2', userId: 'USR003', name: 'Tamang Tea Estate', district: 'Ilam',
    areaInRopani: 12, soilType: 'Clay', irrigation: 'Rainfed', mainCrops: ['Tea', 'Cardamom'],
    certifications: [], farmPhotos: [], establishedYear: 2005,
    description: 'Premium tea estate producing orthodox and CTC teas.',
    latitude: 26.92, longitude: 87.93, createdAt: '2025-06-05T06:00:00.000Z'
  },
  {
    id: 'FARMP3', userId: 'USR006', name: 'Rai Grain Farm', district: 'Bara',
    areaInRopani: 8, soilType: 'Sandy Loam', irrigation: 'Tube Well', mainCrops: ['Rice', 'Wheat', 'Maize'],
    certifications: [], farmPhotos: [], establishedYear: 2012,
    description: 'Large-scale grain production farm with modern storage facilities.',
    latitude: 27.02, longitude: 84.92, createdAt: '2025-06-10T06:00:00.000Z'
  }
];

const SAMPLE_PRE_HARVEST_BOOKINGS = [
  {
    id: 'PHB1', sellerId: 'USR001', crop: 'Tomato', variety: 'Local Red',
    expectedQuantity: 500, unit: 'kg', pricePerUnit: 80, currency: 'NPR',
    harvestDate: '2026-08-15', status: 'open', bookings: [],
    description: 'Fresh organic tomatoes expected from mid-August.',
    district: 'Chitwan', farmName: 'Shrestha Organic Farm',
    createdAt: '2025-07-01T06:00:00.000Z'
  },
  {
    id: 'PHB2', sellerId: 'USR003', crop: 'Green Tea Leaves', variety: 'First Flush',
    expectedQuantity: 200, unit: 'kg', pricePerUnit: 400, currency: 'NPR',
    harvestDate: '2026-04-01', status: 'partially-booked',
    bookings: [{ buyerId: 'USR002', quantity: 50, bookedAt: '2025-07-10T06:00:00.000Z', status: 'reserved' }],
    description: 'Premium first flush tea leaves from high altitude.',
    district: 'Ilam', farmName: 'Tamang Tea Estate',
    createdAt: '2025-07-10T06:00:00.000Z'
  },
  {
    id: 'PHB3', sellerId: 'USR006', crop: 'Rice (Basmati)', variety: 'Tuna Basmati',
    expectedQuantity: 1000, unit: 'kg', pricePerUnit: 65, currency: 'NPR',
    harvestDate: '2026-10-20', status: 'open', bookings: [],
    description: 'High-quality Tuna Basmati rice, expected harvest October.',
    district: 'Bara', farmName: 'Rai Grain Farm',
    createdAt: '2025-07-15T06:00:00.000Z'
  }
];

const SAMPLE_EQUIPMENT_RENTALS = [
  {
    id: 'EQP1', ownerId: 'USR001', name: 'Mahindra 575 Tractor', type: 'tractor',
    brand: 'Mahindra', model: '575 DI', year: 2022, condition: 'Good',
    hourlyRate: 800, dailyRate: 5000, currency: 'NPR', available: true,
    district: 'Chitwan', description: '45HP tractor with plough attachment.',
    photos: [], createdAt: '2025-06-15T06:00:00.000Z'
  },
  {
    id: 'EQP2', ownerId: 'USR006', name: 'Power Tiller', type: 'tiller',
    brand: 'Kubota', model: 'NE-6', year: 2023, condition: 'Excellent',
    hourlyRate: 400, dailyRate: 2500, currency: 'NPR', available: true,
    district: 'Bara', description: 'Efficient power tiller for small to medium fields.',
    photos: [], createdAt: '2025-06-20T06:00:00.000Z'
  },
  {
    id: 'EQP3', ownerId: 'USR001', name: 'Sprayer Pump', type: 'sprayer',
    brand: 'Stihl', model: 'SG 31', year: 2024, condition: 'Excellent',
    hourlyRate: 150, dailyRate: 800, currency: 'NPR', available: true,
    district: 'Chitwan', description: 'Battery-powered sprayer pump for pesticides.',
    photos: [], createdAt: '2025-07-01T06:00:00.000Z'
  }
];

const SAMPLE_TRANSPORT_SERVICES = [
  {
    id: 'TRS1', providerId: 'USR008', vehicleType: 'Tempo', vehicleName: 'Bajaj RE Tempo',
    capacity: '1.5 tons', hourlyRate: 500, perKmRate: 25, currency: 'NPR',
    district: 'Chitwan', available: true,
    route: 'Chitwan → Narayangarh → Hetauda',
    description: 'Covered tempo suitable for vegetable and grain transport.',
    photos: [], createdAt: '2025-06-25T06:00:00.000Z'
  },
  {
    id: 'TRS2', providerId: 'USR010', vehicleType: 'Truck', vehicleName: 'Tata 407',
    capacity: '5 tons', hourlyRate: 1200, perKmRate: 45, currency: 'NPR',
    district: 'Kathmandu', available: true,
    route: 'Kathmandu → Bhaktapur → Dolakha',
    description: 'Medium truck for bulk agricultural product transport.',
    photos: [], createdAt: '2025-07-01T06:00:00.000Z'
  }
];
