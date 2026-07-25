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
          ${Utils.avatarHTML(Utils.getUserPhoto(Auth.currentUser), Auth.currentUser.name, 'lg')}
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
        <div id="postImagePreview" style="display:none;margin-bottom:12px;position:relative">
          <img src="" style="max-width:100%;max-height:200px;border-radius:var(--radius);object-fit:cover">
          <button class="btn btn-ghost btn-sm" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.5);color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center" onclick="Community.removeImage()">✕</button>
        </div>
        <div class="flex justify-between items-center flex-wrap gap-2">
          <div class="flex gap-2 items-center flex-wrap">
            <select class="form-select" id="postType" style="width:auto">
              <option value="tip">💡 Tip</option>
              <option value="question">❓ Question</option>
              <option value="event">📅 Event</option>
              <option value="celebration">🎉 Celebration</option>
            </select>
            <input class="form-input" id="postTags" placeholder="Tags (comma separated)" style="width:250px">
            <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin:0" title="Add photo">
              📷 <input type="file" accept="image/*" style="display:none" onchange="Community.previewImage(this)">
            </label>
          </div>
          <button class="btn btn-primary" onclick="Community.createPost()">Post</button>
        </div>
      </div>
    `;
  },

  _pendingImage: null,

  previewImage(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this._pendingImage = e.target.result;
        const preview = document.getElementById('postImagePreview');
        if (preview) { preview.style.display = ''; preview.querySelector('img').src = e.target.result; }
      };
      reader.readAsDataURL(input.files[0]);
    }
  },

  removeImage() {
    this._pendingImage = null;
    const preview = document.getElementById('postImagePreview');
    if (preview) preview.style.display = 'none';
  },

  renderPosts() {
    const el = document.getElementById('communityPosts');
    if (!el) return;
    let posts = DB.getCommunityPosts();
    if (this.currentFilter !== 'all') posts = posts.filter(p => p.type === this.currentFilter);
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!posts.length) {
      el.innerHTML = '<div class="empty-state-premium"><div class="icon">👥</div><h3>No posts yet</h3><p>Be the first to share something with the community!</p></div>';
      return;
    }

    el.innerHTML = posts.map(p => {
      const author = DB.getUserById(p.userId);
      const isLiked = Auth.currentUser && p.likes?.includes(Auth.currentUser.id);
      const typeIcons = { tip: '💡', question: '❓', event: '📅', celebration: '🎉' };
      const typeColors = { tip: 'var(--primary)', question: 'var(--info)', event: 'var(--accent)', celebration: '#ef4444' };
      return `
        <div class="community-post-premium" data-animate="fadeUp">
          <div class="post-header">
            ${Utils.avatarHTML(Utils.getUserPhoto(author), author?.name || '?', 'md')}
            <div class="post-author">
              <div class="post-author-name"><a href="worker-profile.html?id=${p.userId}">${Utils.escapeHtml(author?.name || 'Unknown')}</a></div>
              <div class="post-author-meta">${Utils.formatTime(p.createdAt)} · <span style="color:${typeColors[p.type] || 'var(--text-secondary)'}">${typeIcons[p.type] || ''} ${Utils.capitalize(p.type || 'post')}</span></div>
            </div>
            ${Auth.currentUser && Auth.currentUser.id === p.userId ? `<button class="btn btn-ghost btn-sm" onclick="Community.deletePost('${p.id}')" aria-label="Delete post">🗑️</button>` : ''}
          </div>
          ${p.title ? `<h3 style="margin:0 0 12px;font-size:1.1rem">${Utils.escapeHtml(p.title)}</h3>` : ''}
          ${p.image ? `<div style="margin-bottom:12px;border-radius:var(--radius);overflow:hidden"><img src="${p.image}" style="width:100%;max-height:300px;object-fit:cover;display:block" alt="Post image"></div>` : ''}
          <div class="post-content">${Utils.escapeHtml(p.content)}</div>
          ${p.tags?.length ? `<div class="post-tags">${p.tags.map(t => `<span class="badge badge-primary">${Utils.escapeHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="post-actions">
            <button class="post-action ${isLiked ? 'liked' : ''}" onclick="Community.toggleLike('${p.id}')">
              ${isLiked ? '❤️' : '🤍'} <span>${p.likes?.length || 0}</span>
            </button>
            <button class="post-action" onclick="Community.toggleComments('${p.id}')">
              💬 <span>${p.comments?.length || 0}</span>
            </button>
            <button class="post-action" onclick="Community.sharePost('${p.id}', '${Utils.escapeHtml((p.title || p.content || '').substring(0, 80))}')">
              📤 <span>Share</span>
            </button>
          </div>
          <div id="comments-${p.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light)">
            ${(p.comments || []).map(c => {
              const commenter = DB.getUserById(c.userId);
              return `<div class="flex gap-3 mb-3">
                ${Utils.avatarHTML(Utils.getUserPhoto(commenter), commenter?.name || '?', 'sm')}
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
    if (!Auth.requireProfilePhoto()) return;
    const content = document.getElementById('postContent')?.value.trim();
    if (!content) { Utils.toast('Please write something to post.', 'warning'); return; }
    const title = document.getElementById('postTitle')?.value.trim();
    const type = document.getElementById('postType')?.value || 'tip';
    const tags = document.getElementById('postTags')?.value.split(',').map(t => t.trim()).filter(Boolean);

    const savePost = (imageUrl) => {
      const postData = { userId: Auth.currentUser.id, type, title, content, tags };
      if (imageUrl) postData.image = imageUrl;
      DB.addCommunityPost(postData);
      Utils.toast('Post published!');
      document.getElementById('postContent').value = '';
      document.getElementById('postTitle').value = '';
      document.getElementById('postTags').value = '';
      this._pendingImage = null;
      const preview = document.getElementById('postImagePreview');
      if (preview) preview.style.display = 'none';
      this.renderPosts();
    };

    if (this._pendingImage && typeof SupabaseAuth !== 'undefined' && SupabaseAuth._client) {
      const dataUrl = this._pendingImage;
      fetch(dataUrl).then(r => r.blob()).then(blob => {
        const ext = blob.type.split('/')[1] || 'jpg';
        const path = `community/${Auth.currentUser.id}/${Date.now()}.${ext}`;
        SupabaseAuth._client.storage.from('avatars').upload(path, blob, { contentType: blob.type }).then(({ data, error }) => {
          if (error) { savePost(''); return; }
          const url = SupabaseAuth._client.storage.from('avatars').getPublicUrl(path).data?.publicUrl;
          savePost(url || '');
        }).catch(() => savePost(''));
      }).catch(() => savePost(''));
    } else {
      savePost(this._pendingImage || '');
    }
  },

  sharePost(postId, text) {
    const url = window.location.origin + window.location.pathname + '#post-' + postId;
    const shareText = `${text} — Read on AgriConnect Nepal`;
    if (navigator.share) {
      navigator.share({ title: text, text: shareText, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText}\n${url}`).then(() => {
        Utils.toast('Link copied to clipboard!', 'success');
      }).catch(() => {
        Utils.toast('Could not copy link', 'warning');
      });
    } else {
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  },

  toggleLike(postId) {
    if (!Auth.requireProfilePhoto()) return;
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
    if (!Auth.requireProfilePhoto()) return;
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
