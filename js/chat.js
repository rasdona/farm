const Chat = {
  currentChat: null,
  currentUserId: null,
  _bound: false,
  _pendingMedia: null,

  init(userId) {
    this.currentUserId = userId;
    this._bindEvents();
    this.renderContacts();
    const paramUser = Utils.getParam('user');
    if (paramUser) { this.openChat(paramUser); }
    else { const chats = DB.getChatsByUser(userId); if (chats.length) { const other = chats[0].participants.find(p => p !== userId); this.openChat(other); } }
  },

  _bindEvents() {
    if (this._bound) return;
    this._bound = true;
    document.addEventListener('chat-realtime', (e) => {
      const msg = e.detail && e.detail.message;
      if (msg && this.currentChat && msg.chatId === this.currentChat.id) {
        this.renderMessages();
        this.scrollToBottom();
      }
      this.renderContacts();
    });
    document.addEventListener('chat-presence', () => {
      this.renderContacts();
      this.updatePresence();
    });
    document.addEventListener('chat-typing', (e) => this.onTyping(e.detail));
    const input = document.getElementById('chatInput');
    if (input) {
      input.addEventListener('input', (ev) => {
        if (typeof SupabaseSync !== 'undefined' && SupabaseSync.sendTyping && this.currentChat) {
          SupabaseSync.sendTyping(this.currentChat.id, ev.target.value.trim().length > 0);
        }
      });
    }
  },

  renderContacts() {
    const list = document.getElementById('chatContacts');
    if (!list) return;
    const chats = DB.getChatsByUser(this.currentUserId);
    if (!chats.length) { list.innerHTML = '<div class="empty-state-premium" style="padding:40px 20px"><div class="icon">💬</div><h3>No conversations yet</h3><p>Start a conversation by messaging a worker or farmer.</p><a href="workers.html" class="btn btn-primary btn-sm">Find Workers</a></div>'; return; }
    list.innerHTML = chats.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)).map(chat => {
      const otherId = chat.participants.find(p => p !== this.currentUserId);
      const other = DB.getUserById(otherId);
      if (!other) return '';
      const online = typeof SupabaseSync !== 'undefined' && SupabaseSync.isOnline ? SupabaseSync.isOnline(other.id) : false;
      const lastMsg = DB.getMessagesByChat(chat.id).slice(-1)[0];
      const lastText = lastMsg?.text || (lastMsg?.image ? '📷 Photo' : lastMsg?.media ? '🎬 Video' : null) || chat.lastMessage || 'Start chatting...';
      const isCurrent = this.currentUserId === otherId || chat.participants.includes(this.currentUserId) && document.querySelector(`[data-chat-user="${otherId}"]`);
      return `
        <div class="chat-contact ${this.currentChat?.id === chat.id ? 'active' : ''}" data-chat-user="${otherId}" onclick="Chat.openChat('${otherId}')">
          <div class="chat-contact-avatar">
            ${Utils.avatarHTML(Utils.getUserPhoto(other), other.name, 'md')}
            ${online ? '<div class="online"></div>' : ''}
          </div>
          <div class="chat-contact-info">
            <div class="chat-contact-name">${other.name}</div>
            <div class="chat-contact-preview">${Utils.truncate(lastText, 40)}</div>
          </div>
          <div class="chat-contact-meta">
            <span class="chat-contact-time">${Utils.formatTime(chat.lastMessageAt)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  openChat(otherUserId) {
    const other = DB.getUserById(otherUserId);
    if (!other) return;
    this.currentChat = DB.getOrCreateChat(this.currentUserId, otherUserId);
    this.renderHeader(other);
    this.markRead();
    this.renderMessages();
    this.renderContacts();
    this.scrollToBottom();
  },

  renderHeader(other) {
    const header = document.getElementById('chatHeader');
    if (!header) return;
    const online = typeof SupabaseSync !== 'undefined' && SupabaseSync.isOnline ? SupabaseSync.isOnline(other.id) : false;
    header.innerHTML = `
      <div class="chat-header-info">
        ${Utils.avatarHTML(Utils.getUserPhoto(other), other.name, 'md')}
        <div>
          <div class="chat-header-name">${other.name}</div>
          <div class="chat-header-status ${online ? '' : 'offline'}" id="chatHeaderStatus">${online ? '● Online' : 'Offline'}</div>
          <div class="chat-header-typing" id="chatTyping" style="display:none">typing…</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-icon" title="Voice call">📞</button>
        <button class="btn btn-ghost btn-icon" title="Video call">📹</button>
        <button class="btn btn-ghost btn-icon" title="More">⋮</button>
      </div>
    `;
  },

  updatePresence() {
    if (!this.currentChat) return;
    const otherId = this.currentChat.participants.find(p => p !== this.currentUserId);
    const statusEl = document.getElementById('chatHeaderStatus');
    if (statusEl && otherId) {
      const online = typeof SupabaseSync !== 'undefined' && SupabaseSync.isOnline ? SupabaseSync.isOnline(otherId) : false;
      statusEl.textContent = online ? '● Online' : 'Offline';
      statusEl.classList.toggle('offline', !online);
    }
  },

  onTyping(payload) {
    if (!payload || !this.currentChat) return;
    if (payload.conversationId !== this.currentChat.id) return;
    if (payload.userId === this.currentUserId) return;
    const typingEl = document.getElementById('chatTyping');
    if (!typingEl) return;
    clearTimeout(this._typingTimer);
    typingEl.style.display = payload.isTyping ? 'block' : 'none';
    if (payload.isTyping) {
      this._typingTimer = setTimeout(() => { typingEl.style.display = 'none'; }, 3000);
    }
  },

  markRead() {
    if (!this.currentChat) return;
    const msgs = DB.getMessages();
    let changed = false;
    msgs.forEach(m => {
      if (m.chatId === this.currentChat.id && m.senderId !== this.currentUserId && !m.read) {
        m.read = true; changed = true;
      }
    });
    if (changed) DB.setMessages(msgs);
  },

  renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !this.currentChat) return;
    const messages = DB.getMessagesByChat(this.currentChat.id);
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state-premium" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="icon">👋</div><h3>Start the conversation</h3><p>Say hello and connect!</p></div>';
      return;
    }
    let html = '';
    let lastDate = '';
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString();
      if (date !== lastDate) { html += `<div class="chat-date-divider"><span>${Utils.formatDate(msg.createdAt)}</span></div>`; lastDate = date; }
      const isSent = msg.senderId === this.currentUserId;
      const sender = DB.getUserById(msg.senderId);
      html += `
        <div class="chat-message ${isSent ? 'sent' : 'received'}">
          ${!isSent ? Utils.avatarHTML(Utils.getUserPhoto(sender), sender?.name || '', 'sm') : ''}
          <div>
            ${msg.image ? `<div class="chat-bubble chat-bubble-media"><img src="${msg.image}" alt="Photo" onclick="window.open('${msg.image}','_blank')"></div>` : ''}
            ${msg.media ? `<div class="chat-bubble chat-bubble-media"><video src="${msg.media}" controls></video></div>` : ''}
            ${msg.text ? `<div class="chat-bubble">${Utils.escapeHtml(msg.text)}</div>` : ''}
            <div class="chat-message-time">${new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${isSent ? '<span class="chat-message-read">' + (msg.read ? '✓✓' : '✓') + '</span>' : ''}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  attachMedia(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { Utils.toast('File too large (max 50MB)', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const isVideo = file.type.startsWith('video/');
      this._pendingMedia = { type: isVideo ? 'video' : 'image', data: e.target.result };
      const preview = document.getElementById('chatMediaPreview');
      if (preview) {
        preview.style.display = 'flex';
        const holder = document.getElementById('chatMediaHolder');
        if (isVideo) holder.innerHTML = `<video src="${e.target.result}" controls></video>`;
        else holder.innerHTML = `<img src="${e.target.result}" alt="Attachment">`;
        document.getElementById('chatMediaName').textContent = file.name;
      }
    };
    reader.readAsDataURL(file);
  },

  removeMedia() {
    this._pendingMedia = null;
    const preview = document.getElementById('chatMediaPreview');
    if (preview) preview.style.display = 'none';
  },

  sendMessage(text) {
    if (!this.currentChat) return;
    const trimmed = (text || '').trim();
    if (!trimmed && !this._pendingMedia) return;
    const otherId = this.currentChat.participants.find(p => p !== this.currentUserId);

    const finishSend = (msgData) => {
      DB.addMessage({ chatId: this.currentChat.id, senderId: this.currentUserId, ...msgData });
      const last = msgData.text || (msgData.image ? '📷 Photo' : msgData.media ? '🎬 Video' : 'Media');
      DB.updateChat?.(this.currentChat.id, { lastMessage: last, lastMessageAt: new Date().toISOString() });
      const chats = DB.getChats();
      const ci = chats.findIndex(c => c.id === this.currentChat.id);
      if (ci >= 0) { chats[ci].lastMessage = last; chats[ci].lastMessageAt = new Date().toISOString(); DB.setChats(chats); }
      DB.addNotification({ userId: otherId, type: 'message', text: `New message from ${Auth.currentUser.name}`, link: 'chat.html' });
      if (typeof SupabaseSync !== 'undefined' && SupabaseSync.sendTyping) {
        SupabaseSync.sendTyping(this.currentChat.id, false);
      }
      this.renderMessages();
      this.renderContacts();
      this.scrollToBottom();
      const input = document.getElementById('chatInput');
      if (input) input.value = '';
      this.removeMedia();
    };

    if (this._pendingMedia && typeof SupabaseAuth !== 'undefined' && SupabaseAuth._client) {
      const dataUrl = this._pendingMedia.data;
      fetch(dataUrl).then(r => r.blob()).then(blob => {
        const ext = blob.type.split('/')[1] || 'jpg';
        const prefix = this._pendingMedia.type === 'video' ? 'videos' : 'chat';
        const path = `${prefix}/${this.currentUserId}/${Date.now()}.${ext}`;
        SupabaseAuth._client.storage.from('avatars').upload(path, blob, { contentType: blob.type }).then(({ data, error }) => {
          if (error) { finishSend({ text: trimmed }); return; }
          const url = SupabaseAuth._client.storage.from('avatars').getPublicUrl(path).data?.publicUrl || '';
          const msgData = {};
          if (this._pendingMedia.type === 'video') msgData.media = url;
          else msgData.image = url;
          if (trimmed) msgData.text = trimmed;
          finishSend(msgData);
        }).catch(() => finishSend({ text: trimmed }));
      }).catch(() => finishSend({ text: trimmed }));
    } else {
      finishSend({ text: trimmed });
    }
  },

  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) setTimeout(() => container.scrollTop = container.scrollHeight, 50);
  },

  renderChatPage() {
    if (!Auth.requireAuth()) return;
    this.init(Auth.currentUser.id);
  }
};
