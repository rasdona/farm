const App = {
  init() {
    DB.init();
    Auth.init();
    this.renderNavbar();
    this.renderFooter();
    Utils.initTheme();
    Utils.initBackToTop();
    Utils.animateOnScroll();
    this.initScrollEffects();
    this.updateNotificationBadge();
  },

  renderNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const user = Auth.currentUser;
    const unreadNotifs = user ? DB.getNotifications(user.id).filter(n => !n.read).length : 0;
    const unreadChats = 2;

    nav.innerHTML = `
      <div class="container">
        <a href="index.html" class="navbar-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M16 6c-2 0-4 2-4 5 0 2 1 3 2 4-3 0-6 2-6 5 0 3 3 6 8 6s8-3 8-6c0-3-3-5-6-5 1-1 2-2 2-4 0-3-2-5-4-5z" fill="white"/></svg>
          AgriConnect
        </a>
        <nav class="navbar-nav">
          <a href="index.html" class="${this.isActive('index')}">Home</a>
          <a href="jobs.html" class="${this.isActive('jobs')}">Find Jobs</a>
          <a href="workers.html" class="${this.isActive('workers')}">Find Workers</a>
          <a href="community.html" class="${this.isActive('community')}">Community</a>
          <a href="about.html" class="${this.isActive('about')}">About</a>
        </nav>
        <div class="navbar-search">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search jobs, workers..." id="navSearchInput" onkeydown="if(event.key==='Enter')window.location.href='jobs.html?q='+this.value">
        </div>
        <div class="navbar-actions">
          <button class="navbar-btn tooltip" data-tooltip="Theme" onclick="Utils.toggleTheme();location.reload()">🌓</button>
          ${user ? `
            ${AuthSystem.requiresPhotoUpload(user) ? `<a href="photo-gate.html" class="navbar-btn tooltip" data-tooltip="Upload Photo" style="color:#f59e0b;font-size:1.1rem">⚠️📸</a>` : ''}
            <div style="position:relative">
              <button class="navbar-btn" onclick="this.nextElementSibling.classList.toggle('show')" id="notifBtn">
                🔔${unreadNotifs > 0 ? `<span class="badge-count">${unreadNotifs}</span>` : ''}
              </button>
              <div class="notification-dropdown" id="notifDropdown">
                <div class="notification-dropdown-header"><h4>Notifications</h4><button class="btn btn-ghost btn-sm" onclick="App.markAllRead()">Mark all read</button></div>
                <div id="notifList">${this.renderNotifications(user.id)}</div>
              </div>
            </div>
            <a href="chat.html" class="navbar-btn tooltip" data-tooltip="Messages">
              💬${unreadChats > 0 ? `<span class="badge-count">${unreadChats}</span>` : ''}
            </a>
            <div style="position:relative">
              <div class="navbar-profile" onclick="this.nextElementSibling.classList.toggle('show')">
                ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'sm')}
                <span class="name">${user.name.split(' ')[0]}</span>
              </div>
              <div class="navbar-dropdown" id="profileDropdown">
                <a href="${Auth.getDashboardUrl()}">📊 Dashboard</a>
                <a href="profile.html?id=${user.id}">👤 My Profile</a>
                <a href="photo-gate.html">📸 Profile Photo</a>
                <a href="jobs.html?mode=arma-parma">🤝 Arma Parma</a>
                <a href="verify-identity.html">🪪 Verify Identity</a>
                <a href="settings.html">⚙️ Settings</a>
                <div class="divider"></div>
                <button class="danger" onclick="Auth.logout()">🚪 Logout</button>
              </div>
            </div>
          ` : `
            <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
            <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
          `}
          <div class="hamburger" onclick="App.toggleMobileMenu()">
            <span></span>
          </div>
        </div>
      </div>
      <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-header">
          <span style="font-weight:700;font-size:1.1rem;color:var(--primary)">AgriConnect</span>
          <span class="mobile-menu-close" onclick="App.toggleMobileMenu()">✕</span>
        </div>
        <div class="mobile-menu-user">
          ${user ? `
            <div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--bg-alt);border-radius:var(--radius-md);margin-bottom:16px">
              ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'md')}
              <div>
                <div style="font-weight:700;font-size:0.95rem;color:var(--text)">${user.name}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">${user.role === 'farmer' ? '🌾 Farmer' : '👷 Worker'}</div>
              </div>
            </div>
          ` : ''}
        </div>
        <nav>
          <a href="index.html">🏠 Home</a>
          <a href="jobs.html">💼 Find Jobs</a>
          <a href="workers.html">👷 Find Workers</a>
          <a href="community.html">💬 Community</a>
          ${user ? `
            <a href="${Auth.getDashboardUrl()}">📊 Dashboard</a>
            <a href="chat.html">💬 Messages</a>
            <a href="profile.html?id=${user.id}">👤 My Profile</a>
            <a href="settings.html">⚙️ Settings</a>
            <hr class="divider" style="margin:8px 0">
            <button onclick="Auth.logout()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;width:100%;text-align:left;color:var(--danger);font-weight:600;border-radius:var(--radius);transition:var(--transition)" onmouseover="this.style.background='var(--bg-alt)'" onmouseout="this.style.background='transparent'">🚪 Logout</button>
          ` : `
            <a href="login.html">🔑 Log In</a>
            <a href="register.html">📝 Sign Up</a>
          `}
        </nav>
      </div>
      <div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="App.toggleMobileMenu()"></div>
    `;
    this.renderMobileBottomNav();
  },

  renderNotifications(userId) {
    const notifs = DB.getNotifications(userId).slice(0, 8);
    if (!notifs.length) return '<div style="padding:40px;text-align:center;color:var(--text-tertiary)">No notifications</div>';
    return notifs.map(n => `
      <a href="${n.link || '#'}" class="notification-item ${n.read ? '' : 'unread'}" onclick="event.stopPropagation()">
        <div class="icon ${this.getNotifIconClass(n.type)}">${this.getNotifIcon(n.type)}</div>
        <div class="content">
          <div class="text">${n.text}</div>
          <div class="time">${Utils.formatTime(n.createdAt)}</div>
        </div>
      </a>
    `).join('');
  },

  getNotifIcon(type) {
    const icons = { application: '📋', accepted: '✅', rejected: '❌', message: '💬', review: '⭐', welcome: '👋', completion: '🎉', verification: '🛡️' };
    return icons[type] || '🔔';
  },

  getNotifIconClass(type) {
    const cls = { application: 'blue', accepted: 'green', rejected: 'red', message: 'blue', review: 'amber', welcome: 'green', completion: 'green', verification: 'blue' };
    return cls[type] || 'green';
  },

  markAllRead() {
    if (Auth.currentUser) {
      DB.markNotificationsRead(Auth.currentUser.id);
      const dropdown = document.getElementById('notifDropdown');
      if (dropdown) { dropdown.querySelectorAll('.notification-item.unread').forEach(i => i.classList.remove('unread')); }
      const badge = document.querySelector('#notifBtn .badge-count');
      if (badge) badge.remove();
    }
  },

  updateNotificationBadge() {
    if (!Auth.currentUser) return;
    const count = DB.getNotifications(Auth.currentUser.id).filter(n => !n.read).length;
    const badge = document.querySelector('#notifBtn .badge-count');
    if (badge) {
      if (count > 0) badge.textContent = count;
      else badge.remove();
    }
  },

  renderFooter() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M16 6c-2 0-4 2-4 5 0 2 1 3 2 4-3 0-6 2-6 5 0 3 3 6 8 6s8-3 8-6c0-3-3-5-6-5 1-1 2-2 2-4 0-3-2-5-4-5z" fill="white"/></svg>
              AgriConnect Nepal
            </div>
            <p class="footer-about">Connecting Nepal's farmers with skilled agricultural workers. Building a stronger agricultural community through technology and trust.</p>
            <div class="footer-social">
              <a href="#" title="Facebook">📘</a>
              <a href="#" title="Twitter">🐦</a>
              <a href="#" title="Instagram">📷</a>
              <a href="#" title="YouTube">📺</a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Quick Links</h4>
            <a href="jobs.html">Find Jobs</a>
            <a href="workers.html">Find Workers</a>
            <a href="register.html">Sign Up</a>
            <a href="about.html">About Us</a>
            <a href="contact.html">Contact</a>
          </div>
          <div class="footer-col">
            <h4>For Farmers</h4>
            <a href="register.html?role=farmer">Register as Farmer</a>
            <a href="post-job.html">Post a Job</a>
            <a href="dashboard-farmer.html">Farmer Dashboard</a>
            <a href="workers.html">Browse Workers</a>
          </div>
          <div class="footer-col">
            <h4>For Workers</h4>
            <a href="register.html?role=worker">Register as Worker</a>
            <a href="jobs.html">Browse Jobs</a>
            <a href="dashboard-worker.html">Worker Dashboard</a>
            <a href="about.html#how-it-works">How It Works</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 AgriConnect Nepal. All rights reserved.</span>
          <div class="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Help Center</a>
          </div>
        </div>
      </div>
    `;
  },

  isActive(page) {
    const current = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    return current === page ? 'active' : '';
  },

  renderMobileBottomNav() {
    let bottomNav = document.getElementById('mobileBottomNav');
    if (!bottomNav) {
      bottomNav = document.createElement('nav');
      bottomNav.id = 'mobileBottomNav';
      bottomNav.className = 'mobile-bottom-nav';
      document.body.appendChild(bottomNav);
    }
    const user = Auth.currentUser;
    const current = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    bottomNav.innerHTML = `
      <div class="mobile-bottom-nav-inner">
        <a href="index.html" class="${current === 'index' ? 'active' : ''}">
          <span class="nav-icon">🏠</span>
          <span>Home</span>
        </a>
        <a href="jobs.html" class="${current === 'jobs' ? 'active' : ''}">
          <span class="nav-icon">💼</span>
          <span>Jobs</span>
        </a>
        <a href="workers.html" class="${current === 'workers' ? 'active' : ''}">
          <span class="nav-icon">👷</span>
          <span>Workers</span>
        </a>
        <a href="community.html" class="${current === 'community' ? 'active' : ''}">
          <span class="nav-icon">💬</span>
          <span>Community</span>
        </a>
        ${user ? `
          <a href="chat.html" class="${current === 'chat' ? 'active' : ''}">
            <span class="nav-icon">✉️</span>
            <span>Chat</span>
          </a>
        ` : `
          <a href="login.html" class="${current === 'login' ? 'active' : ''}">
            <span class="nav-icon">🔑</span>
            <span>Login</span>
          </a>
        `}
      </div>
    `;
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
    document.body.style.overflow = menu?.classList.contains('open') ? 'hidden' : '';
  },

  initScrollEffects() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      window.addEventListener('scroll', Utils.throttle(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
      }, 100));
    }
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.navbar-dropdown.show').forEach(d => {
        if (!d.parentElement.contains(e.target)) d.classList.remove('show');
      });
    });
  },

  renderJobCard(job) {
    const farmer = DB.getUserById(job.farmerId);
    const isSaved = Auth.currentUser && DB.isJobSaved(Auth.currentUser.id, job.id);
    const isArmaParma = job.workMode === 'arma-parma';
    return `
      <div class="job-card hover-lift" data-animate="fadeUp">
        <div class="job-card-image">
          <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=300&fit=crop" alt="${job.title}" loading="lazy">
          <div class="job-card-status">
            ${isArmaParma ? '<span class="badge badge-arma">🤝 Arma Parma</span>' : '<span class="badge badge-paid">💰 Paid</span>'}
            ${job.urgent ? '<span class="badge badge-danger">🔥 Urgent</span>' : ''}
            <span class="badge badge-${job.status === 'active' ? 'success' : job.status === 'filled' ? 'info' : 'secondary'}">${Utils.capitalize(job.status)}</span>
          </div>
          <div class="job-card-save ${isSaved ? 'saved' : ''}" onclick="event.preventDefault();event.stopPropagation();App.toggleSaveJob('${job.id}',this)">
            ${isSaved ? '❤️' : '🤍'}
          </div>
        </div>
        <div class="job-card-body">
          <div class="job-card-title"><a href="job-detail.html?id=${job.id}${isArmaParma ? '&type=arma-parma' : ''}">${Utils.escapeHtml(job.title)}</a></div>
          <div class="job-card-company">
            ${farmer ? Utils.avatarHTML(Utils.getUserPhoto(farmer), farmer.name, 'sm') : ''}
            <span>${farmer ? farmer.farmName || farmer.name : 'Unknown Farm'}</span>
          </div>
          <div class="job-card-meta">
            <span>📍 ${job.district}${job.municipality ? ', ' + job.municipality : ''}</span>
            <span>👥 ${job.workersNeeded || job.helpersNeeded} ${isArmaParma ? 'helpers' : 'workers'}</span>
            <span>📅 ${Utils.formatDateShort(job.startDate || job.date)}</span>
          </div>
          <div class="job-card-tags">
            ${(job.requiredSkills || []).slice(0, 3).map(s => `<span class="badge badge-primary">${s}</span>`).join('') || ''}
            ${job.foodProvided ? '<span class="badge badge-success">🍽️ Food</span>' : ''}
            ${job.accommodationProvided ? '<span class="badge badge-info">🏠 Stay</span>' : ''}
            ${job.teaSnacksProvided ? '<span class="badge badge-warning">🍵 Tea</span>' : ''}
            ${job.equipmentProvided ? '<span class="badge badge-info">🔧 Tools</span>' : ''}
          </div>
          <div class="job-card-footer">
            ${isArmaParma ? `<div class="job-card-wage"><span class="arma-credit-badge">🤝 Labor Exchange</span></div>` : `<div class="job-card-wage">${Utils.formatCurrency(job.wage?.daily || 0)}<small>/day</small></div>`}
            <span class="text-sm text-muted">${Utils.formatTime(job.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  },

  renderWorkerCard(worker) {
    const rating = DB.getAvgRating(worker.id);
    const reviewCount = DB.getReviews(worker.id).length;
    const isSaved = Auth.currentUser && DB.isWorkerSaved(Auth.currentUser.id, worker.id);
    return `
      <div class="worker-card hover-lift" data-animate="fadeUp">
        ${worker.verified ? '<div class="worker-card-verified" title="Verified">✅</div>' : ''}
        <img src="${Utils.getUserPhoto(worker) || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(worker.name)}" alt="${worker.name}" class="worker-card-avatar">
        <div class="worker-card-name"><a href="worker-profile.html?id=${worker.id}">${worker.name}</a></div>
        <div class="worker-card-location">📍 ${worker.district || 'Nepal'}</div>
        ${rating > 0 ? `<div class="worker-card-rating">${Utils.ratingHTML(rating, reviewCount)}</div>` : ''}
        <div class="worker-card-skills">
          ${(worker.skills || []).slice(0, 3).map(s => `<span class="badge badge-primary">${s}</span>`).join('')}
        </div>
        <div class="worker-card-wage">NPR ${(worker.expectedWage?.daily || 0).toLocaleString()}/day</div>
        <div class="worker-card-actions">
          <a href="worker-profile.html?id=${worker.id}" class="btn btn-outline btn-sm">View Profile</a>
          <button class="btn btn-sm ${isSaved ? 'btn-primary' : 'btn-outline'}" onclick="App.toggleSaveWorker('${worker.id}',this)">${isSaved ? '❤️ Saved' : '🤍 Save'}</button>
        </div>
      </div>
    `;
  },

  toggleSaveJob(jobId, el) {
    if (!Auth.requireAuth()) return;
    if (DB.isJobSaved(Auth.currentUser.id, jobId)) {
      DB.unsaveJob(Auth.currentUser.id, jobId);
      el.classList.remove('saved');
      el.innerHTML = '🤍';
      Utils.toast('Job removed from saved', 'info');
    } else {
      DB.saveJob(Auth.currentUser.id, jobId);
      el.classList.add('saved');
      el.innerHTML = '❤️';
      Utils.toast('Job saved!');
    }
  },

  toggleSaveWorker(workerId, el) {
    if (!Auth.requireAuth()) return;
    if (DB.isWorkerSaved(Auth.currentUser.id, workerId)) {
      DB.unsaveWorker(Auth.currentUser.id, workerId);
      el.className = 'btn btn-sm btn-outline';
      el.innerHTML = '🤍 Save';
      Utils.toast('Worker removed from saved', 'info');
    } else {
      DB.saveWorker(Auth.currentUser.id, workerId);
      el.className = 'btn btn-sm btn-primary';
      el.innerHTML = '❤️ Saved';
      Utils.toast('Worker saved!');
    }
  }
};
