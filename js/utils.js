const Utils = {
  $(sel, ctx = document) { return ctx.querySelector(sel); },
  $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; },

  formatTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  formatDateShort(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  formatCurrency(amount) {
    return 'NPR ' + Number(amount).toLocaleString();
  },

  debounce(fn, ms = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  throttle(fn, ms = 300) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  },

  generateStars(rating, max = 5) {
    let html = '';
    for (let i = 1; i <= max; i++) {
      html += `<span class="star ${i <= Math.round(rating) ? 'filled' : ''}">★</span>`;
    }
    return html;
  },

  ratingHTML(rating, count = null) {
    return `<div class="rating">${this.generateStars(rating)}<span class="rating-value">${rating}</span>${count !== null ? `<span class="rating-count">(${count})</span>` : ''}</div>`;
  },

  badgeHTML(text, type = 'primary') {
    return `<span class="badge badge-${type}">${text}</span>`;
  },

  avatarHTML(src, name, size = 'md') {
    return src ? `<img src="${src}" alt="${name}" class="avatar avatar-${size}">` : `<div class="avatar-placeholder avatar-${size}">${name.split(' ').map(w => w[0]).join('').substring(0, 2)}</div>`;
  },

  getUserPhoto(user) {
    if (!user) return '';
    return user.profilePhotoUrl || user.avatar || '';
  },

  toast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><span class="toast-close" onclick="this.parentElement.remove()">×</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
  },

  modal(title, bodyHtml, id = null) {
    const mid = id || 'dynamicModal' + Date.now();
    const existing = document.getElementById(mid);
    if (existing) existing.remove();
    const backdrop = document.createElement('div');
    backdrop.id = mid;
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:550px">
        <div class="modal-header"><h3>${title}</h3><span class="modal-close" onclick="Utils.hideModal('${mid}')">×</span></div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer"></div>
      </div>`;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) Utils.hideModal(mid); });
    document.body.appendChild(backdrop);
    this.showModal(mid);
    return mid;
  },

  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  setParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
  },

  truncate(str, len = 100) {
    return str && str.length > len ? str.substring(0, len) + '...' : str || '';
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  sanitizeMediaUrl(url) {
    if (!url) return '';
    const str = String(url).trim();
    if (/^(https?:|data:image\/|blob:)/i.test(str)) return this.escapeHtml(str);
    return '';
  },

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },

  countUp(el, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.floor(current).toLocaleString();
    }, 16);
  },

  observeElements(selector, className = 'visible') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add(className); observer.unobserve(entry.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(selector).forEach(el => observer.observe(el));
  },

  scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); },

  initBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', this.scrollToTop);
  },

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => this.toast('Copied to clipboard'));
  },

  getRelativeTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins + ' min ago';
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return diffHrs + ' hr ago';
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    return this.formatDateShort(date);
  },

  checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    return score;
  },

  animateOnScroll() {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 100);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    elements.forEach(el => observer.observe(el));
  },

  // ═══════════════════════════════════════════════════════
  // TRUST SCORE CALCULATION
  // ═══════════════════════════════════════════════════════

  calculateTrustScore(user) {
    if (!user) return 0;
    let score = 0;
    if (user.name && user.name.length > 2) score += 10;
    if (user.phone) score += 15;
    if (user.profilePhotoUrl || user.avatar) score += 15;
    if (user.district) score += 10;
    if (user.bio && user.bio.length > 20) score += 10;
    if (user.skills && user.skills.length > 0) score += 10;
    if (user.verified) score += 15;
    const reviews = typeof DB !== 'undefined' ? DB.getReviews(user.id) : [];
    if (reviews.length >= 3) score += 10;
    else if (reviews.length >= 1) score += 5;
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
    if (avgRating >= 4) score += 5;
    return Math.min(100, score);
  },

  getTrustLevel(score) {
    if (score >= 70) return { level: 'high', label: 'Trusted', labelNe: 'विश्वसनीय', color: 'var(--primary)' };
    if (score >= 40) return { level: 'medium', label: 'Growing', labelNe: 'बढ्दो', color: 'var(--accent)' };
    return { level: 'low', label: 'New', labelNe: 'नयाँ', color: 'var(--danger)' };
  },

  trustScoreHTML(user) {
    const score = this.calculateTrustScore(user);
    const trust = this.getTrustLevel(score);
    return `<div class="trust-score ${trust.level}"><span>${trust.label}</span><div class="score-bar"><div class="score-fill" style="width:${score}%"></div></div><span>${score}%</span></div>`;
  },

  // ═══════════════════════════════════════════════════════
  // PROFILE COMPLETION
  // ═══════════════════════════════════════════════════════

  calculateProfileCompletion(user) {
    if (!user) return 0;
    let filled = 0;
    let total = 10;
    if (user.name && user.name.length > 2) filled++;
    if (user.phone) filled++;
    if (user.profilePhotoUrl || user.avatar) filled++;
    if (user.district) filled++;
    if (user.bio && user.bio.length > 10) filled++;
    if (user.skills && user.skills.length > 0) filled++;
    if (user.experience) filled++;
    if (user.education) filled++;
    if (user.languages && user.languages.length > 0) filled++;
    if (user.verified) filled++;
    return Math.round((filled / total) * 100);
  },

  profileCompletionHTML(user) {
    const pct = this.calculateProfileCompletion(user);
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const label = T ? (T.lang === 'ne' ? 'प्रोफाइल पूरा' : 'Profile Complete') : 'Profile Complete';
    return `
      <div class="profile-completion">
        <div class="profile-completion-header">
          <span class="label">${label}</span>
          <span class="percent">${pct}%</span>
        </div>
        <div class="profile-completion-bar">
          <div class="profile-completion-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  },

  // ═══════════════════════════════════════════════════════
  // VERIFICATION BADGE
  // ═══════════════════════════════════════════════════════

  verificationBadgeHTML(user) {
    if (user.verified) {
      return `<span class="verification-badge verified"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Verified</span>`;
    }
    return `<span class="verification-badge unverified">Unverified</span>`;
  },

  // ═══════════════════════════════════════════════════════
  // ONLINE STATUS
  // ═══════════════════════════════════════════════════════

  statusPillHTML(isOnline) {
    const T = typeof I18N !== 'undefined' ? I18N : null;
    if (isOnline) {
      const label = T ? (T.lang === 'ne' ? 'अनलाइन' : 'Online') : 'Online';
      return `<span class="status-pill online"><span class="dot"></span>${label}</span>`;
    }
    const label = T ? (T.lang === 'ne' ? 'अफलाइन' : 'Offline') : 'Offline';
    return `<span class="status-pill offline"><span class="dot"></span>${label}</span>`;
  },

  // ═══════════════════════════════════════════════════════
  // SECURITY: Input Sanitization
  // ═══════════════════════════════════════════════════════

  sanitizeInput(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  sanitizeUrl(url) {
    if (!url) return '#';
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return '#';
    return url;
  },

  // ═══════════════════════════════════════════════════════
  // PREMIUM CARD RENDERERS
  // ═══════════════════════════════════════════════════════

  statsCardPremium(icon, value, label, trend, trendDir, accentColor) {
    return `
      <div class="stats-card-premium">
        <div class="accent-line" style="background:${accentColor || 'var(--gradient-primary)'}"></div>
        <div class="icon-wrap" style="background:${accentColor ? accentColor + '15' : 'var(--primary-100)'}; color:${accentColor || 'var(--primary)'}">${icon}</div>
        <div class="value">${value}</div>
        <div class="label">${label}</div>
        ${trend ? `<div class="trend ${trendDir || 'up'}">${trendDir === 'down' ? '↓' : '↑'} ${trend}</div>` : ''}
      </div>`;
  }
};
