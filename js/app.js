const App = {
  init() {
    DB.init();
    if (typeof SupabaseAuth !== 'undefined' && SupabaseAuth.init) SupabaseAuth.init();
    Auth.init();
    this.renderNavbar();
    this.renderFooter();
    this.initLanguage();
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
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    const activeRole = user ? Auth.getActiveRole() : null;
    const roleMeta = (typeof AUTH_ROLES !== 'undefined') ? AUTH_ROLES : (typeof DB !== 'undefined' ? (DB.getRoles() || []) : []);
    const allRoles = user ? (user.roles || []) : [];
    const activeRoleInfo = roleMeta.find(r => r.id === activeRole) || { icon: '👤', name: activeRole || 'user', nameNe: activeRole || 'user' };
    const langFlag = T ? (T.lang === 'ne' ? '🇳🇵' : '🇬🇧') : '🇳🇵';
    const langLabel = T ? (T.lang === 'ne' ? 'नेपाली' : 'English') : 'नेपाली';

    nav.innerHTML = `
      <div class="navbar-inner">
        <div class="container navbar-container">
          <div class="navbar-left">
            <a href="index.html" class="navbar-brand">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M16 6c-2 0-4 2-4 5 0 2 1 3 2 4-3 0-6 2-6 5 0 3 3 6 8 6s8-3 8-6c0-3-3-5-6-5 1-1 2-2 2-4 0-3-2-5-4-5z" fill="white"/></svg>
              <span class="navbar-brand-text">AgriConnect</span>
            </a>
          </div>

          <nav class="navbar-center">
            <a href="index.html" class="nav-link ${this.isActive('index')}">${t('nav.home')}</a>
            <a href="jobs.html" class="nav-link ${this.isActive('jobs')}">${t('nav.findWork')}</a>
            <a href="workers.html" class="nav-link ${this.isActive('workers')}">${t('nav.findWorkers')}</a>
            <a href="community.html" class="nav-link ${this.isActive('community')}">${t('nav.community')}</a>
            <a href="about.html" class="nav-link nav-link-about ${this.isActive('about')}">${t('nav.about')}</a>
          </nav>

          <div class="navbar-right">
            <div class="navbar-search">
              <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" placeholder="${t('nav.search')}" id="navSearchInput" onkeydown="if(event.key==='Enter')window.location.href='jobs.html?q='+this.value">
            </div>

            <div class="navbar-divider"></div>

            <div class="lang-switcher" id="navLangSwitcher">
              <button class="lang-btn" onclick="document.getElementById('langDropdown').classList.toggle('show')" id="langBtn" title="Language">
                <span class="lang-flag" id="langFlag">${langFlag}</span>
                <span class="lang-label" id="langLabel">${langLabel}</span>
                <svg class="lang-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="lang-dropdown" id="langDropdown">
                <button class="lang-option ${T && T.lang === 'ne' ? 'active' : ''}" onclick="App.setLanguage('ne')">🇳🇵 नेपाली</button>
                <button class="lang-option ${T && T.lang === 'en' ? 'active' : ''}" onclick="App.setLanguage('en')">🇬🇧 English</button>
              </div>
            </div>

            ${user ? `
              ${AuthSystem.requiresPhotoUpload(user) ? `<a href="photo-gate.html" class="nav-icon-btn warn" title="Upload Photo">⚠️</a>` : ''}
              <div class="nav-icon-wrap">
                <button class="nav-icon-btn" onclick="this.nextElementSibling.classList.toggle('show')" id="notifBtn" title="${t('nav.notifTitle')}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  ${unreadNotifs > 0 ? `<span class="badge-count">${unreadNotifs}</span>` : ''}
                </button>
                <div class="notification-dropdown" id="notifDropdown">
                  <div class="notification-dropdown-header"><h4>${t('nav.notifTitle')}</h4><button class="btn btn-ghost btn-sm" onclick="App.markAllRead()">${t('nav.markAllRead')}</button></div>
                  <div id="notifList">${this.renderNotifications(user.id)}</div>
                </div>
              </div>
              <a href="chat.html" class="nav-icon-btn" title="${t('nav.msgs')}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ${unreadChats > 0 ? `<span class="badge-count">${unreadChats}</span>` : ''}
              </a>

              <div class="navbar-divider"></div>

              <div class="role-switcher-wrap">
                <button class="role-switcher-btn" onclick="document.getElementById('roleSwitcherDropdown').classList.toggle('show')" title="${T ? (T.lang === 'ne' ? 'भूमिका परिवर्तन' : 'Switch Role') : 'Switch Role'}">
                  <span class="role-icon">${activeRoleInfo.icon}</span>
                  <span class="role-label">${T ? (T.lang === 'ne' ? (activeRoleInfo.nameNe || activeRoleInfo.name) : activeRoleInfo.name) : activeRoleInfo.name}</span>
                  <svg class="role-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="role-switcher-dropdown" id="roleSwitcherDropdown">
                  <div class="role-switcher-header">${T ? (T.lang === 'ne' ? 'तपाईंको भूमिका' : 'Your Roles') : 'Your Roles'}</div>
                  ${allRoles.map(roleId => {
                    const rm = roleMeta.find(r => r.id === roleId) || { icon: '👤', name: roleId, nameNe: roleId };
                    const isActive = roleId === activeRole;
                    return `<button class="role-option ${isActive ? 'active' : ''}" onclick="App.switchRole('${roleId}')">${rm.icon} <span>${T ? (T.lang === 'ne' ? (rm.nameNe || rm.name) : rm.name) : rm.name}</span>${isActive ? ' ✓' : ''}</button>`;
                  }).join('')}
                  <div class="role-switcher-divider"></div>
                  <button class="role-option add-role" onclick="window.location.href='settings.html#roles'">➕ ${T ? (T.lang === 'ne' ? 'अरू भूमिका थप्नुहोस्' : 'Add another role') : 'Add another role'}</button>
                </div>
              </div>

              <div class="navbar-profile-wrap">
                <div class="navbar-profile" onclick="document.getElementById('profileDropdown').classList.toggle('show')">
                  ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'sm')}
                  <span class="name">${user.name.split(' ')[0]}</span>
                  <svg class="profile-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="navbar-dropdown" id="profileDropdown">
                  <a href="${Auth.getDashboardUrl()}">📊 ${t('nav.dashboard')}</a>
                  <a href="profile.html?id=${user.id}">👤 ${t('nav.myProfile')}</a>
                  <a href="photo-gate.html">📸 ${t('nav.profilePhoto')}</a>
                  <a href="jobs.html?mode=arma-parma">🤝 ${t('nav.armacarma')}</a>
                  <a href="verify-identity.html">🪪 ${t('nav.verifyId')}</a>
                  <a href="settings.html">⚙️ ${t('nav.settings')}</a>
                  <div class="dropdown-divider"></div>
                  <button class="danger" onclick="Auth.logout()">🚪 ${t('nav.logout')}</button>
                </div>
              </div>
            ` : `
              <div class="navbar-auth-btns">
                <a href="login.html" class="btn btn-outline btn-pill">${t('nav.login')}</a>
                <a href="register.html" class="btn btn-primary btn-pill">${t('nav.signup')}</a>
              </div>
            `}
          </div>

          <button class="hamburger" onclick="App.toggleMobileMenu()" aria-label="Menu">
            <span></span>
          </button>
        </div>
      </div>

      <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-header">
          <a href="index.html" class="mobile-menu-brand">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M16 6c-2 0-4 2-4 5 0 2 1 3 2 4-3 0-6 2-6 5 0 3 3 6 8 6s8-3 8-6c0-3-3-5-6-5 1-1 2-2 2-4 0-3-2-5-4-5z" fill="white"/></svg>
            AgriConnect
          </a>
          <button class="mobile-menu-close" onclick="App.toggleMobileMenu()" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="mobile-menu-user">
          ${user ? `
            <div class="mobile-menu-user-card">
              ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'md')}
              <div>
                <div class="mobile-menu-user-name">${user.name}</div>
                <div class="mobile-menu-user-role">${activeRoleInfo.icon} ${T ? (T.lang === 'ne' ? (activeRoleInfo.nameNe || activeRoleInfo.name) : activeRoleInfo.name) : activeRoleInfo.name}</div>
              </div>
            </div>
            <div class="mobile-role-switcher">
              <div class="mobile-role-label">${T ? (T.lang === 'ne' ? 'भूमिका स्विच गर्नुहोस्' : 'Switch Role') : 'Switch Role'}</div>
              <div class="mobile-role-list">
                ${allRoles.map(roleId => {
                  const rm = roleMeta.find(r => r.id === roleId) || { icon: '👤', name: roleId, nameNe: roleId };
                  const isActive = roleId === activeRole;
                  return `<button class="mobile-role-item ${isActive ? 'active' : ''}" onclick="App.switchRole('${roleId}')">${rm.icon} ${T ? (T.lang === 'ne' ? (rm.nameNe || rm.name) : rm.name) : rm.name}</button>`;
                }).join('')}
              </div>
            </div>
          ` : `
            <div class="mobile-menu-auth">
              <a href="login.html" class="btn btn-outline btn-block">${t('nav.login')}</a>
              <a href="register.html" class="btn btn-primary btn-block">${t('nav.signup')}</a>
            </div>
          `}
        </div>
        <nav class="mobile-menu-nav">
          <a href="index.html">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            ${t('nav.home')}
          </a>
          <a href="jobs.html">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            ${t('nav.findWork')}
          </a>
          <a href="workers.html">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${t('nav.findWorkers')}
          </a>
          <a href="community.html">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ${t('nav.community')}
          </a>
          <a href="about.html">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            ${t('nav.about')}
          </a>
          ${user ? `
            <div class="mobile-menu-divider"></div>
            <a href="${Auth.getDashboardUrl()}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              ${t('nav.dashboard')}
            </a>
            <a href="chat.html">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              ${t('nav.msgs')}
            </a>
            <a href="profile.html?id=${user.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${t('nav.myProfile')}
            </a>
            <a href="settings.html">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              ${t('nav.settings')}
            </a>
            <div class="mobile-menu-divider"></div>
            <button class="mobile-menu-logout" onclick="Auth.logout()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              ${t('nav.logout')}
            </button>
          ` : `
            <div class="mobile-menu-divider"></div>
            <a href="login.html">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              ${t('nav.login')}
            </a>
            <a href="register.html">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              ${t('nav.signup')}
            </a>
          `}
        </nav>
      </div>
      <div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="App.toggleMobileMenu()"></div>
    `;
    this.renderMobileBottomNav();
  },

  switchRole(role) {
    const result = Auth.setActiveRole(role);
    if (result && result.success) {
      document.querySelectorAll('.role-switcher-dropdown, .role-switcher-dropdown.show').forEach(d => d.classList.remove('show'));
      this.renderNavbar();
      this.showToast(typeof I18N !== 'undefined' && I18N.lang === 'ne' ? 'भूमिका परिवर्तन भयो' : 'Role switched successfully', 'success');
    } else if (result) {
      this.showToast(result.message || 'Failed to switch role', 'error');
    }
  },

  renderNotifications(userId) {
    const notifs = DB.getNotifications(userId).slice(0, 8);
    const noNotifText = typeof I18N !== 'undefined' ? I18N.get('nav.noNotifs') : 'No notifications';
    if (!notifs.length) return `<div style="padding:40px;text-align:center;color:var(--text-tertiary)">${noNotifText}</div>`;
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
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M16 6c-2 0-4 2-4 5 0 2 1 3 2 4-3 0-6 2-6 5 0 3 3 6 8 6s8-3 8-6c0-3-3-5-6-5 1-1 2-2 2-4 0-3-2-5-4-5z" fill="white"/></svg>
              AgriConnect Nepal
            </div>
            <p class="footer-about">${t('footer.aboutText')}</p>
            <div class="footer-social">
              <a href="#" title="Facebook">📘</a>
              <a href="#" title="Twitter">🐦</a>
              <a href="#" title="Instagram">📷</a>
              <a href="#" title="YouTube">📺</a>
            </div>
          </div>
          <div class="footer-col">
            <h4>${t('footer.quickLinks')}</h4>
            <a href="jobs.html">${t('cat.findWorkers')}</a>
            <a href="workers.html">${t('cat.findFarmers')}</a>
            <a href="register.html">${t('footer.signup')}</a>
            <a href="about.html">${t('nav.about')}</a>
            <a href="contact.html">${t('footer.help')}</a>
          </div>
          <div class="footer-col">
            <h4>${t('footer.forFarmers')}</h4>
            <a href="register.html?role=farmer">${t('footer.regFarmer')}</a>
            <a href="post-job.html">${t('footer.postJob')}</a>
            <a href="dashboard-farmer.html">${t('footer.farmerDash')}</a>
            <a href="workers.html">${t('footer.browseWorkers')}</a>
          </div>
          <div class="footer-col">
            <h4>${t('footer.forWorkers')}</h4>
            <a href="register.html?role=worker">${t('footer.regWorker')}</a>
            <a href="jobs.html">${t('footer.browseJobs')}</a>
            <a href="dashboard-worker.html">${t('footer.workerDash')}</a>
            <a href="about.html#how-it-works">${t('footer.howItWorks')}</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>${t('footer.copyright')}</span>
          <div class="footer-bottom-links">
            <a href="#">${t('footer.privacy')}</a>
            <a href="#">${t('footer.terms')}</a>
            <a href="#">${t('footer.help')}</a>
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
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    bottomNav.innerHTML = `
      <div class="mobile-bottom-nav-inner">
        <a href="index.html" class="${current === 'index' ? 'active' : ''}">
          <span class="nav-icon">🏠</span>
          <span>${t('bottomNav.home')}</span>
        </a>
        <a href="jobs.html" class="${current === 'jobs' ? 'active' : ''}">
          <span class="nav-icon">💼</span>
          <span>${t('bottomNav.jobs')}</span>
        </a>
        <a href="workers.html" class="${current === 'workers' ? 'active' : ''}">
          <span class="nav-icon">👷</span>
          <span>${t('bottomNav.workers')}</span>
        </a>
        <a href="community.html" class="${current === 'community' ? 'active' : ''}">
          <span class="nav-icon">💬</span>
          <span>${t('nav.community')}</span>
        </a>
        ${user ? `
          <a href="chat.html" class="${current === 'chat' ? 'active' : ''}">
            <span class="nav-icon">✉️</span>
            <span>${t('nav.msgs')}</span>
          </a>
        ` : `
          <a href="login.html" class="${current === 'login' ? 'active' : ''}">
            <span class="nav-icon">🔑</span>
            <span>${t('nav.login')}</span>
          </a>
        `}
      </div>
    `;
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
    if (hamburger) hamburger.classList.toggle('active');
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
      document.querySelectorAll('.navbar-dropdown.show, .lang-dropdown.show, .notification-dropdown.show, .role-switcher-dropdown.show').forEach(d => {
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
  },

  // ═══════════════════════════════════════════════════════
  // LANGUAGE SWITCHER
  // ═══════════════════════════════════════════════════════

  initLanguage() {
    const lang = localStorage.getItem('agri_lang') || 'ne';
    if (typeof I18N !== 'undefined') I18N.lang = lang;
    this.applyLanguage(lang);
  },

  setLanguage(lang) {
    localStorage.setItem('agri_lang', lang);
    if (typeof I18N !== 'undefined') I18N.lang = lang;
    this.applyLanguage(lang);
    this.renderNavbar();
    this.renderFooter();
    this.renderMobileBottomNav();
    const dropdown = document.getElementById('langDropdown');
    if (dropdown) dropdown.classList.remove('show');
  },

  applyLanguage(lang) {
    if (typeof I18N !== 'undefined') I18N.lang = lang;
    const flagEl = document.getElementById('langFlag');
    const labelEl = document.getElementById('langLabel');
    if (flagEl) flagEl.textContent = lang === 'ne' ? '🇳🇵' : '🇬🇧';
    if (labelEl) labelEl.textContent = lang === 'ne' ? 'नेपाली' : 'English';

    // Update all elements with data-ne / data-en attributes
    document.querySelectorAll('[data-ne]').forEach(el => {
      const text = el.getAttribute('data-' + lang);
      if (text) el.textContent = text;
    });

    // Update placeholder attributes
    document.querySelectorAll('[data-ne-placeholder]').forEach(el => {
      const ph = el.getAttribute('data-' + lang + '-placeholder');
      if (ph) el.placeholder = ph;
    });

    // Update html lang attribute
    document.documentElement.lang = lang === 'ne' ? 'ne' : 'en';

    // Sync settings page language dropdown if present
    const langSelect = document.getElementById('langSelect');
    if (langSelect && langSelect.value !== lang) langSelect.value = lang;
  }
};
