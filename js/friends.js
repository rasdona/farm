const Friends = {
  activeTab: 'requests',

  init() {
    if (!Auth.requireAuth()) return;
    this.showTab(this.activeTab);
  },

  showTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('#friendsTabs .tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this.render();
  },

  search(value) {
    this.showTab('find');
  },

  render() {
    const me = Auth.currentUser;
    if (!me) return;
    const reqCount = DB.getFriendRequests(me.id).length;
    const frCount = DB.getConnectionIds(me.id).length;
    const reqEl = document.getElementById('reqCount');
    const frEl = document.getElementById('frCount');
    if (reqEl) reqEl.textContent = reqCount;
    if (frEl) frEl.textContent = frCount;
    const el = document.getElementById('friendsContent');
    if (!el) return;
    if (this.activeTab === 'requests') el.innerHTML = this.renderRequests();
    else if (this.activeTab === 'friends') el.innerHTML = this.renderFriends();
    else el.innerHTML = this.renderFind(document.getElementById('friendSearchInput')?.value || '');
  },

  renderRequests() {
    const me = Auth.currentUser;
    const reqs = DB.getFriendRequests(me.id);
    if (!reqs.length) return this.empty('📭', 'No friend requests', 'When someone adds you as a friend, it will show here.');
    return reqs.map(r => {
      const u = DB.getUserById(r.userId);
      if (!u) return '';
      return `
        <div class="card mb-3">
          <div class="card-body" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <a href="worker-profile.html?id=${u.id}">${Utils.avatarHTML(Utils.getUserPhoto(u), u.name, 'lg')}</a>
            <div style="flex:1;min-width:120px">
              <a href="worker-profile.html?id=${u.id}" class="font-semibold">${Utils.escapeHtml(u.name)}</a>
              <div class="text-muted text-sm">📍 ${Utils.escapeHtml(u.district || 'Nepal')}${u.role === 'worker' ? ' · 👷 Worker' : u.role === 'farmer' ? ' · 🌾 Farmer' : ''}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="Friends.respond('${u.id}','accept')">✅ Accept</button>
              <button class="btn btn-outline btn-sm" onclick="Friends.respond('${u.id}','reject')">✕ Decline</button>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  respond(userId, action) {
    const me = Auth.currentUser;
    if (action === 'accept') {
      DB.acceptFriendRequest(me.id, userId);
      const u = DB.getUserById(userId);
      DB.addNotification({ userId, type: 'friend', text: `${me.name} accepted your friend request.`, link: 'friends.html' });
      Utils.toast(`You and ${u ? u.name : 'this user'} are now friends!`, 'success');
    } else {
      DB.rejectFriendRequest(me.id, userId);
      Utils.toast('Request declined');
    }
    this.render();
  },

  renderFriends() {
    const me = Auth.currentUser;
    const friends = DB.getConnections(me.id);
    if (!friends.length) return this.empty('👥', 'No friends yet', 'Use "Find People" to add farmers and workers.');
    return `<div class="grid grid-auto gap-4">` + friends.map(u => `
      <div class="card">
        <div class="card-body" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <a href="worker-profile.html?id=${u.id}">${Utils.avatarHTML(Utils.getUserPhoto(u), u.name, 'lg')}</a>
          <div style="flex:1;min-width:110px">
            <a href="worker-profile.html?id=${u.id}" class="font-semibold">${Utils.escapeHtml(u.name)}</a>
            <div class="text-muted text-sm">📍 ${Utils.escapeHtml(u.district || 'Nepal')}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="chat.html?user=${u.id}" class="btn btn-primary btn-sm">💬 Message</a>
            <button class="btn btn-outline btn-sm" onclick="Friends.remove('${u.id}')">✕ Unfriend</button>
          </div>
        </div>
      </div>`).join('') + `</div>`;
  },

  remove(userId) {
    const me = Auth.currentUser;
    if (confirm('Remove this friend?')) {
      DB.removeFriend(me.id, userId);
      Utils.toast('Removed from friends');
      this.render();
    }
  },

  renderFind(query) {
    const me = Auth.currentUser;
    const q = (query || '').trim().toLowerCase();
    let users = DB.getUsers().filter(u => u.id !== me.id && !u.suspended && u.role !== 'admin');
    if (q) users = users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.district || '').toLowerCase().includes(q) ||
      (u.municipality || '').toLowerCase().includes(q)
    );
    users = users.slice(0, 30);
    if (!users.length) return this.empty('🔍', 'No people found', 'Try a different name or district.');
    return `<div class="grid grid-auto gap-4">` + users.map(u => `
      <div class="card">
        <div class="card-body" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <a href="worker-profile.html?id=${u.id}">${Utils.avatarHTML(Utils.getUserPhoto(u), u.name, 'lg')}</a>
          <div style="flex:1;min-width:110px">
            <a href="worker-profile.html?id=${u.id}" class="font-semibold">${Utils.escapeHtml(u.name)}</a>
            <div class="text-muted text-sm">📍 ${Utils.escapeHtml(u.district || 'Nepal')}${u.role === 'worker' ? ' · 👷 Worker' : u.role === 'farmer' ? ' · 🌾 Farmer' : ''}</div>
          </div>
          <div>${App.friendButtonHtml(u.id)}</div>
        </div>
      </div>`).join('') + `</div>`;
  },

  empty(icon, title, desc) {
    return `<div class="empty-state-premium"><div class="icon">${icon}</div><h3>${title}</h3><p>${desc}</p></div>`;
  }
};
