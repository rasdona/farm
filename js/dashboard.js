const Dashboard = {
  renderSmartDashboard() {
    const user = Auth.currentUser;
    if (!user) { window.location.href = 'login.html'; return; }
    const activeRole = Auth.getActiveRole();
    const allRoles = user.roles || [user.role || 'farmer'];
    const trustScore = DB.getTrustScore(user.id);
    const trustLevel = DB.getTrustLevel(trustScore);
    const availability = DB.getAvailabilityInfo(user.id);
    const farmProfile = DB.getFarmProfileByUser(user.id);
    const userDistrict = user.district || 'Kathmandu';
    const weather = typeof Weather !== 'undefined' ? Weather.getWeather(userDistrict) : null;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = (key) => T ? T.get(key) : key;
    const today = new Date().toISOString().split('T')[0];
    const calendarEvents = DB.getCalendarEventsByUser(user.id).filter(e => e.date === today);
    const creditInfo = DB.getLaborCreditsByUser(user.id);
    const notifs = DB.getNotifications(user.id).filter(n => !n.read).slice(0, 5);
    const chats = DB.getChatsByUser(user.id);
    const recentChats = chats.slice(0, 3);
    const roleMeta = (typeof AUTH_ROLES !== 'undefined') ? AUTH_ROLES : (typeof DB !== 'undefined' ? (DB.getRoles() || []) : []);
    const activeRoleInfo = roleMeta.find(r => r.id === activeRole) || { icon: '👤', name: activeRole, nameNe: activeRole };

    const content = document.getElementById('dashboardContent');
    if (!content) return;

    content.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            Welcome back, ${user.name.split(' ')[0]}!
            <span style="font-size:0.85rem;font-weight:500;padding:4px 12px;border-radius:16px;background:${trustLevel.color}20;color:${trustLevel.color}">${trustLevel.icon} ${trustLevel.level} — ${trustScore}/100</span>
          </h1>
          <div class="breadcrumb mt-2"><a href="index.html">Home</a><span class="separator">/</span><span class="current">Smart Dashboard</span></div>
        </div>
        <div class="dashboard-header-actions">
          <a href="profile.html?id=${user.id}" class="btn btn-outline">👤 Profile</a>
        </div>
      </div>
      ${this.renderProfileCompletion(user)}
      <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px">
        ${this._statCard(activeRoleInfo.icon, activeRoleInfo.name, 'var(--primary)', 'var(--primary-bg)')}
        ${this._statCard('📅', calendarEvents.length + ' today', '#3b82f6', '#dbeafe')}
        ${this._statCard('💰', 'NPR ' + (creditInfo.balance || 0), '#16a34a', '#dcfce7')}
        ${this._statCard('⭐', trustScore + '/100', trustLevel.color, trustLevel.color + '15')}
      </div>
      <div class="dashboard-grid-sidebar">
        <div>
          ${availability.status !== 'available' ? `
          <div class="dashboard-card" style="border-left:4px solid ${availability.status === 'busy' ? '#dc2626' : '#ca8a04'}">
            <div class="dashboard-card-body" style="display:flex;align-items:center;gap:12px">
              ${Weather.renderAvailabilityBadge(availability.status)}
              <span style="font-size:0.85rem;color:var(--text-secondary)">${availability.nextAvailable ? `Available from ${availability.nextAvailable}` : 'Busy today'}</span>
              <a href="calendar.html" class="btn btn-ghost btn-sm" style="margin-left:auto">📅 Manage</a>
            </div>
          </div>` : ''}
          ${activeRole === 'farmer' || activeRole === 'cooperative' ? this._farmerWidget(user) : ''}
          ${activeRole === 'worker' ? this._workerWidget(user) : ''}
          ${activeRole === 'seller' || activeRole === 'farmer' ? this._marketplaceWidget(user) : ''}
          ${activeRole === 'equipment_owner' || activeRole === 'farmer' ? this._equipmentWidget(user) : ''}
          ${activeRole === 'transport_provider' ? this._transportWidget(user) : ''}
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>📅 ${t('eco.todaySchedule')}</h3><a href="calendar.html" class="btn btn-ghost btn-sm">Full View</a></div>
            <div class="dashboard-card-body" id="dashboardCalendar"></div>
          </div>
        </div>
        <div>
          ${weather ? `
          <div class="dashboard-card mb-4" id="weatherWidgetContainer">
            <div class="dashboard-card-header"><h3>🌤️ ${t('eco.weather')} — ${userDistrict}</h3></div>
            <div class="dashboard-card-body" id="dashboardWeather"></div>
          </div>` : ''}
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>⚡ Quick Actions</h3></div>
            <div class="dashboard-card-body">
              <div class="quick-actions">
                ${this._quickActionsForRole(activeRole).map(qa => `<a href="${qa.href}" class="quick-action"><div class="icon">${qa.icon}</div><div class="label">${qa.label}</div></a>`).join('')}
              </div>
            </div>
          </div>
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>💬 ${t('nav.msgs')}</h3><a href="chat.html" class="btn btn-ghost btn-sm">All</a></div>
            <div class="dashboard-card-body">
              ${recentChats.length ? recentChats.map(c => {
                const otherId = c.participants?.find(id => id !== user.id);
                const other = otherId ? DB.getUserById(otherId) : null;
                const lastMsg = DB.getMessages().filter(m => m.chatId === c.id).pop();
                return `<div class="flex items-center gap-3 p-2 hover-lift" style="border-bottom:1px solid var(--border-light);border-radius:var(--radius);cursor:pointer" onclick="window.location.href='chat.html?user=${otherId}'">
                  ${Utils.avatarHTML(Utils.getUserPhoto(other), other?.name || '?', 'sm')}
                  <div class="flex-1"><div class="font-semibold text-sm">${other?.name || 'Unknown'}</div><div class="text-xs text-muted">${lastMsg ? Utils.truncate(lastMsg.text, 40) : 'No messages'}</div></div>
                </div>`;
              }).join('') : '<p class="text-muted text-center py-3">No conversations yet</p>'}
            </div>
          </div>
          ${notifs.length ? `
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>🔔 ${t('nav.notifTitle')}</h3><button class="btn btn-ghost btn-sm" onclick="App.markAllRead();location.reload()">Mark all read</button></div>
            <div class="dashboard-card-body">
              ${notifs.map(n => `
                <div class="activity-item">
                  <div class="activity-icon" style="background:var(--primary-100);color:var(--primary)">${App.getNotifIcon(n.type)}</div>
                  <div><div class="activity-text">${n.text}</div><div class="activity-time">${Utils.formatTime(n.createdAt)}</div></div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>📊 ${t('eco.trustScore')}</h3></div>
            <div class="dashboard-card-body">
              <div style="text-align:center;padding:16px">
                <div style="font-size:3rem;line-height:1">${trustLevel.icon}</div>
                <div style="font-size:2rem;font-weight:700;color:${trustLevel.color};margin:8px 0">${trustScore}</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">${trustLevel.level} Level</div>
                <div style="width:100%;height:8px;background:var(--bg-alt);border-radius:4px;overflow:hidden">
                  <div style="width:${trustScore}%;height:100%;background:${trustLevel.color};border-radius:4px;transition:width 0.5s"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.renderMiniCalendar();
      if (weather && typeof Weather !== 'undefined') {
        Weather.renderWidget('dashboardWeather', userDistrict);
      }
    }, 50);
  },

  _statCard(icon, label, color, bg) {
    return `<div class="stat-card hover-lift" style="background:${bg || 'var(--bg-card)'}"><div class="icon" style="color:${color}">${icon}</div><div><div class="label" style="font-size:0.8rem">${label}</div></div></div>`;
  },

  _farmerWidget(user) {
    const jobs = DB.getJobsByFarmer(user.id);
    const activeJobs = jobs.filter(j => j.status === 'active');
    const totalApps = jobs.reduce((sum, j) => sum + DB.getApplicationsByJob(j.id).length, 0);
    return `
      <div class="dashboard-card mb-4">
        <div class="dashboard-card-header"><h3>🌾 My Farm Activity</h3><a href="post-job.html" class="btn btn-primary btn-sm">+ Post Job</a></div>
        <div class="dashboard-card-body">
          <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">
            ${this._statCard('📋', jobs.length + ' Total Jobs', '#3b82f6', '#dbeafe')}
            ${this._statCard('✅', activeJobs.length + ' Active', '#16a34a', '#dcfce7')}
            ${this._statCard('📥', totalApps + ' Applications', '#f59e0b', '#fef3c7')}
          </div>
        </div>
      </div>`;
  },

  _workerWidget(user) {
    const applications = DB.getApplicationsByWorker(user.id);
    const pending = applications.filter(a => a.status === 'pending');
    const accepted = applications.filter(a => a.status === 'accepted');
    return `
      <div class="dashboard-card mb-4">
        <div class="dashboard-card-header"><h3>👷 My Applications</h3><a href="jobs.html" class="btn btn-primary btn-sm">Find Jobs</a></div>
        <div class="dashboard-card-body">
          <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">
            ${this._statCard('📋', applications.length + ' Total', '#3b82f6', '#dbeafe')}
            ${this._statCard('⏳', pending.length + ' Pending', '#f59e0b', '#fef3c7')}
            ${this._statCard('✅', accepted.length + ' Accepted', '#16a34a', '#dcfce7')}
          </div>
        </div>
      </div>`;
  },

  _marketplaceWidget(user) {
    const listings = DB.getListings ? DB.getListings().filter(l => l.userId === user.id) : [];
    return `
      <div class="dashboard-card mb-4">
        <div class="dashboard-card-header"><h3>🏷️ Marketplace</h3><a href="marketplace.html" class="btn btn-primary btn-sm">View All</a></div>
        <div class="dashboard-card-body">
          <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">
            ${this._statCard('📦', listings.length + ' Listings', '#8b5cf6', '#ede9fe')}
            ${this._statCard('🛒', '0 Sales', '#16a34a', '#dcfce7')}
          </div>
        </div>
      </div>`;
  },

  _equipmentWidget(user) {
    const equipment = DB.getEquipmentByOwner(user.id);
    return `
      <div class="dashboard-card mb-4">
        <div class="dashboard-card-header"><h3>🚜 Equipment</h3><a href="marketplace.html?category=equipment" class="btn btn-primary btn-sm">Manage</a></div>
        <div class="dashboard-card-body">
          <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">
            ${this._statCard('🚜', equipment.length + ' Listed', '#d97706', '#fef3c7')}
            ${this._statCard('✅', equipment.filter(e => e.available).length + ' Available', '#16a34a', '#dcfce7')}
          </div>
        </div>
      </div>`;
  },

  _transportWidget(user) {
    const vehicles = DB.getTransportByProvider(user.id);
    return `
      <div class="dashboard-card mb-4">
        <div class="dashboard-card-header"><h3>🚛 Transport</h3><a href="marketplace.html?category=transport" class="btn btn-primary btn-sm">Manage</a></div>
        <div class="dashboard-card-body">
          <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">
            ${this._statCard('🚛', vehicles.length + ' Vehicles', '#3b82f6', '#dbeafe')}
            ${this._statCard('✅', vehicles.filter(v => v.available).length + ' Available', '#16a34a', '#dcfce7')}
          </div>
        </div>
      </div>`;
  },

  _quickActionsForRole(role) {
    const base = [
      { icon: '📅', label: 'Calendar', href: 'calendar.html' },
      { icon: '💬', label: 'Messages', href: 'chat.html' },
      { icon: '👥', label: 'Community', href: 'community.html' },
      { icon: '⚙️', label: 'Settings', href: 'settings.html' },
    ];
    const roleActions = {
      farmer: [
        { icon: '📝', label: 'Post Job', href: 'post-job.html' },
        { icon: '🔍', label: 'Find Workers', href: 'workers.html' },
        { icon: '🤝', label: 'Arma Parma', href: 'jobs.html?mode=arma-parma' },
        { icon: '🌾', label: 'Farm Profile', href: 'settings.html#farm' },
        { icon: '📦', label: 'Pre-Harvest', href: 'marketplace.html?mode=pre-harvest' },
        { icon: '🚜', label: 'Equipment', href: 'marketplace.html?category=equipment' },
      ],
      worker: [
        { icon: '🔍', label: 'Find Jobs', href: 'jobs.html' },
        { icon: '🤝', label: 'Arma Parma', href: 'jobs.html?mode=arma-parma' },
        { icon: '🚛', label: 'Transport', href: 'marketplace.html?category=transport' },
      ],
      seller: [
        { icon: '📦', label: 'My Listings', href: 'marketplace.html?mine=true' },
        { icon: '🏷️', label: 'Create Listing', href: 'marketplace.html?create=true' },
      ],
      buyer: [
        { icon: '🛒', label: 'Browse', href: 'marketplace.html' },
        { icon: '📦', label: 'Pre-Harvest', href: 'marketplace.html?mode=pre-harvest' },
      ],
      equipment_owner: [
        { icon: '🚜', label: 'My Equipment', href: 'marketplace.html?category=equipment&mine=true' },
        { icon: '➕', label: 'List Equipment', href: 'marketplace.html?category=equipment&create=true' },
      ],
      transport_provider: [
        { icon: '🚛', label: 'My Vehicles', href: 'marketplace.html?category=transport&mine=true' },
        { icon: '➕', label: 'List Vehicle', href: 'marketplace.html?category=transport&create=true' },
      ],
    };
    return [...(roleActions[role] || []), ...base];
  },
  renderFarmerDashboard() {
    if (!Auth.requireRole('farmer')) return;
    const user = Auth.currentUser;
    const jobs = DB.getJobsByFarmer(user.id);
    const armaReqs = DB.getArmaParmaByUser(user.id);
    const totalApps = jobs.reduce((sum, j) => sum + DB.getApplicationsByJob(j.id).length, 0);
    const activeJobs = jobs.filter(j => j.status === 'active');
    const filledJobs = jobs.filter(j => j.status === 'filled');
    const openAP = armaReqs.filter(r => r.status === 'open');
    const recentApps = jobs.flatMap(j => DB.getApplicationsByJob(j.id).map(a => ({ ...a, jobTitle: j.title, workMode: j.workMode }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const creditInfo = DB.getLaborCreditsByUser(user.id);
    const exchanges = DB.getExchangesByUser(user.id);

    const content = document.getElementById('dashboardContent');
    if (!content) return;
    content.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1>Welcome back, ${user.name.split(' ')[0]}!</h1>
          <div class="breadcrumb mt-2"><a href="index.html">Home</a><span class="separator">/</span><span class="current">Farmer Dashboard</span></div>
        </div>
        <div class="dashboard-header-actions">
          <a href="post-job.html" class="btn btn-primary">+ Post New Job</a>
          <a href="post-job.html#arma" class="btn btn-arma" onclick="setTimeout(()=>ArmaParma.toggleWorkMode('arma-parma'),100)">🤝 Arma Parma</a>
          <a href="profile.html?id=${user.id}" class="btn btn-outline">View Profile</a>
        </div>
      </div>
      ${this.renderProfileCompletion(user)}
      <div class="stats-grid">
        <div class="stat-card hover-lift"><div class="icon green">📋</div><div><div class="number" data-count="${jobs.length}">${jobs.length}</div><div class="label">Total Jobs</div></div></div>
        <div class="stat-card hover-lift"><div class="icon blue">✅</div><div><div class="number">${activeJobs.length}</div><div class="label">Active Jobs</div></div></div>
        <div class="stat-card hover-lift"><div class="icon amber">📥</div><div><div class="number">${totalApps}</div><div class="label">Applications</div></div></div>
        <div class="stat-card hover-lift"><div class="icon purple">🤝</div><div><div class="number">${openAP.length}</div><div class="label">Arma Parma Open</div></div></div>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        <div class="stat-card hover-lift" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5)"><div class="icon green">⏱</div><div><div class="number">${creditInfo.balance >= 0 ? '+' : ''}${creditInfo.balance}</div><div class="label">Labor Credit Balance</div></div></div>
        <div class="stat-card hover-lift"><div class="icon green">⬆️</div><div><div class="number">${creditInfo.earned}</div><div class="label">Credits Earned</div></div></div>
        <div class="stat-card hover-lift"><div class="icon red">⬇️</div><div><div class="number">${creditInfo.owed}</div><div class="label">Credits Owed</div></div></div>
        <div class="stat-card hover-lift"><div class="icon blue">🔄</div><div><div class="number">${exchanges.filter(e => e.status === 'completed').length}</div><div class="label">Exchanges Done</div></div></div>
      </div>
      <div class="dashboard-grid-sidebar">
        <div>
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>Recent Applications</h3></div>
            <div class="dashboard-card-body">
              ${recentApps.length ? recentApps.map(a => {
                const worker = DB.getUserById(a.workerId);
                return `<div class="application-card">
                  ${Utils.avatarHTML(Utils.getUserPhoto(worker), worker?.name || 'W', 'lg')}
                  <div class="applicant-info">
                    <div class="applicant-name"><a href="worker-profile.html?id=${a.workerId}">${worker?.name || 'Unknown'}</a></div>
                    <div class="applicant-meta">Applied for: ${a.jobTitle} ${a.workMode === 'arma-parma' ? '<span class="badge badge-arma" style="font-size:0.65rem">🤝</span>' : ''} • ${Utils.formatTime(a.createdAt)}</div>
                    <div class="applicant-message">${Utils.truncate(a.message, 120)}</div>
                    <div class="actions">
                      ${a.status === 'pending' ? `
                        <button class="btn btn-primary btn-sm" onclick="Dashboard.handleApplication('${a.id}','accepted')">Accept</button>
                        <button class="btn btn-outline btn-sm" onclick="Dashboard.handleApplication('${a.id}','rejected')">Reject</button>
                      ` : `<span class="badge badge-${a.status === 'accepted' ? 'success' : 'danger'}">${Utils.capitalize(a.status)}</span>`}
                      <a href="chat.html?user=${a.workerId}" class="btn btn-ghost btn-sm">💬</a>
                    </div>
                  </div>
                </div>`;
              }).join('') : '<p class="text-muted text-center py-4">No applications yet</p>'}
            </div>
          </div>
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>My Jobs</h3><a href="post-job.html" class="btn btn-primary btn-sm">+ New Job</a></div>
            <div class="dashboard-card-body">
              ${jobs.length ? `<div class="table-wrapper"><table class="dashboard-table"><thead><tr><th>Job</th><th>Mode</th><th>Status</th><th>Apps</th><th>Actions</th></tr></thead><tbody>
                ${jobs.slice(0, 5).map(j => `<tr>
                  <td><a href="job-detail.html?id=${j.id}" class="font-semibold">${Utils.escapeHtml(j.title)}</a><br><small class="text-muted">${j.district}</small></td>
                  <td>${j.workMode === 'arma-parma' ? '<span class="badge badge-arma">🤝</span>' : '<span class="badge badge-paid">💰</span>'}</td>
                  <td><span class="badge badge-${j.status === 'active' ? 'success' : j.status === 'filled' ? 'info' : 'secondary'}">${Utils.capitalize(j.status)}</span></td>
                  <td>${j.applications || 0}</td>
                  <td><a href="post-job.html?edit=${j.id}" class="btn btn-ghost btn-sm">✏️</a><button class="btn btn-ghost btn-sm" onclick="Dashboard.deleteJob('${j.id}')">🗑️</button></td>
                </tr>`).join('')}
              </tbody></table></div>` : '<p class="text-muted text-center py-4">No jobs posted yet. <a href="post-job.html">Post your first job!</a></p>'}
            </div>
          </div>
          ${armaReqs.length ? `
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>🤝 My Arma Parma Requests</h3><a href="jobs.html?mode=arma-parma" class="btn btn-arma btn-sm">View All</a></div>
            <div class="dashboard-card-body">
              <div class="table-wrapper"><table class="dashboard-table"><thead><tr><th>Request</th><th>Date</th><th>Status</th><th>Applicants</th><th>Actions</th></tr></thead><tbody>
                ${armaReqs.slice(0, 5).map(r => `<tr>
                  <td><a href="job-detail.html?id=${r.id}&type=arma-parma" class="font-semibold">${Utils.escapeHtml(r.title)}</a><br><small class="text-muted">${r.cropType} • ${r.workType}</small></td>
                  <td class="text-sm">${Utils.formatDateShort(r.date)}</td>
                  <td><span class="badge badge-${r.status === 'open' ? 'success' : r.status === 'completed' ? 'info' : 'secondary'}">${Utils.capitalize(r.status)}</span></td>
                  <td>${r.applicants?.length || 0}</td>
                  <td><a href="post-job.html?edit=${r.id}&type=arma-parma" class="btn btn-ghost btn-sm">✏️</a></td>
                </tr>`).join('')}
              </tbody></table></div>
            </div>
          </div>` : ''}
        </div>
        <div>
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>Quick Actions</h3></div>
            <div class="dashboard-card-body">
              <div class="quick-actions">
                <a href="post-job.html" class="quick-action"><div class="icon">📝</div><div class="label">Post Job</div></a>
                <a href="workers.html" class="quick-action"><div class="icon">🔍</div><div class="label">Find Workers</div></a>
                <a href="jobs.html?mode=arma-parma" class="quick-action"><div class="icon">🤝</div><div class="label">Arma Parma</div></a>
                <a href="nearby-farmers.html" class="quick-action"><div class="icon">📍</div><div class="label">Nearby</div></a>
                <a href="community.html" class="quick-action"><div class="icon">👥</div><div class="label">Community</div></a>
                <a href="calendar.html" class="quick-action"><div class="icon">📅</div><div class="label">Calendar</div></a>
                <a href="chat.html" class="quick-action"><div class="icon">💬</div><div class="label">Messages</div></a>
                <a href="settings.html" class="quick-action"><div class="icon">⚙️</div><div class="label">Settings</div></a>
              </div>
            </div>
          </div>
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>📅 Work Calendar</h3><a href="calendar.html" class="btn btn-ghost btn-sm">Full View</a></div>
            <div class="dashboard-card-body" id="dashboardCalendar"></div>
          </div>
          ${exchanges.length ? `
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>🤝 Exchange History</h3></div>
            <div class="dashboard-card-body">
              ${exchanges.slice(0, 3).map(e => {
                const partner = DB.getUserById(e.farmer1Id === user.id ? e.farmer2Id : e.farmer1Id);
                return `<div class="flex items-center gap-3 p-2" style="border-bottom:1px solid var(--border-light)">
                  ${Utils.avatarHTML(Utils.getUserPhoto(partner), partner?.name || '?', 'sm')}
                  <div class="flex-1">
                    <div class="text-sm font-semibold">${partner?.name || 'Unknown'}</div>
                    <div class="text-xs text-muted">${e.cropType} • ${e.days} day${e.days > 1 ? 's' : ''}</div>
                  </div>
                  <span class="badge badge-${e.status === 'completed' ? 'success' : 'warning'}" style="font-size:0.7rem">${Utils.capitalize(e.status)}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>Recent Activity</h3></div>
            <div class="dashboard-card-body">
              ${this.renderActivityFeed(user.id)}
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => this.renderMiniCalendar(), 50);
  },

  renderWorkerDashboard() {
    if (!Auth.requireRole('worker')) return;
    const user = Auth.currentUser;
    const applications = DB.getApplicationsByWorker(user.id);
    const pending = applications.filter(a => a.status === 'pending');
    const accepted = applications.filter(a => a.status === 'accepted');
    const savedJobs = DB.getSavedJobs(user.id);
    const rating = DB.getAvgRating(user.id);
    const creditInfo = DB.getLaborCreditsByUser(user.id);
    const exchanges = DB.getExchangesByUser(user.id);
    const apApplications = DB.getArmaParmaRequests().filter(r => r.applicants?.includes(user.id));

    const content = document.getElementById('dashboardContent');
    if (!content) return;
    content.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1>Welcome back, ${user.name.split(' ')[0]}!</h1>
          <div class="breadcrumb mt-2"><a href="index.html">Home</a><span class="separator">/</span><span class="current">Worker Dashboard</span></div>
        </div>
        <div class="dashboard-header-actions">
          <a href="jobs.html" class="btn btn-primary">🔍 Find Jobs</a>
          <a href="jobs.html?mode=arma-parma" class="btn btn-arma">🤝 Arma Parma</a>
          <a href="profile.html?id=${user.id}" class="btn btn-outline">View Profile</a>
        </div>
      </div>
      ${this.renderProfileCompletion(user)}
      <div class="stats-grid">
        <div class="stat-card hover-lift"><div class="icon blue">📋</div><div><div class="number">${applications.length}</div><div class="label">Total Applications</div></div></div>
        <div class="stat-card hover-lift"><div class="icon amber">⏳</div><div><div class="number">${pending.length}</div><div class="label">Pending</div></div></div>
        <div class="stat-card hover-lift"><div class="icon green">✅</div><div><div class="number">${accepted.length}</div><div class="label">Accepted</div></div></div>
        <div class="stat-card hover-lift"><div class="icon red">⭐</div><div><div class="number">${rating > 0 ? rating : '-'}</div><div class="label">Rating</div></div></div>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        <div class="stat-card hover-lift" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5)"><div class="icon green">⏱</div><div><div class="number">${creditInfo.balance >= 0 ? '+' : ''}${creditInfo.balance}</div><div class="label">Labor Credits</div></div></div>
        <div class="stat-card hover-lift"><div class="icon green">⬆️</div><div><div class="number">${creditInfo.earned}</div><div class="label">Earned</div></div></div>
        <div class="stat-card hover-lift"><div class="icon red">⬇️</div><div><div class="number">${creditInfo.owed}</div><div class="label">Owed</div></div></div>
        <div class="stat-card hover-lift"><div class="icon purple">🤝</div><div><div class="number">${apApplications.length}</div><div class="label">AP Applied</div></div></div>
      </div>
      <div class="dashboard-grid-sidebar">
        <div>
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>My Applications</h3><a href="jobs.html" class="btn btn-primary btn-sm">Find More Jobs</a></div>
            <div class="dashboard-card-body">
              ${applications.length ? `<div class="table-wrapper"><table class="dashboard-table"><thead><tr><th>Job</th><th>Farmer</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead><tbody>
                ${applications.map(a => {
                  const job = DB.getJobById(a.jobId);
                  const farmer = job ? DB.getUserById(job.farmerId) : null;
                  return `<tr>
                    <td><a href="job-detail.html?id=${a.jobId}" class="font-semibold">${job ? Utils.escapeHtml(job.title) : 'Unknown Job'}</a></td>
                    <td>${farmer ? `<div class="flex items-center gap-2">${Utils.avatarHTML(Utils.getUserPhoto(farmer), farmer.name, 'sm')}<span>${farmer.name.split(' ')[0]}</span></div>` : '-'}</td>
                    <td><span class="badge badge-${a.status === 'accepted' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning'}">${Utils.capitalize(a.status)}</span></td>
                    <td class="text-sm text-muted">${Utils.formatTime(a.createdAt)}</td>
                    <td><a href="chat.html?user=${farmer?.id || ''}" class="btn btn-ghost btn-sm">💬</a></td>
                  </tr>`;
                }).join('')}
              </tbody></table></div>` : '<p class="text-muted text-center py-4">No applications yet. <a href="jobs.html">Browse jobs!</a></p>'}
            </div>
          </div>
          ${apApplications.length ? `
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>🤝 My Arma Parma Applications</h3></div>
            <div class="dashboard-card-body">
              ${apApplications.map(r => {
                const farmer = DB.getUserById(r.farmerId);
                return `<div class="flex items-center gap-3 p-3 hover-lift" style="border-bottom:1px solid var(--border-light);border-radius:var(--radius);cursor:pointer" onclick="window.location.href='job-detail.html?id=${r.id}&type=arma-parma'">
                  <div class="flex-1">
                    <div class="font-semibold text-sm">${Utils.escapeHtml(r.title)}</div>
                    <div class="text-xs text-muted">📍 ${r.district} | 🤝 ${r.cropType} | 📅 ${Utils.formatDateShort(r.date)}</div>
                  </div>
                  <span class="badge badge-arma" style="font-size:0.7rem">Arma Parma</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>Recommended Jobs</h3><a href="jobs.html" class="btn btn-ghost btn-sm">View All</a></div>
            <div class="dashboard-card-body">
              ${this.getRecommendedJobs(user).map(j => `
                <div class="flex items-center gap-3 p-3 hover-lift" style="border-bottom:1px solid var(--border-light);border-radius:var(--radius);cursor:pointer" onclick="window.location.href='job-detail.html?id=${j.id}'">
                  <div class="flex-1">
                    <div class="font-semibold text-sm">${Utils.escapeHtml(j.title)}</div>
                    <div class="text-xs text-muted">📍 ${j.district} | ${j.workMode === 'arma-parma' ? '🤝 Exchange' : '💰 NPR ' + (j.wage?.daily || 0) + '/day'}</div>
                  </div>
                  <span class="badge badge-primary btn-sm">${j.workMode === 'arma-parma' ? '🤝' : 'Apply'}</span>
                </div>
              `).join('') || '<p class="text-muted text-center py-3">No recommended jobs</p>'}
            </div>
          </div>
        </div>
        <div>
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>Quick Actions</h3></div>
            <div class="dashboard-card-body">
              <div class="quick-actions">
                <a href="jobs.html" class="quick-action"><div class="icon">🔍</div><div class="label">Find Jobs</div></a>
                <a href="jobs.html?mode=arma-parma" class="quick-action"><div class="icon">🤝</div><div class="label">Arma Parma</div></a>
                <a href="community.html" class="quick-action"><div class="icon">👥</div><div class="label">Community</div></a>
                <a href="calendar.html" class="quick-action"><div class="icon">📅</div><div class="label">Calendar</div></a>
                <a href="chat.html" class="quick-action"><div class="icon">💬</div><div class="label">Messages</div></a>
                <a href="settings.html" class="quick-action"><div class="icon">⚙️</div><div class="label">Settings</div></a>
                <a href="profile.html?id=${user.id}" class="quick-action"><div class="icon">👤</div><div class="label">Profile</div></a>
              </div>
            </div>
          </div>
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>📅 Work Calendar</h3><a href="calendar.html" class="btn btn-ghost btn-sm">Full View</a></div>
            <div class="dashboard-card-body" id="dashboardCalendar"></div>
          </div>
          ${exchanges.length ? `
          <div class="dashboard-card mb-4">
            <div class="dashboard-card-header"><h3>🤝 Exchange History</h3></div>
            <div class="dashboard-card-body">
              ${exchanges.slice(0, 3).map(e => {
                const partner = DB.getUserById(e.farmer1Id === user.id ? e.farmer2Id : e.farmer1Id);
                return `<div class="flex items-center gap-3 p-2" style="border-bottom:1px solid var(--border-light)">
                  ${Utils.avatarHTML(Utils.getUserPhoto(partner), partner?.name || '?', 'sm')}
                  <div class="flex-1">
                    <div class="text-sm font-semibold">${partner?.name || 'Unknown'}</div>
                    <div class="text-xs text-muted">${e.cropType} • ${e.days} day${e.days > 1 ? 's' : ''}</div>
                  </div>
                  <span class="badge badge-${e.status === 'completed' ? 'success' : 'warning'}" style="font-size:0.7rem">${Utils.capitalize(e.status)}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}
          <div class="dashboard-card">
            <div class="dashboard-card-header"><h3>Recent Activity</h3></div>
            <div class="dashboard-card-body">${this.renderActivityFeed(user.id)}</div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => this.renderMiniCalendar(), 50);
  },

  renderProfileCompletion(user) {
    const completion = AuthSystem.getProfileCompletion(user);
    const pct = completion.percentage;
    const tasks = completion.tasks;
    return `<div class="profile-completion"><div class="profile-completion-header"><h4>Profile Completion</h4><span class="font-bold">${pct}%</span></div><div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>${tasks.length ? `<div class="profile-completion-tasks">${tasks.map(t => `<span class="profile-completion-task">○ ${t}</span>`).join('')}</div>` : '<p class="text-sm" style="color:var(--primary)">Your profile is complete!</p>'}</div>`;
  },

  renderActivityFeed(userId) {
    const notifs = DB.getNotifications(userId).slice(0, 5);
    if (!notifs.length) return '<p class="text-muted text-center py-3">No recent activity</p>';
    return notifs.map(n => `
      <div class="activity-item">
        <div class="activity-icon" style="background:var(--primary-100);color:var(--primary)">${App.getNotifIcon(n.type)}</div>
        <div><div class="activity-text">${n.text}</div><div class="activity-time">${Utils.formatTime(n.createdAt)}</div></div>
      </div>
    `).join('');
  },

  getRecommendedJobs(worker) {
    const skills = worker.skills || [];
    return DB.getJobs().filter(j => j.status === 'active' && (j.requiredSkills?.some(s => skills.includes(s)) || j.district === worker.district)).slice(0, 5);
  },

  renderMiniCalendar() {
    const el = document.getElementById('dashboardCalendar');
    if (!el) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayLabels = ['S','M','T','W','T','F','S'];
    const user = Auth.currentUser;

    const events = [];
    DB.getJobs().forEach(j => {
      if (user && j.farmerId !== user.id && j.workerId !== user.id) return;
      if (j.startDate) events.push({ date: j.startDate, type: j.workMode === 'arma-parma' ? 'arma' : 'paid' });
    });
    DB.getArmaParmaRequests().forEach(r => {
      if (user && r.farmerId !== user.id && !r.applicants?.includes(user.id)) return;
      if (r.startDate) events.push({ date: r.startDate, type: 'arma' });
    });
    const eventDays = events.map(e => new Date(e.date).getDate());
    const armaDays = events.filter(e => e.type === 'arma').map(e => new Date(e.date).getDate());

    let html = `<div style="text-align:center;margin-bottom:10px;font-weight:600;color:var(--text)">${monthNames[month]} ${year}</div>`;
    html += '<div class="work-calendar-mini"><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">';
    dayLabels.forEach(d => { html += `<div style="font-size:0.65rem;font-weight:600;color:var(--text-tertiary);padding:4px 0">${d}</div>`; });
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === now.getDate();
      const hasEvent = eventDays.includes(d);
      const hasArma = armaDays.includes(d);
      const cls = isToday ? 'today' : hasArma ? 'has-arma' : hasEvent ? 'has-event' : '';
      html += `<div class="day ${cls}" style="width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:0.75rem;cursor:pointer;margin:1px;${isToday ? 'background:var(--primary);color:white;font-weight:700;' : hasArma ? 'background:#059669;color:white;' : hasEvent ? 'background:var(--primary);color:white;' : ''}">${d}</div>`;
    }
    html += '</div></div>';
    html += `<div style="display:flex;gap:12px;margin-top:10px;justify-content:center;font-size:0.7rem;color:var(--text-tertiary)">
      <span><span style="display:inline-block;width:8px;height:8px;background:var(--primary);border-radius:50%;margin-right:4px"></span>Paid Job</span>
      <span><span style="display:inline-block;width:8px;height:8px;background:#059669;border-radius:50%;margin-right:4px"></span>Arma Parma</span>
    </div>`;
    el.innerHTML = html;
  },

  handleApplication(appId, status) {
    const app = DB.getApplications().find(a => a.id === appId);
    if (!app) return;
    DB.updateApplication(appId, { status });
    const worker = DB.getUserById(app.workerId);
    const job = DB.getJobById(app.jobId);
    DB.addNotification({ userId: app.workerId, type: status, text: `Your application for "${job?.title || 'a job'}" has been ${status}`, link: `job-detail.html?id=${app.jobId}` });
    Utils.toast(`Application ${status}!`, status === 'accepted' ? 'success' : 'info');
    setTimeout(() => location.reload(), 1000);
  },

  deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;
    DB.deleteJob(jobId);
    Utils.toast('Job deleted');
    setTimeout(() => location.reload(), 500);
  }
};
