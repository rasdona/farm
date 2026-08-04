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
    this.initButtonRipple();
    this.updateNotificationBadge();
    if (window.innerWidth <= 768) {
      this.renderFAB();
      this.renderMobileHome();
    }
    if (typeof SupabaseSync !== 'undefined') {
      SupabaseSync.loadAll().then(() => this._onDataSynced());
    }
    document.addEventListener('chat-realtime', (e) => {
      this.updateChatBadge();
      if (e.detail && e.detail.notification) this.updateNotificationBadge();
    });
  },

  _ensureRealtime() {
    const user = Auth.currentUser;
    if (!user || !user.id) { setTimeout(() => this._ensureRealtime(), 1000); return; }
    if (typeof SupabaseSync !== 'undefined' && SupabaseSync.subscribeRealtime) {
      SupabaseSync.subscribeRealtime(user.id);
    }
  },

  _onDataSynced() {
    this.renderNavbar();
    this.updateNotificationBadge();
    this.updateChatBadge();
    this._ensureRealtime();
    if (window.innerWidth <= 768) {
      this.renderMobileHome();
    }
    const dashboardMain = document.getElementById('dashboardContent');
    if (dashboardMain && typeof Dashboard !== 'undefined') {
      Dashboard.renderSmartDashboard();
    }
    if (typeof CalendarView !== 'undefined' && document.getElementById('calendarGrid')) {
      CalendarView.render();
      CalendarView.renderSidebar();
    }
    if (typeof Admin !== 'undefined' && document.getElementById('adminContent')) {
      Admin.renderOverview();
      Admin.renderSidebar();
    }
  },

  renderNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const user = Auth.currentUser;
    const unreadNotifs = user ? DB.getNotifications(user.id).filter(n => !n.read).length : 0;
    const unreadChats = user ? DB.getChatsByUser(user.id).reduce((acc, c) => acc + DB.getMessagesByChat(c.id).filter(m => m.senderId !== user.id && !m.read).length, 0) : 0;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    const activeRole = user ? Auth.getActiveRole() : null;
    const roleMeta = (typeof AUTH_ROLES !== 'undefined') ? AUTH_ROLES : (typeof DB !== 'undefined' ? (DB.getRoles() || []) : []);
    const allRoles = user ? (user.roles || []) : [];
    const activeRoleInfo = roleMeta.find(r => r.id === activeRole) || { icon: '👤', name: activeRole || 'user', nameNe: activeRole || 'user' };

    nav.innerHTML = `
      <div class="navbar-inner">
        <div class="container navbar-container">
          <div class="navbar-left">
            <a href="index.html" class="navbar-brand">
              <img src="image/logo.svg" alt="Ekrishi logo" class="navbar-brand-logo">
              <span class="navbar-brand-text">Ekrishi</span>
            </a>
          </div>

          <nav class="navbar-center">
            <a href="index.html" class="nav-link ${this.isActive('index')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>${t('nav.home')}</span></a>
            <a href="jobs.html" class="nav-link ${this.isActive('jobs')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg><span>${t('nav.findWork')}</span></a>
            <a href="workers.html" class="nav-link ${this.isActive('workers')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>${t('nav.findWorkers')}</span></a>
            <a href="marketplace.html" class="nav-link ${this.isActive('marketplace')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><span>${t('nav.marketplace')}</span></a>
            <a href="community.html" class="nav-link ${this.isActive('community')}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>${t('nav.community')}</span></a>
            <div class="nav-more-wrap">
              <button class="nav-link nav-more-btn" onclick="App.toggleMoreDropdown()" aria-haspopup="true" aria-expanded="false" aria-label="${t('nav.more')}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>${t('nav.more')}</span>
                <svg class="nav-more-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="nav-more-dropdown" id="moreDropdown">
                <a href="about.html" class="nav-more-item ${this.isActive('about') ? 'active' : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>${t('nav.about')}</a>
                <a href="calendar.html" class="nav-more-item ${this.isActive('calendar') ? 'active' : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${t('nav.calendar')}</a>
                <a href="nearby-farmers.html" class="nav-more-item ${this.isActive('nearby-farmers') ? 'active' : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${t('nav.nearbyFarmers')}</a>
                <div class="nav-more-divider"></div>
                <a href="contact.html" class="nav-more-item ${this.isActive('contact') ? 'active' : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${t('nav.contact')}</a>
              </div>
            </div>
            <div class="nav-active-indicator"></div>
          </nav>

          <div class="navbar-right">
            <div class="navbar-search">
              <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" placeholder="${t('nav.search')}" id="navSearchInput" list="districtSuggestions" autocomplete="off" onkeydown="if(event.key==='Enter')App.navSearch(this.value)">
              <datalist id="districtSuggestions">
                ${(typeof SAMPLE_LOCATIONS !== 'undefined' ? SAMPLE_LOCATIONS.provinces.flatMap(p => p.districts) : []).map(d => `<option value="${d}">${d}</option>`).join('')}
              </datalist>
              <button class="nav-search-mic" type="button" aria-label="Voice search" onclick="App.voiceSearch()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button class="nav-search-filter" type="button" aria-label="Search filters" onclick="window.location.href='jobs.html'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
            </div>

            <div class="navbar-divider"></div>

            <div class="lang-switcher" id="navLangSwitcher">
              <button class="lang-btn lang-btn-icon" onclick="App.toggleLangDropdown()" id="langBtn" title="${t('nav.language') || 'Language'}" aria-label="Switch language">
                <span class="lang-flag-icon">${T && T.lang === 'ne' ? '🇳🇵' : '🇬🇧'}</span>
              </button>
              <div class="lang-dropdown" id="langDropdown">
                <button class="lang-option ${T && T.lang === 'ne' ? 'active' : ''}" onclick="App.setLanguage('ne')">🇳🇵 नेपाली</button>
                <button class="lang-option ${T && T.lang === 'en' ? 'active' : ''}" onclick="App.setLanguage('en')">🇬🇧 English</button>
              </div>
            </div>

            ${user ? `
              ${AuthSystem.requiresPhotoUpload(user) ? `<a href="photo-gate.html" class="nav-icon-btn warn" title="Upload Photo">⚠️</a>` : ''}
              <div class="nav-icon-wrap">
                <button class="nav-icon-btn" onclick="this.nextElementSibling.classList.toggle('show')" id="notifBtn" title="${t('nav.notifTitle')}" aria-label="${t('nav.notifTitle')}" data-tooltip="${t('nav.notifTitle')}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  ${unreadNotifs > 0 ? `<span class="badge-count">${unreadNotifs}</span>` : ''}
                </button>
                <div class="notification-dropdown" id="notifDropdown">
                  <div class="notification-dropdown-header"><h4>${t('nav.notifTitle')}</h4><button class="btn btn-ghost btn-sm" onclick="App.markAllRead()">${t('nav.markAllRead')}</button></div>
                  <div id="notifList">${this.renderNotifications(user.id)}</div>
                </div>
              </div>
              <a href="chat.html" class="nav-icon-btn" title="${t('nav.msgs')}" aria-label="${t('nav.msgs')}" data-tooltip="${t('nav.msgs')}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ${unreadChats > 0 ? `<span class="badge-count">${unreadChats}</span>` : ''}
              </a>

              <div class="navbar-divider"></div>

              <div class="role-switcher-wrap">
                <button class="role-switcher-btn role-switcher-btn-icon" onclick="App.toggleRoleDropdown()" title="${T ? (T.lang === 'ne' ? 'भूमिका परिवर्तन' : 'Switch Role') : 'Switch Role'}" aria-label="${T ? (T.lang === 'ne' ? 'भूमिका परिवर्तन' : 'Switch Role') : 'Switch Role'}" aria-haspopup="true">
                  <span class="role-icon">${activeRoleInfo.icon}</span>
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

              <div class="navbar-profile-wrap" id="profileWrap">
                <div class="navbar-profile navbar-profile-icon" onclick="App.toggleProfileDropdown()" role="button" aria-haspopup="true" tabindex="0" title="${user.name}" aria-label="${user.name}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.toggleProfileDropdown()}">
                  <div class="nav-profile-avatar ${user.online ? 'online' : ''}">
                    ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'md')}
                  </div>
                </div>
                <div class="navbar-dropdown" id="profileDropdown" role="menu">
                  <div class="navbar-dropdown-user">
                    <div class="nav-profile-avatar lg ${user.online ? 'online' : ''}">
                      ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'lg')}
                    </div>
                    <div class="nav-profile-detail">
                      <div class="nav-profile-detail-name">${Utils.escapeHtml(user.name)}</div>
                      <div class="nav-profile-detail-email">${user.email || ''}</div>
                      <span class="nav-profile-badge">${activeRoleInfo.icon} ${T ? (T.lang === 'ne' ? (activeRoleInfo.nameNe || activeRoleInfo.name) : activeRoleInfo.name) : activeRoleInfo.name}</span>
                    </div>
                  </div>
                  <div class="dropdown-divider"></div>
                  <a href="profile.html?id=${user.id}" role="menuitem" tabindex="0">👤 ${t('nav.myProfile')}</a>
                  <a href="${Auth.getDashboardUrl()}" role="menuitem" tabindex="0">📊 ${t('nav.dashboard')}</a>
                  <a href="calendar.html" role="menuitem" tabindex="0">📅 ${t('nav.calendar') || 'Calendar'}</a>
                  <a href="chat.html" role="menuitem" tabindex="0">💬 ${t('nav.msgs')}</a>
                  <a href="friends.html" role="menuitem" tabindex="0">🤝 ${t('nav.friends') || 'Friends'}</a>
                  <div class="dropdown-divider"></div>
                  <a href="saved-jobs.html" role="menuitem" tabindex="0">🔖 ${t('nav.savedJobs') || 'Saved Jobs'}</a>
                  <a href="saved-workers.html" role="menuitem" tabindex="0">👷 ${t('nav.savedWorkers') || 'Saved Workers'}</a>
                  <div class="dropdown-divider"></div>
                  <a href="settings.html" role="menuitem" tabindex="0">⚙️ ${t('nav.settings')}</a>
                  <a href="#" onclick="App.toggleLangDropdown();return false" role="menuitem" tabindex="0">🌐 ${t('nav.language') || 'Language'}</a>
                  <a href="contact.html" role="menuitem" tabindex="0">❓ ${t('nav.help') || 'Help Center'}</a>
                  <div class="dropdown-divider"></div>
                  <button class="danger" onclick="Auth.logout()" role="menuitem" tabindex="0">🚪 ${t('nav.logout')}</button>
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
            <img src="image/logo.svg" alt="Ekrishi logo">
            Ekrishi
          </a>
          <button class="mobile-menu-close" onclick="App.toggleMobileMenu()" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="mobile-menu-search">
          <div class="mobile-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" id="mobileNavSearch" placeholder="${t('nav.search')}" aria-label="${t('nav.search')}" onkeydown="if(event.key==='Enter')App.mobileSearch(this.value)">
          </div>
        </div>

        ${user ? `
          <div class="mobile-menu-user">
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
          </div>
        ` : `
          <div class="mobile-drawer-welcome">
            <div class="mobile-drawer-welcome-icon">
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M16 6c-2 0-4 2-4 5 0 2 1 3 2 4-3 0-6 2-6 5 0 3 3 6 8 6s8-3 8-6c0-3-3-5-6-5 1-1 2-2 2-4 0-3-2-5-4-5z" fill="white"/></svg>
            </div>
            <div class="mobile-drawer-welcome-title">${t('drawer.welcome')}</div>
            <div class="mobile-drawer-welcome-desc">${t('drawer.desc')}</div>
            <div class="mobile-drawer-auth">
              <a href="login.html" class="btn btn-primary btn-block btn-lg">${t('drawer.quickLogin')}</a>
              <a href="register.html" class="btn btn-outline btn-block">${t('drawer.createAccount')}</a>
            </div>
            <div class="mobile-drawer-guest">
              <a href="jobs.html" class="mobile-drawer-guest-link">${t('drawer.browseGuest')}</a>
            </div>
          </div>
        `}

        <nav class="mobile-menu-nav">
          <a href="index.html" class="${this.isActive('index') ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            ${t('nav.home')}
          </a>
          <a href="jobs.html" class="${this.isActive('jobs') ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            ${t('nav.findWork')}
          </a>
          <a href="workers.html" class="${this.isActive('workers') ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${t('nav.findWorkers')}
          </a>
          <a href="marketplace.html" class="${this.isActive('marketplace') ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ${t('nav.marketplace')}
          </a>
          <a href="community.html" class="${this.isActive('community') ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ${t('nav.community')}
          </a>
            <a href="about.html" class="${this.isActive('about') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              ${t('nav.about')}
            </a>
            <a href="calendar.html" class="${this.isActive('calendar') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${t('nav.calendar')}
            </a>
            <a href="nearby-farmers.html" class="${this.isActive('nearby-farmers') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${t('nav.nearbyFarmers')}
            </a>
            <a href="contact.html" class="${this.isActive('contact') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              ${t('nav.contact')}
            </a>
          ${user ? `
            <div class="mobile-menu-divider"></div>
            <a href="${Auth.getDashboardUrl()}" class="${this.isActive('dashboard') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              ${t('nav.dashboard')}
            </a>
            <a href="chat.html" class="${this.isActive('chat') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              ${t('nav.msgs')}
            </a>
            <a href="friends.html" class="${this.isActive('friends') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ${t('nav.friends') || 'Friends'}
            </a>
            <a href="saved-jobs.html" class="${this.isActive('saved-jobs') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              ${t('nav.savedJobs') || 'Saved Jobs'}
            </a>
            <a href="saved-workers.html" class="${this.isActive('saved-workers') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ${t('nav.savedWorkers') || 'Saved Workers'}
            </a>
            <a href="profile.html?id=${user.id}" class="${this.isActive('profile') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${t('nav.myProfile')}
            </a>
            <a href="settings.html" class="${this.isActive('settings') ? 'active' : ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              ${t('nav.settings')}
            </a>
            <div class="mobile-menu-divider"></div>
            <button class="mobile-menu-logout" onclick="Auth.logout()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              ${t('nav.logout')}
            </button>
          ` : ''}
        </nav>

        <div class="mobile-menu-lang">
          <div class="mobile-menu-lang-label">🌐 ${T ? (T.lang === 'ne' ? 'भाषा रोज्नुहोस् / Language' : 'Language / भाषा रोज्नुहोस्') : 'Language'}</div>
          <div class="mobile-menu-lang-options">
            <button class="${T && T.lang === 'ne' ? 'active' : ''}" onclick="App.pickLanguage('ne')">🇳🇵 नेपाली</button>
            <button class="${T && T.lang === 'en' ? 'active' : ''}" onclick="App.pickLanguage('en')">🇬🇧 English</button>
          </div>
        </div>
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
    const icons = { application: '📋', accepted: '✅', rejected: '❌', message: '💬', review: '⭐', welcome: '👋', completion: '🎉', verification: '🛡️', friend: '👥', weather: '🌦️', pending: '📥', calendar: '📅', system: '🔔' };
    return icons[type] || '🔔';
  },

  getNotifIconClass(type) {
    const cls = { application: 'blue', accepted: 'green', rejected: 'red', message: 'blue', review: 'amber', welcome: 'green', completion: 'green', verification: 'blue', friend: 'blue', weather: 'amber', pending: 'amber', calendar: 'blue', system: 'green' };
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

  updateChatBadge() {
    if (!Auth.currentUser) return;
    const unread = DB.getChatsByUser(Auth.currentUser.id).reduce((acc, c) =>
      acc + DB.getMessagesByChat(c.id).filter(m => m.senderId !== Auth.currentUser.id && !m.read).length, 0);
    const icon = document.querySelector('.nav-icon-btn[href="chat.html"]');
    const badge = icon ? icon.querySelector('.badge-count') : null;
    if (unread > 0) {
      const label = unread > 99 ? '99+' : String(unread);
      if (badge) badge.textContent = label;
      else if (icon) icon.insertAdjacentHTML('beforeend', `<span class="badge-count">${label}</span>`);
    } else if (badge) {
      badge.remove();
    }
    this.renderMobileBottomNav();
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
              Ekrishi Nepal
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
            <a href="privacy.html">${t('footer.privacy')}</a>
            <a href="terms.html">${t('footer.terms')}</a>
            <a href="contact.html">${t('footer.help')}</a>
          </div>
        </div>
      </div>
    `;
  },

  isActive(page) {
    const current = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    if (current === page) return 'active';
    const aliases = {
      jobs: ['job-detail'],
      workers: ['worker-profile'],
      community: ['arma-parma'],
      dashboard: ['dashboard-farmer', 'dashboard-worker']
    };
    return (aliases[page] || []).includes(current) ? 'active' : '';
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
    const unreadChats = user ? DB.getChatsByUser(user.id).reduce((acc, c) => acc + DB.getMessagesByChat(c.id).filter(m => m.senderId !== user.id && !m.read).length, 0) : 0;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    bottomNav.innerHTML = `
      <div class="mobile-bottom-nav-inner">
        <a href="index.html" class="${current === 'index' ? 'active' : ''}">
          <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
          <span>${t('bottomNav.home')}</span>
        </a>
        <a href="jobs.html" class="${current === 'jobs' ? 'active' : ''}">
          <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></span>
          <span>${t('bottomNav.jobs')}</span>
        </a>
        <a href="workers.html" class="${current === 'workers' ? 'active' : ''}">
          <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          <span>${t('bottomNav.workers')}</span>
        </a>
        <a href="marketplace.html" class="${current === 'marketplace' ? 'active' : ''}">
          <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>
          <span>${t('bottomNav.market')}</span>
        </a>
        <a href="community.html" class="${current === 'community' ? 'active' : ''}">
          <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
          <span>${t('nav.community')}</span>
        </a>
        ${user ? `
          <a href="chat.html" class="${current === 'chat' ? 'active' : ''}">
            <span class="nav-icon" style="position:relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${unreadChats > 0 ? `<span class="badge-count bottom-nav-badge">${unreadChats > 99 ? '99+' : unreadChats}</span>` : ''}
            </span>
            <span>${t('nav.msgs')}</span>
          </a>
        ` : ''}
      </div>
    `;
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const hamburger = document.querySelector('.hamburger');
    const fab = document.getElementById('mobileFAB');
    if (fab) fab.classList.remove('open');
    if (menu) menu.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
    if (hamburger) hamburger.classList.toggle('active');
    document.body.style.overflow = menu?.classList.contains('open') ? 'hidden' : '';
  },

  toggleLangDropdown() {
    const dd = document.getElementById('langDropdown');
    const switcher = document.getElementById('navLangSwitcher');
    if (dd) dd.classList.toggle('show');
    if (switcher) switcher.classList.toggle('open');
  },

  toggleMoreDropdown() {
    const dd = document.getElementById('moreDropdown');
    const wrap = dd ? dd.closest('.nav-more-wrap') : null;
    const btn = document.querySelector('.nav-more-btn');
    if (dd) dd.classList.toggle('show');
    if (wrap) wrap.classList.toggle('open');
    if (btn) {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
    }
  },

  voiceSearch() {
    const input = document.getElementById('navSearchInput');
    if (!input) return;
    const ne = typeof I18N !== 'undefined' && I18N.lang === 'ne';
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      input.focus();
      App.showToast(ne ? 'भ्वाइस खोजी यो ब्राउजरमा उपलब्ध छैन' : 'Voice search is not supported in this browser', 'error');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = ne ? 'ne-NP' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    const prevPlaceholder = input.placeholder;
    input.placeholder = ne ? 'बोल्दै हुनुहुन्छ...' : 'Listening...';
    rec.onresult = (e) => {
      const q = e.results[0][0].transcript;
      window.location.href = 'jobs.html?q=' + encodeURIComponent(q);
    };
    rec.onerror = () => { input.placeholder = prevPlaceholder; };
    rec.onend = () => { input.placeholder = prevPlaceholder; };
    rec.start();
  },

  mobileSearch(q) {
    this.navSearch(q);
  },

  navSearch(q) {
    const val = (q || '').trim();
    if (!val) { window.location.href = 'jobs.html'; return; }
    const districts = (typeof SAMPLE_LOCATIONS !== 'undefined')
      ? SAMPLE_LOCATIONS.provinces.flatMap(p => p.districts)
      : [];
    const exact = districts.find(d => d.toLowerCase() === val.toLowerCase());
    if (exact) {
      window.location.href = 'jobs.html?district=' + encodeURIComponent(exact);
      return;
    }
    window.location.href = 'jobs.html?q=' + encodeURIComponent(val);
  },

  toggleRoleDropdown() {
    const dd = document.getElementById('roleSwitcherDropdown');
    if (dd) dd.classList.toggle('show');
  },

  toggleProfileDropdown() {
    const dd = document.getElementById('profileDropdown');
    const wrap = document.getElementById('profileWrap');
    if (dd) dd.classList.toggle('show');
    if (wrap) wrap.classList.toggle('open');
  },

  // ═══════════════════════════════════════════════════════
  // GREETING HELPER
  // ═══════════════════════════════════════════════════════

  getGreeting() {
    const h = new Date().getHours();
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    if (h < 12) return t('home.greeting.morning');
    if (h < 17) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  },

  // ═══════════════════════════════════════════════════════
  // FLOATING ACTION BUTTON (FAB)
  // ═══════════════════════════════════════════════════════

  renderFAB() {
    let fab = document.getElementById('mobileFAB');
    if (!fab) {
      fab = document.createElement('div');
      fab.id = 'mobileFAB';
      fab.className = 'fab-container';
      document.body.appendChild(fab);
    }
    const user = Auth.currentUser;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    const fabActions = user ? [
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', label: t('fab.requestWork'), href: 'post-job.html', color: '#16a34a' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', label: t('fab.offerWork'), href: 'jobs.html', color: '#2563eb' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>', label: t('fab.sellProduct'), href: 'marketplace.html?create=1', color: '#7c3aed' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', label: t('fab.buyProduct'), href: 'marketplace.html', color: '#d97706' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>', label: t('fab.rentEquipment'), href: 'marketplace.html?category=equipment', color: '#ea580c' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: t('fab.createArma'), href: 'post-job.html?mode=arma-parma', color: '#059669' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: t('fab.createPost'), href: 'community.html?create=1', color: '#0891b2' },
    ] : [
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', label: t('fab.requestWork'), href: 'register.html?role=farmer', color: '#16a34a' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>', label: t('fab.buyProduct'), href: 'marketplace.html', color: '#d97706' },
      { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: t('fab.createArma'), href: 'register.html', color: '#059669' },
    ];
    fab.innerHTML = `
      <div class="fab-overlay" id="fabOverlay" onclick="App.toggleFAB()"></div>
      <div class="fab-actions" id="fabActions">
        ${fabActions.map((a, i) => `
          <a href="${a.href}" class="fab-action" style="--fab-delay:${i * 0.04}s; --fab-color:${a.color}">
            <span class="fab-action-label">${a.label}</span>
            <span class="fab-action-icon">${a.icon}</span>
          </a>
        `).join('')}
      </div>
      <button class="fab-trigger" id="fabTrigger" onclick="App.toggleFAB()" aria-label="Quick Actions">
        <svg class="fab-icon fab-icon-plus" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg class="fab-icon fab-icon-close" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
  },

  toggleFAB() {
    const fab = document.getElementById('mobileFAB');
    if (fab) {
      fab.classList.toggle('open');
      document.body.style.overflow = fab.classList.contains('open') ? 'hidden' : '';
    }
  },

  // ═══════════════════════════════════════════════════════
  // MOBILE HOME SCREEN
  // ═══════════════════════════════════════════════════════

  renderMobileHome() {
    let container = document.getElementById('mobileHomeContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mobileHomeContainer';
      container.className = 'mobile-home';
      const hero = document.querySelector('.hero');
      if (hero) {
        hero.parentNode.insertBefore(container, hero);
      } else {
        const footer = document.querySelector('.footer') || document.getElementById('footer');
        if (footer) {
          footer.parentNode.insertBefore(container, footer);
        } else {
          document.body.appendChild(container);
        }
      }
    }
    const user = Auth.currentUser;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = T ? (key => T.get(key)) : (key => key);
    const greeting = this.getGreeting();
    const todayEvents = this.getTodaySchedule(user);
    const jobs = typeof DB !== 'undefined' ? DB.getJobs().filter(j => j.status === 'active').slice(0, 4) : [];
    const users = typeof DB !== 'undefined' ? DB.getUsers().filter(u => !u.suspended).slice(0, 6) : [];
    const products = typeof DB !== 'undefined' && DB.getProducts ? DB.getProducts().slice(0, 3) : [];

    container.innerHTML = `
      <div class="mobile-home-inner">

        ${!user ? `
          <div class="mobile-home-hero-section">
            <div class="mobile-home-greeting">
              <h1 class="mobile-home-greeting-text">${greeting}!</h1>
              <p class="mobile-home-greeting-sub">${t('home.connectFarm')}</p>
            </div>
            <div class="mobile-home-auth-cards">
              <a href="register.html?role=farmer" class="mobile-home-auth-card farmer">
                <div class="mobile-home-auth-card-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="mobile-home-auth-card-text">
                  <strong>${t('footer.regFarmer')}</strong>
                  <span>${t('home.requestWork')}</span>
                </div>
              </a>
              <a href="register.html?role=worker" class="mobile-home-auth-card worker">
                <div class="mobile-home-auth-card-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <div class="mobile-home-auth-card-text">
                  <strong>${t('footer.regWorker')}</strong>
                  <span>${t('home.findJobs')}</span>
                </div>
              </a>
            </div>
          </div>
        ` : `
          <div class="mobile-home-greeting">
            <div class="mobile-home-greeting-row">
              <div>
                <h1 class="mobile-home-greeting-text">${greeting}, ${user.name.split(' ')[0]}!</h1>
                <p class="mobile-home-greeting-sub">${t('home.welcomeBack')}</p>
              </div>
              <a href="profile.html?id=${user.id}" class="mobile-home-avatar">
                ${Utils.avatarHTML(Utils.getUserPhoto(user), user.name, 'sm')}
              </a>
            </div>
          </div>
        `}

        <div id="mobileHomeWeather">
          <div class="mobile-home-weather-card" style="opacity:.75">
            <div class="mobile-home-weather-main">
              <span class="mobile-home-weather-icon">🌤️</span>
              <div>
                <div class="mobile-home-weather-temp">--°C</div>
                <div class="mobile-home-weather-condition">Loading weather...</div>
              </div>
            </div>
          </div>
        </div>

        ${user ? `
          <div class="mobile-home-section">
            <div class="mobile-home-section-header">
              <h3>${t('home.todaySchedule')}</h3>
              <a href="calendar.html" class="mobile-home-view-all">${t('home.viewAll')} →</a>
            </div>
            <div class="mobile-home-schedule-card">
              ${todayEvents.length ? todayEvents.map(e => {
                const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : '📝';
                const bg = e.type === 'paid' ? '#dbeafe' : e.type === 'arma' ? '#dcfce7' : '#ede9fe';
                return `
                  <a href="${e.href}" class="mobile-home-schedule-item" style="display:flex;align-items:center;gap:10px;padding:12px 14px;text-decoration:none;color:inherit;border-bottom:1px solid var(--border-light)">
                    <span style="width:36px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:1rem;background:${bg}">${icon}</span>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(e.title)}</div>
                      <div style="font-size:0.72rem;color:var(--text-secondary)">${e.time ? e.time + ' · ' : ''}${e.location ? Utils.escapeHtml(e.location) : ''}</div>
                    </div>
                  </a>`;
              }).join('') : `
              <div class="mobile-home-schedule-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <p>${t('home.noSchedule')}</p>
              </div>`}
            </div>
          </div>
        ` : ''}

        <div class="mobile-home-section">
          <div class="mobile-home-section-header">
            <h3>${t('home.trendingJobs')}</h3>
            <a href="jobs.html" class="mobile-home-view-all">${t('home.viewAll')} →</a>
          </div>
          <div class="mobile-home-jobs-scroll">
            ${jobs.length ? jobs.map(job => `
              <a href="job-detail.html?id=${job.id}" class="mobile-home-job-card">
                <div class="mobile-home-job-title">${Utils.escapeHtml(job.title)}</div>
                <div class="mobile-home-job-meta">
                  <span>📍 ${job.district}</span>
                  <span>💰 ${(job.wage?.daily || 0).toLocaleString()}/day</span>
                </div>
                <div class="mobile-home-job-skills">
                  ${(job.requiredSkills || []).slice(0, 2).map(s => `<span class="badge badge-primary">${s}</span>`).join('')}
                </div>
              </a>
            `).join('') : '<div class="mobile-home-empty"><p>No jobs available yet</p></div>'}
          </div>
        </div>

        <div class="mobile-home-section">
          <div class="mobile-home-section-header">
            <h3>${t('home.nearbyUsers')}</h3>
            <a href="workers.html" class="mobile-home-view-all">${t('home.viewAll')} →</a>
          </div>
          <div class="mobile-home-users-scroll">
            ${users.slice(0, 6).map(u => `
              <a href="worker-profile.html?id=${u.id}" class="mobile-home-user-card">
                ${Utils.avatarHTML(Utils.getUserPhoto(u), u.name, 'sm')}
                <div class="mobile-home-user-name">${u.name.split(' ')[0]}</div>
                <div class="mobile-home-user-district">📍 ${u.district || ''}</div>
              </a>
            `).join('')}
          </div>
        </div>

        ${products.length ? `
          <div class="mobile-home-section">
            <div class="mobile-home-section-header">
              <h3>${t('home.marketplaceHighlights')}</h3>
              <a href="marketplace.html" class="mobile-home-view-all">${t('home.viewAll')} →</a>
            </div>
            <div class="mobile-home-products-scroll">
              ${products.map(p => `
                <a href="product-detail.html?id=${p.id}" class="mobile-home-product-card">
                  <div class="mobile-home-product-img" style="background-image:url(${p.images && p.images[0] ? p.images[0] : ''})"></div>
                  <div class="mobile-home-product-name">${Utils.escapeHtml(p.name)}</div>
                  <div class="mobile-home-product-price">NPR ${(p.price || 0).toLocaleString()}</div>
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${!user ? `
          <div class="mobile-home-cta-section">
            <div class="mobile-home-cta-card">
              <h3>${t('home.getStarted')}</h3>
              <p>${t('home.connectFarm')}</p>
              <a href="register.html" class="btn btn-primary btn-lg btn-block">${t('nav.signup')}</a>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    this.renderMobileWeather(user);
  },

  getTodaySchedule(user) {
    if (!user || typeof DB === 'undefined') return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sameDay = (d) => {
      if (!d) return false;
      const x = new Date(d);
      if (isNaN(x.getTime())) return false;
      x.setHours(0, 0, 0, 0);
      return x.getTime() === today.getTime();
    };
    const events = [];
    DB.getJobs().forEach(j => {
      if (j.status && j.status !== 'active') return;
      const isParticipant = j.farmerId === user.id || j.workerId === user.id || DB.getApplicationsByJob(j.id).some(a => a.workerId === user.id);
      if (!isParticipant) return;
      if (sameDay(j.startDate)) events.push({ title: j.title + ' starts', type: j.workMode === 'arma-parma' ? 'arma' : 'paid', href: 'job-detail.html?id=' + j.id, location: j.district, time: j.workingHours || '' });
      if (sameDay(j.endDate)) events.push({ title: j.title + ' ends', type: j.workMode === 'arma-parma' ? 'arma' : 'paid', href: 'job-detail.html?id=' + j.id, location: j.district, time: '' });
    });
    DB.getCalendarEventsByUser(user.id).forEach(ce => {
      if (sameDay(ce.date)) events.push({ title: ce.title, type: 'personal', href: 'calendar.html', location: ce.location || '', time: ce.time || '' });
    });
    DB.getArmaParmaRequests().forEach(r => {
      if (r.farmerId !== user.id && !(r.applicants || []).includes(user.id)) return;
      if (sameDay(r.startDate)) events.push({ title: r.title, type: 'arma', href: 'post-job.html?mode=arma-parma', location: r.district, time: '' });
    });
    return events.sort((a, b) => (a.time || '').localeCompare(b.time || '')).slice(0, 5);
  },

  renderMobileWeather(user) {
    const el = document.getElementById('mobileHomeWeather');
    if (!el || typeof Weather === 'undefined') return;
    const dashboardUrl = 'dashboard-' + (user && user.roles && user.roles.includes('worker') ? 'worker' : 'farmer') + '.html';
    Weather.getWeather(user?.district).then(w => {
      const alerts = typeof Weather.getAlert !== 'undefined' ? Weather.getAlert(w) : null;
      el.innerHTML = `
        <div class="mobile-home-weather-card" onclick="window.location.href='${dashboardUrl}'">
          ${alerts && alerts.length ? `<div class="mobile-home-weather-alert">⚠️ ${alerts[0]}</div>` : ''}
          <div class="mobile-home-weather-main">
            <span class="mobile-home-weather-icon">${w.current.icon}</span>
            <div>
              <div class="mobile-home-weather-temp">${w.current.temp}°C</div>
              <div class="mobile-home-weather-condition">${w.current.condition} · ${user?.district || 'Kathmandu'}</div>
            </div>
          </div>
          <div class="mobile-home-weather-details">
            <span>💧 ${w.current.humidity}%</span>
            <span>💨 ${w.current.wind} km/h</span>
            <span>🌧️ ${w.current.rain}%</span>
          </div>
        </div>`;
    }).catch(() => {
      el.innerHTML = '';
    });
  },

  initScrollEffects() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      window.addEventListener('scroll', Utils.throttle(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
      }, 100));
    }
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.navbar-dropdown.show, .lang-dropdown.show, .notification-dropdown.show, .role-switcher-dropdown.show, .nav-more-dropdown.show').forEach(d => {
        if (!d.parentElement.contains(e.target)) {
          d.classList.remove('show');
          if (d.parentElement.classList) d.parentElement.classList.remove('open');
        }
      });
      const fab = document.getElementById('mobileFAB');
      if (fab && fab.classList.contains('open') && !fab.contains(e.target)) {
        fab.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.navbar-dropdown.show, .lang-dropdown.show, .notification-dropdown.show, .role-switcher-dropdown.show, .nav-more-dropdown.show').forEach(d => {
          d.classList.remove('show');
          if (d.parentElement.classList) d.parentElement.classList.remove('open');
        });
      }
    });
  },

  initButtonRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-pill');
      if (!btn) return;
      const circle = document.createElement('span');
      circle.className = 'ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
      circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
      const existing = btn.querySelector('.ripple');
      if (existing) existing.remove();
      btn.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    });
  },

  renderJobCard(job) {
    const farmer = DB.getUserById(job.farmerId);
    const isSaved = Auth.currentUser && DB.isJobSaved(Auth.currentUser.id, job.id);
    const isArmaParma = job.workMode === 'arma-parma';
    return `
      <div class="job-card-premium hover-lift" data-animate="fadeUp">
        <div class="card-image">
          <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=300&fit=crop" alt="${Utils.escapeHtml(job.title)}" loading="lazy">
          <div class="overlay-badges">
            ${isArmaParma ? '<span class="badge badge-arma">🤝 Arma Parma</span>' : '<span class="badge badge-paid">💰 Paid</span>'}
            ${job.urgent ? '<span class="badge badge-danger">🔥 Urgent</span>' : ''}
          </div>
          <button class="save-btn ${isSaved ? 'saved' : ''}" onclick="event.preventDefault();event.stopPropagation();App.toggleSaveJob('${job.id}',this)" aria-label="${isSaved ? 'Unsave' : 'Save'} job">
            ${isSaved ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="card-body">
          <div class="card-title"><a href="job-detail.html?id=${job.id}${isArmaParma ? '&type=arma-parma' : ''}">${Utils.escapeHtml(job.title)}</a></div>
          <div class="card-meta">
            <span>📍 ${Utils.escapeHtml(job.district)}${job.municipality ? ', ' + Utils.escapeHtml(job.municipality) : ''}</span>
            <span>👥 ${job.workersNeeded || job.helpersNeeded} ${isArmaParma ? 'helpers' : 'workers'}</span>
            <span>📅 ${Utils.formatDateShort(job.startDate || job.date)}</span>
          </div>
          <div class="card-skills">
            ${(job.requiredSkills || []).slice(0, 3).map(s => `<span class="badge badge-primary">${Utils.escapeHtml(s)}</span>`).join('') || ''}
            ${job.foodProvided ? '<span class="badge badge-success">🍽️ Food</span>' : ''}
            ${job.accommodationProvided ? '<span class="badge badge-info">🏠 Stay</span>' : ''}
            ${job.teaSnacksProvided ? '<span class="badge badge-warning">🍵 Tea</span>' : ''}
            ${job.equipmentProvided ? '<span class="badge badge-info">🔧 Tools</span>' : ''}
          </div>
          <div class="card-footer">
            ${isArmaParma ? `<div class="wage"><span class="arma-credit-badge">🤝 Labor Exchange</span></div>` : `<div class="wage">${Utils.formatCurrency(job.wage?.daily || 0)}<small>/day</small></div>`}
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
      <div class="worker-card-premium hover-lift" data-animate="fadeUp">
        <div class="avatar-wrap">
          <img src="${Utils.getUserPhoto(worker) || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(worker.name)}" alt="${Utils.escapeHtml(worker.name)}">
          ${worker.verified ? '<div class="verify-badge">✓</div>' : ''}
        </div>
        <div class="name"><a href="worker-profile.html?id=${worker.id}">${Utils.escapeHtml(worker.name)}</a></div>
        <div class="location">📍 ${Utils.escapeHtml(worker.district || 'Nepal')}</div>
        ${rating > 0 ? `<div class="rating-row">${Utils.ratingHTML(rating, reviewCount)}</div>` : ''}
        <div class="skills">
          ${(worker.skills || []).slice(0, 3).map(s => `<span class="badge badge-primary">${Utils.escapeHtml(s)}</span>`).join('')}
        </div>
        <div class="wage">NPR ${(worker.expectedWage?.daily || 0).toLocaleString()}/day</div>
        <div class="actions">
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
  // FRIENDS / CONNECTIONS (Facebook-style)
  // ═══════════════════════════════════════════════════════

  friendButtonHtml(otherId) {
    const me = Auth.currentUser;
    if (!me) return `<a href="login.html" class="btn btn-outline">🤝 Add Friend</a>`;
    const status = DB.getFriendStatus(me.id, otherId);
    if (status === 'self') return '';
    const config = {
      none: { label: '🤝 Add Friend', cls: 'btn-outline' },
      pending_sent: { label: '⏳ Request Sent', cls: 'btn-outline' },
      pending_received: { label: '✅ Accept Friend', cls: 'btn-primary' },
      friends: { label: '✓ Friends', cls: 'btn-success' }
    };
    const c = config[status] || config.none;
    return `<button class="btn ${c.cls}" onclick="App.friendAction('${status}','${otherId}',this)">${c.label}</button>`;
  },

  friendCountHtml(userId) {
    const n = DB.getConnectionIds(userId).length;
    return `<div class="profile-stat"><div class="number">${n}</div><div class="label">Friends</div></div>`;
  },

  friendAction(status, otherId, el) {
    const me = Auth.currentUser;
    if (!me) { Auth.requireAuth(); return; }
    const other = DB.getUserById(otherId);
    const otherName = other ? (other.name || 'User') : 'User';
    if (status === 'none') {
      DB.sendFriendRequest(me.id, otherId);
      DB.addNotification({ userId: otherId, type: 'friend', text: `${me.name} sent you a friend request.`, link: 'friends.html' });
      Utils.toast('Friend request sent!', 'success');
    } else if (status === 'pending_sent') {
      DB.removeFriend(me.id, otherId);
      Utils.toast('Request cancelled');
    } else if (status === 'pending_received') {
      DB.acceptFriendRequest(me.id, otherId);
      DB.addNotification({ userId: otherId, type: 'friend', text: `${me.name} accepted your friend request.`, link: 'friends.html' });
      Utils.toast(`You and ${otherName} are now friends!`, 'success');
    } else if (status === 'friends') {
      DB.removeFriend(me.id, otherId);
      Utils.toast('Removed from friends');
    }
    if (el) {
      const next = this.friendButtonHtml(otherId);
      if (next) el.outerHTML = next;
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
    if (window.innerWidth <= 768) {
      this.renderFAB();
      this.renderMobileHome();
    }
    const dropdown = document.getElementById('langDropdown');
    if (dropdown) dropdown.classList.remove('show');
  },

  pickLanguage(lang) {
    this.setLanguage(lang);
    const modal = document.getElementById('langPickerModal');
    if (modal) modal.classList.remove('active');
  },

  applyLanguage(lang) {
    if (typeof I18N !== 'undefined') I18N.lang = lang;

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
