const Admin = {
  currentTab: 'overview',

  init() {
    if (!Auth.requireRole('admin')) return;
    this.renderSidebar();
    this.renderOverview();
  },

  renderSidebar() {
    const nav = document.getElementById('adminNav');
    if (!nav) return;
    const stats = DB.getStats();
    nav.innerHTML = `
      <div class="admin-sidebar-header"><h3>Admin Panel</h3><p>AgriConnect Nepal</p></div>
      <div class="admin-sidebar-section">Main</div>
      <a href="#" class="active" onclick="Admin.renderOverview();return false"><span class="icon">📊</span><span class="nav-text">Overview</span></a>
      <a href="#" onclick="Admin.renderUsers();return false"><span class="icon">👥</span><span class="nav-text">Users</span><span class="badge">${stats.totalUsers}</span></a>
      <a href="#" onclick="Admin.renderJobs();return false"><span class="icon">💼</span><span class="nav-text">Jobs</span><span class="badge">${stats.totalJobs}</span></a>
      <a href="#" onclick="Admin.renderApplications();return false"><span class="icon">📋</span><span class="nav-text">Applications</span></a>
      <div class="admin-sidebar-section">Management</div>
      <a href="#" onclick="Admin.renderReports();return false"><span class="icon">⚠️</span><span class="nav-text">Reports</span></a>
      <a href="#" onclick="Admin.renderAnnouncements();return false"><span class="icon">📢</span><span class="nav-text">Announcements</span></a>
      <a href="#" onclick="Admin.renderCategories();return false"><span class="icon">🏷️</span><span class="nav-text">Categories</span></a>
      <a href="#" onclick="Admin.renderFAQs();return false"><span class="icon">❓</span><span class="nav-text">FAQs</span></a>
      <div class="admin-sidebar-section">System</div>
      <a href="#" onclick="Admin.renderAuditLogs();return false"><span class="icon">📜</span><span class="nav-text">Audit Logs</span></a>
      <a href="#" onclick="Admin.renderSettings();return false"><span class="icon">⚙️</span><span class="nav-text">Settings</span></a>
    `;
  },

  setActiveNav(el) {
    document.querySelectorAll('#adminNav a').forEach(a => a.classList.remove('active'));
    if (el) el.classList.add('active');
  },

  renderOverview() {
    const stats = DB.getStats();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Admin Dashboard</h1></div>
      <div class="admin-stats">
        <div class="stat-card hover-lift"><div class="icon green">👥</div><div><div class="number">${stats.totalUsers}</div><div class="label">Total Users</div></div></div>
        <div class="stat-card hover-lift"><div class="icon blue">💼</div><div><div class="number">${stats.totalJobs}</div><div class="label">Total Jobs</div></div></div>
        <div class="stat-card hover-lift"><div class="icon amber">📋</div><div><div class="number">${stats.totalApplications}</div><div class="label">Applications</div></div></div>
        <div class="stat-card hover-lift"><div class="icon red">✅</div><div><div class="number">${stats.verifiedUsers}</div><div class="label">Verified Users</div></div></div>
      </div>
      <div class="dashboard-grid-2">
        <div class="dashboard-card">
          <div class="dashboard-card-header"><h3>User Distribution</h3></div>
          <div class="dashboard-card-body">
            <div class="flex justify-between mb-2"><span>🌾 Farmers</span><strong>${stats.totalFarmers}</strong></div>
            <div class="progress mb-4"><div class="progress-bar" style="width:${stats.totalUsers ? (stats.totalFarmers/stats.totalUsers*100) : 0}%;background:var(--accent)"></div></div>
            <div class="flex justify-between mb-2"><span>👷 Workers</span><strong>${stats.totalWorkers}</strong></div>
            <div class="progress"><div class="progress-bar" style="width:${stats.totalUsers ? (stats.totalWorkers/stats.totalUsers*100) : 0}%"></div></div>
          </div>
        </div>
        <div class="dashboard-card">
          <div class="dashboard-card-header"><h3>Job Status</h3></div>
          <div class="dashboard-card-body">
            <div class="flex justify-between mb-2"><span>✅ Active</span><strong>${stats.activeJobs}</strong></div>
            <div class="progress mb-4"><div class="progress-bar" style="width:${stats.totalJobs ? (stats.activeJobs/stats.totalJobs*100) : 0}%"></div></div>
            <div class="flex justify-between mb-2"><span>🎯 Filled</span><strong>${stats.filledJobs}</strong></div>
            <div class="progress"><div class="progress-bar" style="width:${stats.totalJobs ? (stats.filledJobs/stats.totalJobs*100) : 0}%;background:var(--accent)"></div></div>
          </div>
        </div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card-header"><h3>Recent Users</h3></div>
        <div class="dashboard-card-body">
          <div class="table-wrapper"><table class="admin-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
            ${DB.getUsers().slice(-5).reverse().map(u => `<tr>
              <td><div class="flex items-center gap-3">${Utils.avatarHTML(Utils.getUserPhoto(u), u.name, 'sm')}<div><div class="font-semibold">${u.name}</div><div class="text-xs text-muted">${u.email}</div></div></div></td>
              <td><span class="badge badge-${u.role === 'farmer' ? 'accent' : u.role === 'admin' ? 'danger' : 'primary'}">${Utils.capitalize(u.role)}</span></td>
              <td>${u.verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-secondary">Unverified</span>'}${u.suspended ? ' <span class="badge badge-danger">Suspended</span>' : ''}</td>
              <td class="text-sm text-muted">${Utils.formatTime(u.createdAt)}</td>
              <td><div class="actions"><button class="view" onclick="Admin.viewUser('${u.id}')">👁️</button>${!u.verified ? `<button class="edit" onclick="Admin.verifyUser('${u.id}')">✅</button>` : ''}${u.role !== 'admin' ? `<button class="delete" onclick="Admin.suspendUser('${u.id}')">🚫</button>` : ''}</div></td>
            </tr>`).join('')}
          </tbody></table></div>
        </div>
      </div>
    `;
  },

  renderUsers() {
    const users = DB.getUsers();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>User Management</h1><div class="flex gap-2"><select class="form-select" id="adminUserFilter" onchange="Admin.filterUsers()" style="width:auto"><option value="">All Roles</option><option value="farmer">Farmers</option><option value="worker">Workers</option><option value="admin">Admins</option></select></div></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        <div class="table-wrapper"><table class="admin-table"><thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Verified</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody id="adminUsersTable">
          ${this.renderUserRows(users)}
        </tbody></table></div>
      </div></div>
    `;
  },

  renderUserRows(users) {
    return users.map(u => `<tr>
      <td><div class="flex items-center gap-3">${Utils.avatarHTML(Utils.getUserPhoto(u), u.name, 'sm')}<div><div class="font-semibold">${u.name}</div><div class="text-xs text-muted">${u.email}</div></div></div></td>
      <td class="text-sm">${u.phone || '-'}</td>
      <td><span class="badge badge-${u.role === 'farmer' ? 'accent' : u.role === 'admin' ? 'danger' : 'primary'}">${Utils.capitalize(u.role)}</span></td>
      <td>${u.verified ? '✅' : '❌'}</td>
      <td>${u.suspended ? '<span class="badge badge-danger">Suspended</span>' : '<span class="badge badge-success">Active</span>'}</td>
      <td class="text-sm text-muted">${Utils.formatTime(u.createdAt)}</td>
      <td><div class="actions"><button class="view" onclick="Admin.viewUser('${u.id}')">👁️</button>${!u.verified ? `<button class="edit" onclick="Admin.verifyUser('${u.id}')" title="Verify">✅</button>` : ''}${u.suspended ? `<button class="edit" onclick="Admin.restoreUser('${u.id}')" title="Restore">🔄</button>` : `<button class="delete" onclick="Admin.suspendUser('${u.id}')" title="Suspend">🚫</button>`}</div></td>
    </tr>`).join('');
  },

  filterUsers() {
    const role = document.getElementById('adminUserFilter')?.value;
    let users = DB.getUsers();
    if (role) users = users.filter(u => u.role === role);
    document.getElementById('adminUsersTable').innerHTML = this.renderUserRows(users);
  },

  viewUser(id) {
    const u = DB.getUserById(id);
    if (u) Utils.toast(`Viewing: ${u.name} (${u.email})`, 'info');
  },

  verifyUser(id) {
    DB.updateUser(id, { verified: true, phoneVerified: true, emailVerified: true });
    DB.addAuditLog({ action: 'user_verified', userId: id, details: `User verified by admin: ${DB.getUserById(id)?.name}` });
    DB.addNotification({ userId: id, type: 'verification', text: 'Your account has been verified!', link: '#' });
    Utils.toast('User verified!');
    this.renderUsers();
    this.renderSidebar();
  },

  suspendUser(id) {
    if (!confirm('Suspend this user?')) return;
    DB.updateUser(id, { suspended: true });
    DB.addAuditLog({ action: 'user_suspended', userId: id, details: `User suspended by admin: ${DB.getUserById(id)?.name}` });
    Utils.toast('User suspended');
    this.renderUsers();
    this.renderSidebar();
  },

  restoreUser(id) {
    DB.updateUser(id, { suspended: false });
    DB.addAuditLog({ action: 'user_restored', userId: id, details: `User restored by admin: ${DB.getUserById(id)?.name}` });
    Utils.toast('User restored');
    this.renderUsers();
    this.renderSidebar();
  },

  renderJobs() {
    const jobs = DB.getJobs();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Job Management</h1></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        <div class="table-wrapper"><table class="admin-table"><thead><tr><th>Job</th><th>Farmer</th><th>Status</th><th>Apps</th><th>Posted</th><th>Actions</th></tr></thead><tbody>
          ${jobs.map(j => {
            const farmer = DB.getUserById(j.farmerId);
            return `<tr>
              <td><a href="job-detail.html?id=${j.id}" class="font-semibold">${Utils.escapeHtml(j.title)}</a><br><small class="text-muted">${j.district}</small></td>
              <td>${farmer?.name || 'Unknown'}</td>
              <td><span class="badge badge-${j.status === 'active' ? 'success' : j.status === 'filled' ? 'info' : 'secondary'}">${Utils.capitalize(j.status)}</span></td>
              <td>${j.applications || 0}</td>
              <td class="text-sm text-muted">${Utils.formatTime(j.createdAt)}</td>
              <td><div class="actions"><button class="view" onclick="window.location.href='job-detail.html?id=${j.id}'">👁️</button><button class="delete" onclick="Admin.deleteJob('${j.id}')">🗑️</button></div></td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      </div></div>
    `;
  },

  deleteJob(id) {
    if (!confirm('Delete this job?')) return;
    DB.deleteJob(id);
    Utils.toast('Job deleted');
    this.renderJobs();
    this.renderSidebar();
  },

  renderApplications() {
    const apps = DB.getApplications();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Applications</h1></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        <div class="table-wrapper"><table class="admin-table"><thead><tr><th>Worker</th><th>Job</th><th>Status</th><th>Applied</th></tr></thead><tbody>
          ${apps.map(a => {
            const worker = DB.getUserById(a.workerId);
            const job = DB.getJobById(a.jobId);
            return `<tr>
              <td><div class="flex items-center gap-2">${Utils.avatarHTML(Utils.getUserPhoto(worker), worker?.name || 'W', 'sm')}<span>${worker?.name || 'Unknown'}</span></div></td>
              <td>${job ? Utils.escapeHtml(job.title) : 'Deleted'}</td>
              <td><span class="badge badge-${a.status === 'accepted' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning'}">${Utils.capitalize(a.status)}</span></td>
              <td class="text-sm text-muted">${Utils.formatTime(a.createdAt)}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      </div></div>
    `;
  },

  renderAuditLogs() {
    const logs = DB.getAuditLogs().reverse();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Audit Logs</h1></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        <div class="admin-log">
          ${logs.map(l => `<div class="log-entry"><span class="log-time">[${new Date(l.createdAt).toLocaleString()}]</span> <span class="log-level ${l.action.includes('suspend') ? 'error' : l.action.includes('verify') ? 'info' : 'warn'}">[${l.action.toUpperCase()}]</span> ${l.details}</div>`).join('')}
        </div>
      </div></div>
    `;
  },

  renderAnnouncements() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Announcements</h1><button class="btn btn-primary" onclick="Admin.showAnnouncementModal()">+ New Announcement</button></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        ${DB.getAnnouncements().length ? DB.getAnnouncements().map(a => `
          <div class="p-4" style="border-bottom:1px solid var(--border-light)"><div class="font-semibold">${a.title}</div><div class="text-sm text-muted mt-1">${a.message}</div><div class="text-xs text-muted mt-2">${Utils.formatTime(a.createdAt)}</div></div>
        `).join('') : '<p class="text-muted text-center py-4">No announcements yet</p>'}
      </div></div>
    `;
  },

  showAnnouncementModal() {
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    modal.querySelector('.modal-body').innerHTML = `
      <h4 class="mb-4">New Announcement</h4>
      <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="annTitle" placeholder="Announcement title"></div>
      <div class="form-group"><label class="form-label">Message</label><textarea class="form-textarea" id="annMessage" rows="4" placeholder="Announcement message"></textarea></div>
    `;
    modal.querySelector('.modal-footer').innerHTML = `
      <button class="btn btn-ghost" onclick="Utils.hideModal('adminModal')">Cancel</button>
      <button class="btn btn-primary" onclick="Admin.postAnnouncement()">Send</button>
    `;
    Utils.showModal('adminModal');
  },

  postAnnouncement() {
    const title = document.getElementById('annTitle')?.value.trim();
    const message = document.getElementById('annMessage')?.value.trim();
    if (!title || !message) { Utils.toast('Fill in all fields', 'warning'); return; }
    DB.addAnnouncement({ title, message, createdBy: Auth.currentUser.id });
    Utils.hideModal('adminModal');
    Utils.toast('Announcement sent!');
    this.renderAnnouncements();
  },

  renderCategories() {
    const cats = DB.getCategories();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Categories</h1></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        <div class="grid grid-3 gap-4">
          ${cats.map(c => `<div class="card hover-lift"><div class="card-body text-center"><div style="font-size:2rem">${c.icon}</div><div class="font-semibold mt-2">${c.name}</div><div class="text-sm text-muted">${c.count} jobs</div></div></div>`).join('')}
        </div>
      </div></div>
    `;
  },

  renderFAQs() {
    const faqs = DB.getFaqs();
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>FAQs</h1></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        ${faqs.map((f, i) => `
          <div class="accordion-item ${i === 0 ? 'open' : ''}">
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')"><span>${f.question}</span><span class="icon">▼</span></div>
            <div class="accordion-body"><p>${f.answer}</p></div>
          </div>
        `).join('')}
      </div></div>
    `;
  },

  renderReports() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>Reports & Complaints</h1></div>
      <div class="empty-state" style="padding:60px"><div class="icon">📭</div><h3>No Reports Yet</h3><p>User reports and complaints will appear here.</p></div>
    `;
  },

  renderSettings() {
    const content = document.getElementById('adminContent');
    content.innerHTML = `
      <div class="dashboard-header"><h1>System Settings</h1></div>
      <div class="dashboard-card"><div class="dashboard-card-body">
        <div class="settings-group">
          <h4 class="mb-4">Platform Settings</h4>
          <div class="settings-row"><div><div class="settings-row-label">Platform Name</div><div class="settings-row-desc">AgriConnect Nepal</div></div><button class="btn btn-outline btn-sm">Edit</button></div>
          <div class="settings-row"><div><div class="settings-row-label">Registration</div><div class="settings-row-desc">Allow new user registration</div></div><label class="toggle"><input type="checkbox" checked><span class="slider"></span></label></div>
          <div class="settings-row"><div><div class="settings-row-label">Email Verification</div><div class="settings-row-desc">Require email verification for new accounts</div></div><label class="toggle"><input type="checkbox" checked><span class="slider"></span></label></div>
          <div class="settings-row"><div><div class="settings-row-label">Job Auto-Approval</div><div class="settings-row-desc">Automatically approve new job postings</div></div><label class="toggle"><input type="checkbox" checked><span class="slider"></span></label></div>
        </div>
        <div class="settings-group mt-4">
          <h4 class="mb-4">Database</h4>
          <div class="flex gap-2">
            <button class="btn btn-outline" onclick="if(confirm('Reset all data? This cannot be undone.')){DB.reset();location.reload()}">🔄 Reset Database</button>
            <button class="btn btn-outline" onclick="Utils.toast('Backup downloaded','success')">📥 Export Data</button>
          </div>
        </div>
      </div></div>
    `;
  }
};
