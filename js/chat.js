const Chat = {
  currentChat: null,
  currentUserId: null,

  init(userId) {
    this.currentUserId = userId;
    this.renderContacts();
    const paramUser = Utils.getParam('user');
    if (paramUser) { this.openChat(paramUser); }
    else { const chats = DB.getChatsByUser(userId); if (chats.length) { const other = chats[0].participants.find(p => p !== userId); this.openChat(other); } }
  },

  renderContacts() {
    const list = document.getElementById('chatContacts');
    if (!list) return;
    const chats = DB.getChatsByUser(this.currentUserId);
    if (!chats.length) { list.innerHTML = '<div class="empty-state" style="padding:40px 20px"><div class="icon">💬</div><h3>No conversations yet</h3><p>Start a conversation by messaging a worker or farmer.</p></div>'; return; }
    list.innerHTML = chats.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)).map(chat => {
      const otherId = chat.participants.find(p => p !== this.currentUserId);
      const other = DB.getUserById(otherId);
      if (!other) return '';
      const lastMsg = DB.getMessagesByChat(chat.id).slice(-1)[0];
      const isCurrent = this.currentUserId === otherId || chat.participants.includes(this.currentUserId) && document.querySelector(`[data-chat-user="${otherId}"]`);
      return `
        <div class="chat-contact ${this.currentChat?.id === chat.id ? 'active' : ''}" data-chat-user="${otherId}" onclick="Chat.openChat('${otherId}')">
          <div class="chat-contact-avatar">
            ${Utils.avatarHTML(Utils.getUserPhoto(other), other.name, 'md')}
            <div class="online"></div>
          </div>
          <div class="chat-contact-info">
            <div class="chat-contact-name">${other.name}</div>
            <div class="chat-contact-preview">${Utils.truncate(lastMsg?.text || chat.lastMessage || 'Start chatting...', 40)}</div>
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
    const header = document.getElementById('chatHeader');
    if (header) {
      header.innerHTML = `
        <div class="chat-header-info">
          ${Utils.avatarHTML(Utils.getUserPhoto(other), other.name, 'md')}
          <div>
            <div class="chat-header-name">${other.name}</div>
            <div class="chat-header-status">● Online</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-icon" title="Voice call">📞</button>
          <button class="btn btn-ghost btn-icon" title="Video call">📹</button>
          <button class="btn btn-ghost btn-icon" title="More">⋮</button>
        </div>
      `;
    }
    this.renderMessages();
    this.renderContacts();
    this.scrollToBottom();
  },

  renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !this.currentChat) return;
    const messages = DB.getMessagesByChat(this.currentChat.id);
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="icon">👋</div><h3>Start the conversation</h3><p>Say hello!</p></div>';
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
            <div class="chat-bubble">${Utils.escapeHtml(msg.text)}</div>
            <div class="chat-message-time">${new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ${isSent ? '<span class="chat-message-read">' + (msg.read ? '✓✓' : '✓') + '</span>' : ''}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  sendMessage(text) {
    if (!text.trim() || !this.currentChat) return;
    const otherId = this.currentChat.participants.find(p => p !== this.currentUserId);
    DB.addMessage({ chatId: this.currentChat.id, senderId: this.currentUserId, text: text.trim() });
    DB.updateChat?.(this.currentChat.id, { lastMessage: text.trim(), lastMessageAt: new Date().toISOString() });
    const chats = DB.getChats();
    const ci = chats.findIndex(c => c.id === this.currentChat.id);
    if (ci >= 0) { chats[ci].lastMessage = text.trim(); chats[ci].lastMessageAt = new Date().toISOString(); DB.setChats(chats); }
    DB.addNotification({ userId: otherId, type: 'message', text: `New message from ${Auth.currentUser.name}`, link: 'chat.html' });
    this.renderMessages();
    this.renderContacts();
    this.scrollToBottom();
    document.getElementById('chatInput').value = '';
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
