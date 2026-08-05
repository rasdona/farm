/* =====================================================================
   Social (Facebook-style) layout - self-contained enhancer
   Adds a left shortcut sidebar + right suggestions panel + mobile
   bottom navigation with slide-in menu drawer. Nothing is removed;
   all links point to existing pages.
   ===================================================================== */
(function () {
  if (window.__socialLayoutLoaded) return;
  window.__socialLayoutLoaded = true;

  var pageName = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var pageBase = pageName.replace(/\.html$/, '');

  /* Pages where this layout does not fit (auth, dashboard, admin) */
  var SKIP = ['login', 'register', 'forgot-password', 'verify', 'photo-gate', 'profile-photo', '404', 'admin', 'dashboard-', 'verify-email'];
  for (var i = 0; i < SKIP.length; i++) {
    if (pageBase.indexOf(SKIP[i]) === 0) return;
  }

  /* Inject the stylesheet once */
  if (!document.querySelector('link[data-social-layout]')) {
    var styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = 'css/social-layout.css';
    styleLink.setAttribute('data-social-layout', '');
    document.head.appendChild(styleLink);
  }

  var lang = 'en';
  try {
    if (typeof I18N !== 'undefined' && I18N.lang) lang = I18N.lang;
    else if (localStorage.getItem('agri_lang')) lang = localStorage.getItem('agri_lang');
  } catch (e) {}

  function L(en, ne) { return lang === 'ne' ? ne : en; }

  function esc(str) {
    if (typeof Utils !== 'undefined' && Utils.escapeHtml) {
      try { return Utils.escapeHtml(str); } catch (e) {}
    }
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var MENU = [
    { key: 'index', href: 'index.html', icon: '🏠', en: 'Home', ne: 'गृहपृष्ठ' },
    { key: 'community', href: 'community.html', icon: '👥', en: 'Community', ne: 'समुदाय' },
    { key: 'friends', href: 'friends.html', icon: '🤝', en: 'Friends', ne: 'साथीहरू' },
    { key: 'jobs', href: 'jobs.html', icon: '💼', en: 'Find Jobs', ne: 'रोजगारी खोज्नुहोस्' },
    { key: 'workers', href: 'workers.html', icon: '👷', en: 'Find Workers', ne: 'श्रमिक खोज्नुहोस्' },
    { key: 'marketplace', href: 'marketplace.html', icon: '🛒', en: 'Marketplace', ne: 'बजार' },
    { key: 'nearby-farmers', href: 'nearby-farmers.html', icon: '📍', en: 'Nearby Farmers', ne: 'नजिकका किसानहरू' },
    { key: 'calendar', href: 'calendar.html', icon: '📅', en: 'Calendar', ne: 'क्यालेन्डर' },
    { key: 'chat', href: 'chat.html', icon: '💬', en: 'Messages', ne: 'सन्देश' },
    { key: 'settings', href: 'settings.html', icon: '⚙️', en: 'Settings', ne: 'सेटिङ्स' }
  ];

  var MOBILE_NAV = [
    { key: 'index', href: 'index.html', icon: '🏠', en: 'Home', ne: 'गृह' },
    { key: 'jobs', href: 'jobs.html', icon: '💼', en: 'Jobs', ne: 'रोजगारी' },
    { key: 'marketplace', href: 'marketplace.html', icon: '🛒', en: 'Market', ne: 'बजार' },
    { key: 'community', href: 'community.html', icon: '👥', en: 'Community', ne: 'समुदाय' },
    { key: 'menu', href: null, icon: '☰', en: 'Menu', ne: 'मेनु' }
  ];

  var mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
  function isMobile() { return mobileQuery ? mobileQuery.matches : false; }

  function activeKey() {
    for (var i = 0; i < MENU.length; i++) {
      var k = MENU[i].key;
      if (pageBase === k || pageBase.indexOf(k) === 0) return k;
    }
    return '';
  }

  function userPhoto(u) {
    try {
      if (typeof Utils !== 'undefined' && Utils.getUserPhoto) return Utils.getUserPhoto(u);
    } catch (e) {}
    return u && u.profilePhotoUrl ? u.profilePhotoUrl : '';
  }

  function rightPanelHTML() {
    var jobs = [], workers = [], products = [];
    try {
      if (typeof DB !== 'undefined') {
        if (DB.getJobs) jobs = DB.getJobs().filter(function (j) { return j.status === 'active'; }).slice(0, 3);
        if (DB.getUsers) workers = DB.getUsers().filter(function (u) { return u.role === 'worker' && !u.suspended; }).slice(0, 3);
        if (DB.getProducts) products = DB.getProducts().slice(0, 3);
      }
    } catch (e) {}

    var html = '';

    if (jobs.length) {
      html += '<div class="fb-panel-card"><h4>🔥 ' + L('Trending Jobs', 'चर्चित रोजगारी') + '</h4>' +
        jobs.map(function (j) {
          var wage = '';
          try {
            if (j.workMode === 'arma-parma') wage = L('Labor exchange', 'श्रम आदानप्रदान');
            else if (j.wage && j.wage.daily) wage = 'NPR ' + Number(j.wage.daily).toLocaleString() + '/day';
          } catch (e) {}
          return '<a class="fb-sugg-link" href="job-detail.html?id=' + encodeURIComponent(j.id) + '">' +
            '<span class="fb-sugg-icon">💼</span>' +
            '<span><span class="fb-sugg-title">' + esc(j.title) + '</span>' +
            '<span class="fb-sugg-meta">📍 ' + esc(j.district || '') + (wage ? ' · ' + esc(wage) : '') + '</span></span></a>';
        }).join('') + '</div>';
    }

    if (workers.length) {
      html += '<div class="fb-panel-card"><h4>👷 ' + L('New Workers', 'नयाँ श्रमिकहरू') + '</h4>' +
        workers.map(function (w) {
          var photo = userPhoto(w);
          var img = photo ? '<img class="fb-sugg-avatar" src="' + esc(photo) + '" alt="">' : '<span class="fb-sugg-icon">👤</span>';
          return '<a class="fb-sugg-link" href="worker-profile.html?id=' + encodeURIComponent(w.id) + '">' + img +
            '<span><span class="fb-sugg-title">' + esc(w.name) + '</span>' +
            '<span class="fb-sugg-meta">📍 ' + esc(w.district || 'Nepal') + '</span></span></a>';
        }).join('') + '</div>';
    }

    if (products.length) {
      html += '<div class="fb-panel-card"><h4>🛒 ' + L('Latest Products', 'नयाँ उत्पादनहरू') + '</h4>' +
        products.map(function (p) {
          return '<a class="fb-sugg-link" href="product-detail.html?id=' + encodeURIComponent(p.id) + '">' +
            '<span class="fb-sugg-icon">🌱</span>' +
            '<span><span class="fb-sugg-title">' + esc(p.name) + '</span>' +
            '<span class="fb-sugg-meta">NPR ' + Number(p.price || 0).toLocaleString() + '</span></span></a>';
        }).join('') + '</div>';
    }

    html += '<div class="fb-panel-card"><h4>⚡ ' + L('Quick Help', 'द्रुत सहायता') + '</h4>' +
      '<a class="fb-sugg-link" href="about.html"><span class="fb-sugg-icon">ℹ️</span><span class="fb-sugg-title">' + L('About Ekrishi', 'एकृषिको बारेमा') + '</span></a>' +
      '<a class="fb-sugg-link" href="contact.html"><span class="fb-sugg-icon">📞</span><span class="fb-sugg-title">' + L('Contact Support', 'सम्पर्क गर्नुहोस्') + '</span></a>' +
      '<a class="fb-sugg-link" href="terms.html"><span class="fb-sugg-icon">📜</span><span class="fb-sugg-title">' + L('Terms of Service', 'सेवाका सर्तहरू') + '</span></a>' +
      '<a class="fb-sugg-link" href="privacy.html"><span class="fb-sugg-icon">🔒</span><span class="fb-sugg-title">' + L('Privacy Policy', 'गोपनीयता नीति') + '</span></a></div>';

    return html;
  }

  function menuHTML(active) {
    return MENU.map(function (m) {
      return '<a class="fb-menu-item' + (active === m.key ? ' active' : '') + '" href="' + m.href + '">' +
        '<span class="fb-icon">' + m.icon + '</span><span>' + L(m.en, m.ne) + '</span></a>';
    }).join('');
  }

  function mobileNavHTML(active) {
    return MOBILE_NAV.map(function (it) {
      if (it.href) {
        return '<a class="fb-mobile-nav-item' + (active === it.key ? ' active' : '') + '" href="' + it.href + '">' +
          '<span class="fb-mobile-icon">' + it.icon + '</span><span>' + L(it.en, it.ne) + '</span></a>';
      }
      return '<button type="button" class="fb-mobile-nav-item" id="fbMenuBtn" aria-label="' + L('Menu', 'मेनु') + '">' +
        '<span class="fb-mobile-icon">' + it.icon + '</span><span>' + L(it.en, it.ne) + '</span></button>';
    }).join('');
  }

  function openDrawer() {
    document.body.classList.add('fb-drawer-open');
  }
  function closeDrawer() {
    document.body.classList.remove('fb-drawer-open');
  }
  window.__fbOpenDrawer = openDrawer;
  window.__fbCloseDrawer = closeDrawer;

  function init() {
    if (!document.body) { window.addEventListener('DOMContentLoaded', init); return; }

    var layoutOn;
    try { layoutOn = localStorage.getItem('fb_layout') !== '0'; } catch (e) { layoutOn = true; }
    var active = activeKey();

    /* Floating toggle to turn the layout back on (shown only when off) */
    var toggle = document.createElement('button');
    toggle.className = 'fb-layout-toggle';
    toggle.title = L('Show shortcuts', 'सर्टकटहरू देखाउनुहोस्');
    toggle.setAttribute('aria-label', toggle.title);
    toggle.textContent = '☰';
    toggle.style.display = layoutOn ? 'none' : 'flex';
    toggle.onclick = function () {
      try { localStorage.setItem('fb_layout', '1'); } catch (e) {}
      location.reload();
    };
    document.body.appendChild(toggle);

    if (!layoutOn) return;

    /* Left shortcut sidebar (drawer on mobile) */
    var sidebar = document.createElement('aside');
    sidebar.className = 'fb-sidebar';
    sidebar.id = 'fbSidebar';
    sidebar.innerHTML =
      '<div class="fb-sidebar-head">' +
      '<span class="fb-sidebar-title">' + L('Shortcuts', 'सर्टकटहरू') + '</span>' +
      '<button class="fb-collapse" type="button" title="' + L('Close', 'बन्द गर्नुहोस्') + '" aria-label="' + L('Close', 'बन्द गर्नुहोस्') + '">×</button>' +
      '</div>' +
      menuHTML(active) +
      '<div class="fb-sidebar-footer"><a href="about.html">' + L('About Ekrishi', 'एकृषिको बारेमा') + '</a></div>';
    document.body.appendChild(sidebar);

    var collapse = sidebar.querySelector('.fb-collapse');
    collapse.onclick = function () {
      if (isMobile()) { closeDrawer(); }
      else {
        try { localStorage.setItem('fb_layout', '0'); } catch (e) {}
        location.reload();
      }
    };

    /* Right suggestions panel */
    var panel = document.createElement('aside');
    panel.className = 'fb-panel';
    panel.id = 'fbPanel';
    panel.innerHTML = rightPanelHTML();
    document.body.appendChild(panel);

    /* Mobile bottom navigation */
    var nav = document.createElement('nav');
    nav.className = 'fb-mobile-nav';
    nav.id = 'fbMobileNav';
    nav.innerHTML = mobileNavHTML(active);
    document.body.appendChild(nav);

    var menuBtn = document.getElementById('fbMenuBtn');
    if (menuBtn) menuBtn.onclick = openDrawer;

    var backdrop = document.createElement('div');
    backdrop.className = 'fb-drawer-backdrop';
    backdrop.id = 'fbDrawerBackdrop';
    backdrop.onclick = closeDrawer;
    document.body.appendChild(backdrop);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    document.body.classList.add('fb-on');
    document.body.classList.add('fb-right');
    document.body.classList.add('fb-mobile');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
