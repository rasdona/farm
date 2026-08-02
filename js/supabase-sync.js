// ═══════════════════════════════════════════════════════════════════════════════
// Supabase Sync Layer — replaces localStorage mock with real Supabase data
// Loaded AFTER data.js and supabase-auth.js
// ═══════════════════════════════════════════════════════════════════════════════

const SupabaseSync = {
  _ready: false,
  _sb() { return SupabaseAuth?.client; },

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async loadAll() {
    if (!this._sb()) { console.warn('[Sync] Supabase not available'); return; }
    console.log('[Sync] Loading data from Supabase...');
    try {
      await Promise.allSettled([
        this._loadUsers(),
        this._loadJobs(),
        this._loadApplications(),
        this._loadCommunityPosts(),
        this._loadNotifications(),
        this._loadReviews(),
        this._loadConversations(),
        this._loadMessages(),
        this._loadArmaParma(),
        this.fetchStats(),
      ]);
      this._ready = true;
      console.log('[Sync] All data loaded');
      document.dispatchEvent(new Event('db-synced'));
    } catch (e) { console.error('[Sync] loadAll failed:', e); }
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  async _loadUsers() {
    const sb = this._sb();
    const { data: users } = await sb.from('users').select('*');
    if (!users?.length) return;

    const { data: farmerProfiles } = await sb.from('farmer_profiles').select('*');
    const { data: workerProfiles } = await sb.from('worker_profiles').select('*');

    const fpMap = {};
    (farmerProfiles || []).forEach(fp => { fpMap[fp.user_id] = fp; });
    const wpMap = {};
    (workerProfiles || []).forEach(wp => { wpMap[wp.user_id] = wp; });

    const provName = {};
    const distName = {};
    const bodyName = {};
    try {
      const [provs, dists, bodies] = await Promise.all([
        sb.from('provinces').select('id, name_en'),
        sb.from('districts').select('id, name_en'),
        sb.from('local_bodies').select('id, name_en'),
      ]);
      (provs?.data || []).forEach(r => { provName[r.id] = r.name_en; });
      (dists?.data || []).forEach(r => { distName[r.id] = r.name_en; });
      (bodies?.data || []).forEach(r => { bodyName[r.id] = r.name_en; });
    } catch (e) { console.warn('[Sync] Location lookup unavailable:', e.message); }

    const mapped = users.map(u => {
      const fp = fpMap[u.id] || {};
      const wp = wpMap[u.id] || {};
      return {
        id: u.id,
        name: u.full_name,
        email: u.email || '',
        phone: u.mobile_number || '',
        role: u.active_role || 'farmer',
        avatar: u.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.full_name)}`,
        profilePhotoUrl: u.profile_photo || '',
        profilePhotoVerified: !!(u.profile_photo),
        requiresPhotoUpload: false,
        farmName: fp.farm_name || '',
        farmSize: fp.farm_size ? `${fp.farm_size} ${fp.farm_size_unit || 'hectare'}` : '',
        crops: fp.crop_types || [],
        province: provName[fp.province_id] || provName[wp.province_id] || '',
        district: distName[fp.district_id] || distName[wp.district_id] || '',
        municipality: bodyName[fp.local_body_id] || bodyName[wp.local_body_id] || '',
        ward: fp.ward_id || wp.ward_id || '',
        description: fp.biography || wp.bio || '',
        verified: u.verification_status === 'verified',
        suspended: u.account_status === 'suspended',
        createdAt: u.created_at,
        emailVerified: true,
        phoneVerified: true,
        mobileVerified: true,
        verificationMethod: 'email',
        activeRole: u.active_role || 'farmer',
        skills: wp.skills || [],
        experience: wp.experience_years || 0,
        languages: wp.languages || ['ne'],
        availableDistricts: distName[wp.district_id] ? [distName[wp.district_id]] : [],
        expectedWage: { daily: wp.daily_wage || 0, monthly: wp.monthly_wage || 0 },
        bio: wp.bio || '',
        availability: wp.is_available ? 'available' : 'unavailable',
        roles: [u.active_role || 'farmer'],
      };
    });

    DB.setUsers(mapped);
    console.log(`[Sync] Loaded ${mapped.length} users`);
  },

  // ── Jobs ──────────────────────────────────────────────────────────────────
  async _loadJobs() {
    const sb = this._sb();
    const { data: jobs } = await sb.from('jobs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!jobs?.length) return;

    const { data: farmerProfiles } = await sb.from('farmer_profiles').select('id, user_id, farm_name');
    const fpUserMap = {};
    (farmerProfiles || []).forEach(fp => { fpUserMap[fp.id] = fp.user_id; });

    const mapped = jobs.map(j => ({
      id: j.id,
      farmerId: j.poster_id || fpUserMap[j.farmer_profile_id] || '',
      workMode: j.salary_type === 'negotiable' ? 'arma-parma' : 'paid',
      title: j.title,
      description: j.description || '',
      cropType: j.crop_type || '',
      requiredSkills: j.skills_required || [],
      workersNeeded: j.required_workers || 1,
      wage: {
        daily: j.salary_amount || j.salary_min || 0,
        weekly: 0,
        monthly: j.salary_max || 0,
      },
      foodProvided: j.provides_food || false,
      accommodationProvided: j.provides_accommodation || false,
      workingHours: j.working_hours_start && j.working_hours_end
        ? `${j.working_hours_start}-${j.working_hours_end}` : '',
      workingDays: '',
      startDate: j.start_date || '',
      endDate: j.end_date || '',
      district: '',
      municipality: '',
      ward: '',
      location: null,
      status: j.status || 'open',
      urgent: j.is_urgent || false,
      applications: j.application_count || 0,
      createdAt: j.created_at,
      photos: [],
    }));

    DB.setJobs(mapped);
    console.log(`[Sync] Loaded ${mapped.length} jobs`);
  },

  // ── Applications ──────────────────────────────────────────────────────────
  async _loadApplications() {
    const sb = this._sb();
    const { data: apps } = await sb.from('job_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!apps?.length) return;

    const mapped = apps.map(a => ({
      id: a.id,
      jobId: a.job_id,
      workerId: a.applicant_id,
      farmerId: '',
      message: a.cover_letter || '',
      status: a.status || 'pending',
      createdAt: a.applied_at || a.created_at,
    }));

    DB.setApplications(mapped);
    console.log(`[Sync] Loaded ${mapped.length} applications`);
  },

  // ── Community Posts ───────────────────────────────────────────────────────
  async _loadCommunityPosts() {
    const sb = this._sb();
    const { data: posts } = await sb.from('community_posts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!posts?.length) return;

    const authorIds = [...new Set(posts.map(p => p.author_id))];
    const { data: authors } = await sb.from('users')
      .select('id, full_name, profile_photo, active_role')
      .in('id', authorIds);
    const authorMap = {};
    (authors || []).forEach(a => { authorMap[a.id] = a; });

    const { data: comments } = await sb.from('post_comments')
      .select('*')
      .is('deleted_at', null)
      .in('post_id', posts.map(p => p.id));
    const commentsByPost = {};
    (comments || []).forEach(c => {
      if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
      commentsByPost[c.post_id].push({
        id: c.id,
        userId: c.author_id,
        text: c.content,
        createdAt: c.created_at,
      });
    });

    const { data: likes } = await sb.from('post_likes')
      .select('post_id, user_id')
      .in('post_id', posts.map(p => p.id));
    const likesByPost = {};
    (likes || []).forEach(l => {
      if (!likesByPost[l.post_id]) likesByPost[l.post_id] = [];
      likesByPost[l.post_id].push(l.user_id);
    });

    const mapped = posts.map(p => {
      const author = authorMap[p.author_id] || {};
      return {
        id: p.id,
        userId: p.author_id,
        authorName: author.full_name || 'Unknown',
        authorAvatar: author.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(author.full_name || 'U')}`,
        authorRole: author.active_role || 'farmer',
        type: p.post_type || 'text',
        title: p.title || '',
        content: p.content || '',
        tags: p.tags || [],
        likes: likesByPost[p.id] || [],
        comments: commentsByPost[p.id] || [],
        createdAt: p.created_at,
      };
    });

    DB.setCommunityPosts(mapped);
    console.log(`[Sync] Loaded ${mapped.length} community posts`);
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  async _loadNotifications() {
    const sb = this._sb();
    const user = Auth?.currentUser;
    if (!user) return;

    const { data: notifs } = await sb.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!notifs?.length) return;

    const mapped = notifs.map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type || 'system',
      text: n.title + (n.body ? ': ' + n.body : ''),
      read: n.is_read || false,
      createdAt: n.created_at,
      link: n.data?.link || '',
    }));

    const existing = DB.getNotifications(user.id);
    const merged = [...mapped, ...existing.filter(e => !mapped.find(m => m.id === e.id))];
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const all = (DB._get('notifications') || []).filter(n => n.userId !== user.id);
    all.push(...merged);
    DB._set('notifications', all);
    console.log(`[Sync] Loaded ${mapped.length} notifications`);
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  async _loadReviews() {
    const sb = this._sb();
    const user = Auth?.currentUser;
    if (!user) return;

    const { data: workerReviews } = await sb.from('worker_reviews')
      .select('*')
      .is('deleted_at', null);
    const { data: farmerReviews } = await sb.from('farmer_reviews')
      .select('*')
      .is('deleted_at', null);

    const all = [];
    (workerReviews || []).forEach(r => {
      all.push({
        id: r.id,
        reviewerId: r.reviewer_id,
        reviewedId: r.worker_id,
        jobId: r.job_id || '',
        rating: r.rating,
        text: r.comment || '',
        createdAt: r.created_at,
      });
    });
    (farmerReviews || []).forEach(r => {
      all.push({
        id: r.id,
        reviewerId: r.reviewer_id,
        reviewedId: r.farmer_id,
        jobId: r.order_id || '',
        rating: r.rating,
        text: r.comment || '',
        createdAt: r.created_at,
      });
    });

    DB._set('reviews', all);
    console.log(`[Sync] Loaded ${all.length} reviews`);
  },

  // ── Conversations (chats) ────────────────────────────────────────────────
  async _loadConversations() {
    const sb = this._sb();
    const user = Auth?.currentUser;
    if (!user) return;

    const { data: participants } = await sb.from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participants?.length) return;
    const convIds = participants.map(p => p.conversation_id);

    const { data: convs } = await sb.from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    if (!convs?.length) return;

    const mapped = convs.map(c => {
      const parts = c.title ? c.title.split(' & ') : [];
      return {
        id: c.id,
        participants: parts.length ? parts : [user.id],
        createdAt: c.created_at,
        lastMessage: c.last_message_preview || '',
        lastMessageAt: c.last_message_at || c.created_at,
      };
    });

    DB.setChats(mapped);
    console.log(`[Sync] Loaded ${mapped.length} conversations`);
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  async _loadMessages() {
    const sb = this._sb();
    const user = Auth?.currentUser;
    if (!user) return;

    const chats = DB.getChats();
    if (!chats.length) return;
    const convIds = chats.map(c => c.id);

    const { data: msgs } = await sb.from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (!msgs?.length) return;

    const mapped = msgs.map(m => ({
      id: m.id,
      chatId: m.conversation_id,
      senderId: m.sender_id,
      text: m.content || '',
      createdAt: m.created_at,
      read: true,
    }));

    DB.setMessages(mapped);
    console.log(`[Sync] Loaded ${mapped.length} messages`);
  },

  // ── Arma Parma ────────────────────────────────────────────────────────────
  async _loadArmaParma() {
    const sb = this._sb();
    const { data: requests } = await sb.from('armacarma_requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!requests?.length) return;

    const mapped = requests.map(r => ({
      id: r.id,
      farmerId: r.requester_id,
      title: r.title,
      description: r.description || '',
      cropType: '',
      workType: r.work_type || '',
      district: '',
      municipality: '',
      ward: '',
      location: null,
      helpersNeeded: r.required_workers || 1,
      date: r.start_date || '',
      startTime: r.start_time || '',
      expectedDuration: r.offered_hours ? `${r.offered_hours} hours` : '',
      foodProvided: r.provides_food || false,
      teaSnacksProvided: false,
      equipmentProvided: r.provides_accommodation || false,
      returnCommitment: '',
      additionalNotes: '',
      photos: [],
      status: r.status || 'open',
      applicants: [],
      agreementAccepted: false,
      createdAt: r.created_at,
    }));

    DB.setArmaParmaRequests(mapped);
    console.log(`[Sync] Loaded ${mapped.length} arma parma requests`);
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // WRITE-THROUGH: Persist mutations to Supabase
  // ═════════════════════════════════════════════════════════════════════════════

  async writeJob(localJob) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      const user = Auth?.currentUser;
      if (!user) return;

      const { data: fp } = await sb.from('farmer_profiles')
        .select('id').eq('user_id', user.id).single();

      const payload = {
        poster_id: user.id,
        farmer_profile_id: fp?.id || null,
        title: localJob.title,
        description: localJob.description || '',
        crop_type: localJob.cropType || null,
        required_workers: localJob.workersNeeded || 1,
        salary_type: localJob.workMode === 'arma-parma' ? 'negotiable' : 'daily',
        salary_amount: localJob.wage?.daily || null,
        salary_min: localJob.wage?.daily || null,
        salary_max: localJob.wage?.monthly || null,
        provides_food: localJob.foodProvided || false,
        provides_accommodation: localJob.accommodationProvided || false,
        start_date: localJob.startDate || null,
        end_date: localJob.endDate || null,
        is_urgent: localJob.urgent || false,
        skills_required: localJob.requiredSkills || [],
        status: 'open',
      };

      const { data, error } = await sb.from('jobs').insert(payload).select().single();
      if (error) { console.error('[Sync] writeJob error:', error); return; }

      // Update local ID if Supabase generated a UUID
      if (data && data.id !== localJob.id) {
        const jobs = DB.getJobs();
        const idx = jobs.findIndex(j => j.id === localJob.id);
        if (idx >= 0) { jobs[idx].id = data.id; DB.setJobs(jobs); }
      }
      console.log('[Sync] Job written to Supabase:', data?.id);
    } catch (e) { console.error('[Sync] writeJob failed:', e); }
  },

  async writeApplication(localApp) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      const user = Auth?.currentUser;
      if (!user) return;

      const job = DB.getJobById(localApp.jobId);
      const { data: wp } = await sb.from('worker_profiles')
        .select('id').eq('user_id', user.id).single();

      const payload = {
        job_id: localApp.jobId,
        applicant_id: user.id,
        worker_profile_id: wp?.id || null,
        cover_letter: localApp.message || '',
        status: 'pending',
      };

      const { data, error } = await sb.from('job_applications')
        .insert(payload).select().single();
      if (error) { console.error('[Sync] writeApplication error:', error); return; }

      if (data && data.id !== localApp.id) {
        const apps = DB.getApplications();
        const idx = apps.findIndex(a => a.id === localApp.id);
        if (idx >= 0) { apps[idx].id = data.id; DB.setApplications(apps); }

        // Increment application count on job
        await sb.from('jobs')
          .update({ application_count: (job?.applications || 0) + 1 })
          .eq('id', localApp.jobId);
      }
      console.log('[Sync] Application written to Supabase:', data?.id);
    } catch (e) { console.error('[Sync] writeApplication failed:', e); }
  },

  async writeCommunityPost(localPost) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      const user = Auth?.currentUser;
      if (!user) return;

      const payload = {
        author_id: user.id,
        post_type: localPost.type || 'text',
        title: localPost.title || null,
        content: localPost.content || '',
        tags: localPost.tags || [],
        status: 'approved',
      };

      const { data, error } = await sb.from('community_posts')
        .insert(payload).select().single();
      if (error) { console.error('[Sync] writeCommunityPost error:', error); return; }

      if (data && data.id !== localPost.id) {
        const posts = DB.getCommunityPosts();
        const idx = posts.findIndex(p => p.id === localPost.id);
        if (idx >= 0) { posts[idx].id = data.id; DB.setCommunityPosts(posts); }
      }
      console.log('[Sync] Community post written to Supabase:', data?.id);
    } catch (e) { console.error('[Sync] writeCommunityPost failed:', e); }
  },

  async writeNotification(localNotif) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      const payload = {
        user_id: localNotif.userId,
        type: localNotif.type || 'system',
        title: localNotif.text || '',
        body: '',
        data: localNotif.link ? { link: localNotif.link } : {},
      };
      const { error } = await sb.from('notifications').insert(payload);
      if (error) console.error('[Sync] writeNotification error:', error);
    } catch (e) { console.error('[Sync] writeNotification failed:', e); }
  },

  async writeReview(localReview) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      const user = Auth?.currentUser;
      if (!user) return;

      const reviewedUser = DB.getUserById(localReview.reviewedId);
      if (!reviewedUser) return;

      if (reviewedUser.role === 'worker') {
        const { data: wp } = await sb.from('worker_profiles')
          .select('id').eq('user_id', localReview.reviewedId).single();
        if (wp) {
          await sb.from('worker_reviews').insert({
            worker_id: wp.id,
            reviewer_id: user.id,
            job_id: localReview.jobId || null,
            rating: localReview.rating,
            comment: localReview.text || '',
          });
        }
      } else {
        const { data: fp } = await sb.from('farmer_profiles')
          .select('id').eq('user_id', localReview.reviewedId).single();
        if (fp) {
          await sb.from('farmer_reviews').insert({
            farmer_id: fp.id,
            reviewer_id: user.id,
            rating: localReview.rating,
            comment: localReview.text || '',
          });
        }
      }
      console.log('[Sync] Review written to Supabase');
    } catch (e) { console.error('[Sync] writeReview failed:', e); }
  },

  async writeMessage(localMsg) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      const payload = {
        conversation_id: localMsg.chatId,
        sender_id: localMsg.senderId,
        content: localMsg.text || '',
        message_type: 'text',
      };
      const { data, error } = await sb.from('messages')
        .insert(payload).select().single();
      if (error) { console.error('[Sync] writeMessage error:', error); return; }

      // Update conversation last message
      await sb.from('conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_preview: (localMsg.text || '').substring(0, 100),
      }).eq('id', localMsg.chatId);

      if (data && data.id !== localMsg.id) {
        const msgs = DB.getMessages();
        const idx = msgs.findIndex(m => m.id === localMsg.id);
        if (idx >= 0) { msgs[idx].id = data.id; DB.setMessages(msgs); }
      }
    } catch (e) { console.error('[Sync] writeMessage failed:', e); }
  },

  async updateApplicationStatus(localAppId, status) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      await sb.from('job_applications')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', localAppId);
    } catch (e) { console.error('[Sync] updateApplicationStatus failed:', e); }
  },

  async markNotificationsRead(userId) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      await sb.from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (e) { console.error('[Sync] markNotificationsRead failed:', e); }
  },

  async togglePostLike(postId, userId, liked) {
    if (!this._sb()) return;
    try {
      const sb = this._sb();
      if (liked) {
        await sb.from('post_likes').delete()
          .eq('post_id', postId).eq('user_id', userId);
        await sb.rpc('decrement_column', { table_name: 'community_posts', column_name: 'like_count', row_id: postId }).catch(() => {});
      } else {
        await sb.from('post_likes').insert({ post_id: postId, user_id: userId });
        await sb.rpc('increment_column', { table_name: 'community_posts', column_name: 'like_count', row_id: postId }).catch(() => {});
      }
    } catch (e) { console.error('[Sync] togglePostLike failed:', e); }
  },

  async addComment(postId, userId, text) {
    if (!this._sb()) return null;
    try {
      const sb = this._sb();
      const { data, error } = await sb.from('post_comments')
        .insert({ post_id: postId, author_id: userId, content: text })
        .select().single();
      if (error) throw error;
      await sb.rpc('increment_column', { table_name: 'community_posts', column_name: 'comment_count', row_id: postId }).catch(() => {});
      return { id: data.id, userId, text, createdAt: data.created_at };
    } catch (e) { console.error('[Sync] addComment failed:', e); return null; }
  },
};

// ── Monkey-patch DB write functions for write-through ───────────────────────
(function() {
  const orig = {
    addJob: DB.addJob.bind(DB),
    addApplication: DB.addApplication.bind(DB),
    addCommunityPost: DB.addCommunityPost.bind(DB),
    addNotification: DB.addNotification.bind(DB),
    addReview: DB.addReview.bind(DB),
    addMessage: DB.addMessage.bind(DB),
    updateApplication: DB.updateApplication.bind(DB),
    markNotificationsRead: DB.markNotificationsRead.bind(DB),
    updateCommunityPost: DB.updateCommunityPost.bind(DB),
    deleteCommunityPost: DB.deleteCommunityPost.bind(DB),
  };

  DB.addJob = function(job) {
    const local = orig.addJob(job);
    SupabaseSync.writeJob(local);
    return local;
  };

  DB.addApplication = function(app) {
    const local = orig.addApplication(app);
    SupabaseSync.writeApplication(local);
    return local;
  };

  DB.addCommunityPost = function(post) {
    const local = orig.addCommunityPost(post);
    SupabaseSync.writeCommunityPost(local);
    return local;
  };

  DB.addNotification = function(notif) {
    const local = orig.addNotification(notif);
    SupabaseSync.writeNotification(local);
    return local;
  };

  DB.addReview = function(review) {
    const local = orig.addReview(review);
    SupabaseSync.writeReview(local);
    return local;
  };

  DB.addMessage = function(msg) {
    const local = orig.addMessage(msg);
    SupabaseSync.writeMessage(local);
    return local;
  };

  DB.updateApplication = function(id, data) {
    const local = orig.updateApplication(id, data);
    if (data.status) SupabaseSync.updateApplicationStatus(id, data.status);
    return local;
  };

  DB.markNotificationsRead = function(userId) {
    orig.markNotificationsRead(userId);
    SupabaseSync.markNotificationsRead(userId);
  };

  DB.updateCommunityPost = function(id, data) {
    const local = orig.updateCommunityPost(id, data);
    if (data.likes) {
      const user = Auth?.currentUser;
      if (user) SupabaseSync.togglePostLike(id, user.id, data.likes.includes(user.id));
    }
    return local;
  };

  DB.deleteCommunityPost = function(id) {
    orig.deleteCommunityPost(id);
    if (SupabaseSync._sb()) {
      SupabaseSync._sb().from('community_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .catch(e => console.error('[Sync] deletePost failed:', e));
    }
  };
})();

// ── Realtime (live chat) ─────────────────────────────────────────────────────
SupabaseSync._realtimeChannel = null;
SupabaseSync._presenceChannel = null;
SupabaseSync._typingChannel = null;
SupabaseSync._convPartsMap = null;
SupabaseSync._onlineUserIds = new Set();

SupabaseSync.isOnline = function(userId) {
  return this._onlineUserIds.has(userId);
};

SupabaseSync._loadConversationParticipantsMap = async function() {
  const sb = this._sb();
  if (!sb) return {};
  const { data } = await sb.from('conversation_participants')
    .select('conversation_id, user_id, left_at');
  const map = {};
  (data || []).forEach(p => {
    if (p.left_at) return;
    (map[p.conversation_id] = map[p.conversation_id] || []).push(p.user_id);
  });
  return map;
};

SupabaseSync._ensureConversationLocal = async function(conversationId) {
  const sb = this._sb();
  if (!sb) return;
  try {
    const [convRes, partsRes] = await Promise.all([
      sb.from('conversations').select('*').eq('id', conversationId).single(),
      sb.from('conversation_participants').select('user_id').eq('conversation_id', conversationId),
    ]);
    const conv = convRes.data;
    if (!conv) return;
    const chats = DB.getChats();
    if (chats.find(c => c.id === conversationId)) return;
    chats.push({
      id: conversationId,
      participants: (partsRes.data || []).map(p => p.user_id),
      createdAt: conv.created_at,
      lastMessage: conv.last_message_preview || '',
      lastMessageAt: conv.last_message_at || conv.created_at,
    });
    DB.setChats(chats);
  } catch (e) { console.warn('[Sync] ensureConversationLocal failed:', e); }
};

SupabaseSync.subscribeRealtime = async function(userId) {
  const sb = this._sb();
  if (!sb || this._realtimeChannel) return;
  if (!userId) return;
  try {
    this._convPartsMap = await this._loadConversationParticipantsMap();

    // ── Chat messages channel ──────────────────────────────────────────────
    const msgChannel = sb.channel('chat-realtime');
    msgChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        this._onRealtimeMessage(payload.new);
      })
      .subscribe((status) => this._retryIfDead(msgChannel, status, () => { this._realtimeChannel = null; }));

    // ── Notifications channel ──────────────────────────────────────────────
    const notifChannel = sb.channel('notif-realtime');
    notifChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        this._onRealtimeNotification(payload.new);
      })
      .subscribe((status) => this._retryIfDead(notifChannel, status));

    // ── Presence (online status) ───────────────────────────────────────────
    const presence = sb.channel('online-presence');
    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState();
        const ids = new Set();
        Object.values(state).forEach(list => list.forEach(p => { if (p.user_id) ids.add(p.user_id); }));
        this._onlineUserIds = ids;
        document.dispatchEvent(new CustomEvent('chat-presence'));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presence.track({ user_id: userId }).catch(e => console.warn('[Sync] presence track failed:', e));
        } else if (this._retryIfDead(presence, status)) { return; }
      });

    // ── Typing broadcast ───────────────────────────────────────────────────
    const typing = sb.channel('chat-typing');
    typing
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        document.dispatchEvent(new CustomEvent('chat-typing', { detail: payload }));
      })
      .subscribe((status) => this._retryIfDead(typing, status));

    this._realtimeChannel = msgChannel;
    this._presenceChannel = presence;
    this._typingChannel = typing;
    console.log('[Sync] Realtime chat subscribed');
  } catch (e) { console.error('[Sync] subscribeRealtime failed:', e); }
};

SupabaseSync._retryIfDead = function(channel, status, onDead) {
  const dead = status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT';
  if (!dead) return false;
  if (onDead) onDead();
  setTimeout(() => {
    const user = Auth?.currentUser;
    if (user && SupabaseAuth?.client) {
      if (onDead) onDead();
      channel.subscribe((s2) => this._retryIfDead(channel, s2, onDead));
    }
  }, 5000);
  return true;
};

SupabaseSync.disconnectRealtime = function() {
  const sb = this._sb();
  if (!sb) return;
  if (this._realtimeChannel) { sb.removeChannel(this._realtimeChannel); this._realtimeChannel = null; }
  if (this._presenceChannel) { sb.removeChannel(this._presenceChannel); this._presenceChannel = null; }
  if (this._typingChannel) { sb.removeChannel(this._typingChannel); this._typingChannel = null; }
};

SupabaseSync._onRealtimeNotification = function(row) {
  if (!row) return;
  const currentUserId = Auth?.currentUser?.id;
  if (!currentUserId || row.user_id !== currentUserId) return;
  const notifs = DB._get('notifications') || [];
  if (notifs.find(n => n.id === row.id)) return;
  notifs.push({
    id: row.id,
    userId: row.user_id,
    type: row.type || 'system',
    text: row.title + (row.body ? ': ' + row.body : ''),
    read: row.is_read || false,
    createdAt: row.created_at,
    link: (row.data && row.data.link) || '',
  });
  DB._set('notifications', notifs);
  document.dispatchEvent(new CustomEvent('chat-realtime', { detail: { notification: true } }));
};

SupabaseSync._onRealtimeMessage = function(row) {
  if (!row || row.is_deleted || row.deleted_at) return;
  const currentUserId = Auth?.currentUser?.id;
  if (!currentUserId) return;
  const msgs = DB.getMessages();
  if (msgs.find(m => m.id === row.id)) return;

  // Echo of our own send — bind the real Supabase id to the pending local message
  if (row.sender_id === currentUserId) {
    const pending = msgs.find(m =>
      m.senderId === currentUserId &&
      m.chatId === row.conversation_id &&
      m.text === (row.content || '') &&
      /^MSG/.test(m.id) &&
      Math.abs(new Date(m.createdAt).getTime() - new Date(row.created_at).getTime()) < 15000
    );
    if (pending) { pending.id = row.id; DB.setMessages(msgs); return; }
  }

  const parts = this._convPartsMap && this._convPartsMap[row.conversation_id];
  if (parts && !parts.includes(currentUserId)) return;
  if (!parts) this._loadConversationParticipantsMap().then(m => { this._convPartsMap = m; });

  const msg = {
    id: row.id,
    chatId: row.conversation_id,
    senderId: row.sender_id,
    text: row.content || '',
    createdAt: row.created_at,
    read: row.sender_id === currentUserId,
  };
  msgs.push(msg);
  DB.setMessages(msgs);

  const chats = DB.getChats();
  let conv = chats.find(c => c.id === row.conversation_id);
  if (conv) {
    conv.lastMessage = row.content || '';
    conv.lastMessageAt = row.created_at;
  } else {
    this._ensureConversationLocal(row.conversation_id);
  }
  DB.setChats(chats);

  document.dispatchEvent(new CustomEvent('chat-realtime', { detail: { message: msg } }));
};

SupabaseSync.sendTyping = function(conversationId, isTyping) {
  const user = Auth?.currentUser;
  if (!this._typingChannel || !user) return;
  this._typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { conversationId, userId: user.id, name: user.name, isTyping },
  }).catch(() => {});
};

// ── Admin: Real stats from Supabase (cached for sync access) ────────────────
SupabaseSync._realStats = null;

SupabaseSync.fetchStats = async function() {
  if (!this._sb()) return;
  try {
    const sb = this._sb();
    const [usersRes, jobsRes, appsRes] = await Promise.allSettled([
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('jobs').select('id, status', { count: 'exact' }),
      sb.from('job_applications').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = usersRes.status === 'fulfilled' ? (usersRes.value.count || 0) : 0;
    const totalJobs = jobsRes.status === 'fulfilled' ? (jobsRes.value.count || 0) : 0;
    const totalApps = appsRes.status === 'fulfilled' ? (appsRes.value.count || 0) : 0;

    const users = DB.getUsers();
    this._realStats = {
      totalUsers,
      totalFarmers: users.filter(u => u.role === 'farmer').length || Math.round(totalUsers * 0.6),
      totalWorkers: users.filter(u => u.role === 'worker').length || Math.round(totalUsers * 0.35),
      totalJobs,
      activeJobs: jobsRes.status === 'fulfilled' ? (jobsRes.value.data || []).filter(j => j.status === 'open' || j.status === 'in_progress').length : 0,
      filledJobs: jobsRes.status === 'fulfilled' ? (jobsRes.value.data || []).filter(j => j.status === 'completed').length : 0,
      totalApplications: totalApps,
      verifiedUsers: users.filter(u => u.verified).length,
      armaParmaRequests: 0,
      activeArmaParma: 0,
      completedExchanges: 0,
    };
    console.log('[Sync] Real stats fetched');
  } catch (e) {
    console.warn('[Sync] fetchStats failed:', e);
  }
};

const _origGetStats = DB.getStats.bind(DB);
DB.getStats = function() {
  if (SupabaseSync._realStats) return SupabaseSync._realStats;
  return _origGetStats();
};

console.log('[Sync] Supabase sync layer loaded');
