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
  }
};
