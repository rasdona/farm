const Auth = {
  currentUser: null,

  init() {
    const uid = localStorage.getItem('agri_currentUser');
    if (uid) {
      this.currentUser = DB.getUserById(uid);
      if (!this.currentUser || this.currentUser.suspended) {
        this.logout();
        return null;
      }
    }
    return this.currentUser;
  },

  async login(identifier, password, options = {}) {
    return await AuthSystem.login(identifier, password, options);
  },

  register(data) {
    return AuthSystem.register(data);
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('agri_currentUser');
    localStorage.removeItem(AuthSystem.SESSION_KEY);
    window.location.href = 'index.html';
  },

  isLoggedIn() { return !!this.currentUser; },

  isFarmer() { return this.currentUser?.role === 'farmer' || (this.currentUser?.roles || []).includes('farmer'); },
  isWorker() { return this.currentUser?.role === 'worker' || (this.currentUser?.roles || []).includes('worker'); },
  isAdmin() { return this.currentUser?.role === 'admin'; },
  isBuyer() { return (this.currentUser?.roles || []).includes('buyer'); },
  isEquipmentOwner() { return (this.currentUser?.roles || []).includes('equipment_owner'); },
  isExpert() { return (this.currentUser?.roles || []).includes('expert'); },
  isCooperative() { return (this.currentUser?.roles || []).includes('cooperative'); },

  hasRole(role) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return (this.currentUser.roles || [this.currentUser.role] || []).includes(role);
  },

  getUserRoles() { return this.currentUser ? (this.currentUser.roles || [this.currentUser.role]) : []; },

  updateProfile(data) {
    if (!this.currentUser) return false;
    const updated = DB.updateUser(this.currentUser.id, data);
    if (updated) { this.currentUser = updated; return true; }
    return false;
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      Utils.toast('कृपया लगइन गर्नुहोस् / Please log in to continue.', 'warning');
      setTimeout(() => { window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href); }, 500);
      return false;
    }
    return true;
  },

  requireProfilePhoto() {
    if (!this.requireAuth()) return false;
    if (this.currentUser.role === 'admin') return true;
    if (AuthSystem.requiresPhotoUpload(this.currentUser)) {
      Utils.toast('कृपया प्रोफाइल फोटो अपलोड गर्नुहोस् / Please upload a profile photo to continue.', 'warning');
      setTimeout(() => { window.location.href = 'photo-gate.html?redirect=' + encodeURIComponent(window.location.href); }, 500);
      return false;
    }
    return true;
  },

  hasUploadedPhoto() {
    return AuthSystem.hasUploadedPhoto(this.currentUser);
  },

  getProfilePhoto() {
    if (!this.currentUser) return '';
    return this.currentUser.profilePhotoUrl || this.currentUser.avatar || '';
  },

  requireRole(role) {
    if (!this.requireAuth()) return false;
    if (this.currentUser.role !== 'admin' && !this.hasRole(role)) {
      Utils.toast('तपाईंसँग यो पृष्ठ हेर्ने अनुमति छैन / You do not have permission to access this page.', 'error');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
      return false;
    }
    return true;
  },

  getDashboardUrl() {
    if (!this.isLoggedIn()) return 'login.html';
    if (this.currentUser.role === 'admin') return 'admin.html';
    if (this.hasRole('farmer')) return 'dashboard-farmer.html';
    if (this.hasRole('worker')) return 'dashboard-worker.html';
    return 'index.html';
  },

  getProfileCompletion() { return AuthSystem.getProfileCompletion(this.currentUser); }
};