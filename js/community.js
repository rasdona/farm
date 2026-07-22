const Community = {
  currentFilter: 'all',

  init() {
    this.renderCreateForm();
    this.renderPosts();
  },

  renderCreateForm() {
    const el = document.getElementById('createPostSection');
    if (!el) return;
    if (!Auth.isLoggedIn()) {
      el.innerHTML = '<div class="card mb-6"><div class="card-body text-center py-8"><h3>Join the Conversation</h3><p class="text-muted mb-4">Log in to share tips, ask questions, and connect with the farming community.</p><a href="login.html" class="btn btn-primary">Log In to Post</a></div></div>';
      return;
    }
    el.innerHTML = `
      <div class="create-post-card">
        <div class="flex items-center gap-3 mb-4">
          ${Utils.avatarHTML(Auth.currentUser.avatar, Auth.currentUser.name, 'lg')}
          <div>
            <div class="font-semibold">${Auth.currentUser.name}</div>
            <div class="text-sm text-muted">What's on your mind?</div>
          </div>
        </div>
        <div class="form-group">
          <input class="form-input" id="postTitle" placeholder="Post title (optional)">
        </div>
        <div class="form-group">
          <textarea class="form-textarea" id="postContent" rows="4" placeholder="Share a farming tip, ask a question, or celebrate a success..."></textarea>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex gap-2">
            <select class="form-select" id="postType" style="width:auto">
              <option value="tip">💡 Tip</option>
              <option value="question">❓ Question</option>
              <option value="event">📅 Event</option>
              <option value="celebration">🎉 Celebration</option>
            </select>
            <input class="form-input" id="postTags" placeholder="Tags (comma separated)" style="width:250px">
          </div>
          <button class="btn btn-primary" onclick="Community.createPost()">Post</button>
        </div>
      </div>
    `;
  },

  renderPosts() {
    const el = document.getElementById('communityPosts');
    if (!el) return;
    let posts = DB.getCommunityPosts();
    if (this.currentFilter !== 'all') posts = posts.filter(p => p.type === this.currentFilter);
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!posts.length) {
      el.innerHTML = '<div class="empty-state"><div class="icon">👥</div><h3>No posts yet</h3><p>Be the first to share something with the community!</p></div>';
      return;
    }

    el.innerHTML = posts.map(p => {
      const author = DB.getUserById(p.userId);
      const isLiked = Auth.currentUser && p.likes?.includes(Auth.currentUser.id);
      const typeIcons = { tip: '💡', question: '❓', event: '📅', celebration: '🎉' };
      const typeColors = { tip: 'var(--primary)', question: 'var(--info)', event: 'var(--accent)', celebration: '#ef4444' };
      return `
        <div class="community-post" data-animate="fadeUp">
          <div class="community-post-header">
            ${Utils.avatarHTML(author?.avatar, author?.name || '?', 'lg')}
            <div class="flex-1">
              <div class="font-semibold"><a href="worker-profile.html?id=${p.userId}">${author?.name || 'Unknown'}</a></div>
              <div class="text-xs text-muted">${Utils.formatTime(p.createdAt)} • <span style="color:${typeColors[p.type] || 'var(--text-secondary)'}">${typeIcons[p.type] || ''} ${Utils.capitalize(p.type || 'post')}</span></div>
            </div>
            ${Auth.currentUser && Auth.currentUser.id === p.userId ? `<button class="btn btn-ghost btn-sm" onclick="Community.deletePost('${p.id}')">🗑️</button>` : ''}
          </div>
          ${p.title ? `<h3 style="margin:0 0 8px;font-size:1.1rem">${Utils.escapeHtml(p.title)}</h3>` : ''}
          <div class="community-post-content">${Utils.escapeHtml(p.content)}</div>
          ${p.tags?.length ? `<div class="community-post-tags">${p.tags.map(t => `<span class="badge badge-primary">${t}</span>`).join('')}</div>` : ''}
          <div class="community-post-actions">
            <div class="community-post-action ${isLiked ? 'liked' : ''}" onclick="Community.toggleLike('${p.id}')">
              ${isLiked ? '❤️' : '🤍'} <span>${p.likes?.length || 0}</span>
            </div>
            <div class="community-post-action" onclick="Community.toggleComments('${p.id}')">
              💬 <span>${p.comments?.length || 0} Comments</span>
            </div>
          </div>
          <div id="comments-${p.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light)">
            ${(p.comments || []).map(c => {
              const commenter = DB.getUserById(c.userId);
              return `<div class="flex gap-3 mb-3">
                ${Utils.avatarHTML(commenter?.avatar, commenter?.name || '?', 'sm')}
                <div class="flex-1">
                  <div class="text-sm"><strong>${commenter?.name || 'Unknown'}</strong> <span class="text-muted text-xs">${Utils.formatTime(c.createdAt)}</span></div>
                  <div class="text-sm" style="color:var(--text-secondary)">${Utils.escapeHtml(c.text)}</div>
                </div>
              </div>`;
            }).join('')}
            ${Auth.isLoggedIn() ? `
              <div class="flex gap-2 mt-3">
                <input class="form-input" id="commentInput-${p.id}" placeholder="Write a comment..." style="flex:1">
                <button class="btn btn-primary btn-sm" onclick="Community.addComment('${p.id}')">Post</button>
              </div>
            ` : '<p class="text-sm text-muted mt-2">Log in to comment</p>'}
          </div>
        </div>
      `;
    }).join('');
  },

  createPost() {
    if (!Auth.requireAuth()) return;
    const content = document.getElementById('postContent')?.value.trim();
    if (!content) { Utils.toast('Please write something to post.', 'warning'); return; }
    const title = document.getElementById('postTitle')?.value.trim();
    const type = document.getElementById('postType')?.value || 'tip';
    const tags = document.getElementById('postTags')?.value.split(',').map(t => t.trim()).filter(Boolean);
    DB.addCommunityPost({ userId: Auth.currentUser.id, type, title, content, tags });
    Utils.toast('Post published!');
    document.getElementById('postContent').value = '';
    document.getElementById('postTitle').value = '';
    document.getElementById('postTags').value = '';
    this.renderPosts();
  },

  toggleLike(postId) {
    if (!Auth.requireAuth()) return;
    const post = DB.getCommunityPosts().find(p => p.id === postId);
    if (!post) return;
    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(Auth.currentUser.id);
    if (idx >= 0) post.likes.splice(idx, 1);
    else post.likes.push(Auth.currentUser.id);
    DB.updateCommunityPost(postId, { likes: post.likes });
    this.renderPosts();
  },

  toggleComments(postId) {
    const el = document.getElementById('comments-' + postId);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },

  addComment(postId) {
    if (!Auth.requireAuth()) return;
    const input = document.getElementById('commentInput-' + postId);
    const text = input?.value.trim();
    if (!text) return;
    const post = DB.getCommunityPosts().find(p => p.id === postId);
    if (!post) return;
    if (!post.comments) post.comments = [];
    post.comments.push({ id: 'CC' + Date.now(), userId: Auth.currentUser.id, text, createdAt: new Date().toISOString() });
    DB.updateCommunityPost(postId, { comments: post.comments });
    input.value = '';
    this.renderPosts();
    setTimeout(() => { const el = document.getElementById('comments-' + postId); if (el) el.style.display = 'block'; }, 100);
  },

  deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    DB.deleteCommunityPost(postId);
    Utils.toast('Post deleted');
    this.renderPosts();
  },

  filterPosts(type, el) {
    this.currentFilter = type;
    document.querySelectorAll('.community-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.renderPosts();
  }
};
