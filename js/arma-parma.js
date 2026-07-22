const ArmaParma = {
  currentMode: 'paid',

  toggleWorkMode(mode) {
    this.currentMode = mode;
    document.getElementById('workMode').value = mode;
    document.querySelectorAll('.work-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    const paidFields = document.getElementById('paidFields');
    const armaFields = document.getElementById('armaFields');
    const wageInput = document.getElementById('jobDailyWage');
    if (mode === 'arma-parma') {
      if (paidFields) paidFields.classList.add('hidden');
      if (armaFields) armaFields.classList.add('show');
      if (wageInput) wageInput.removeAttribute('required');
    } else {
      if (paidFields) paidFields.classList.remove('hidden');
      if (armaFields) armaFields.classList.remove('show');
      if (wageInput) wageInput.setAttribute('required', 'required');
    }
  },

  postRequest(data) {
    if (!Auth.requireRole('farmer')) return null;
    data.farmerId = Auth.currentUser.id;
    const req = DB.addArmaParmaRequest(data);
    DB.addAuditLog({ action: 'arma_parma_posted', userId: Auth.currentUser.id, details: `Arma Parma request posted: ${req.title}` });
    DB.addNotification({ userId: Auth.currentUser.id, type: 'welcome', text: `Your Arma Parma request "${req.title}" is now live!`, link: 'jobs.html?mode=arma-parma' });
    DB.addCalendarEvent({ userId: Auth.currentUser.id, type: 'arma-parma', title: req.title, date: req.date, endDate: req.date, color: '#16a34a', armaParmaId: req.id });
    return req;
  },

  searchRequests(filters = {}) {
    let requests = DB.getArmaParmaRequests().filter(r => r.status !== 'expired');
    if (filters.q) {
      const q = filters.q.toLowerCase();
      requests = requests.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.cropType?.toLowerCase().includes(q));
    }
    if (filters.district) requests = requests.filter(r => r.district === filters.district);
    if (filters.cropType) requests = requests.filter(r => r.cropType === filters.cropType);
    if (filters.workType) requests = requests.filter(r => r.workType === filters.workType);
    if (filters.status) requests = requests.filter(r => r.status === filters.status);
    if (filters.sort === 'oldest') requests.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return requests;
  },

  renderArmaParmaCard(req) {
    const farmer = DB.getUserById(req.farmerId);
    const isApplied = Auth.currentUser && req.applicants?.includes(Auth.currentUser.id);
    const creditInfo = farmer ? DB.getLaborCreditsByUser(farmer.id) : { balance: 0 };
    return `
      <div class="job-card arma-parma-card hover-lift" data-animate="fadeUp">
        <div class="job-card-image">
          <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=300&fit=crop" alt="${req.title}" loading="lazy">
          <div class="job-card-status">
            <span class="badge badge-arma">🤝 Arma Parma</span>
            <span class="badge badge-${req.status === 'open' ? 'success' : req.status === 'completed' ? 'info' : 'secondary'}">${Utils.capitalize(req.status)}</span>
          </div>
        </div>
        <div class="job-card-body">
          <div class="job-card-title"><a href="job-detail.html?id=${req.id}&type=arma-parma">${Utils.escapeHtml(req.title)}</a></div>
          <div class="job-card-company">
            ${farmer ? Utils.avatarHTML(farmer.avatar, farmer.name, 'sm') : ''}
            <span>${farmer ? farmer.farmName || farmer.name : 'Unknown Farm'}</span>
            ${farmer?.verified ? '<span class="badge badge-success" style="font-size:0.65rem">✅ Verified</span>' : ''}
          </div>
          <div class="job-card-meta">
            <span>📍 ${req.district}${req.municipality ? ', ' + req.municipality : ''}</span>
            <span>🌾 ${req.cropType || 'General'}</span>
            <span>👥 ${req.helpersNeeded} helpers</span>
          </div>
          <div class="job-card-tags">
            ${req.workType ? `<span class="badge badge-primary">${req.workType}</span>` : ''}
            <span class="badge badge-success">📅 ${Utils.formatDateShort(req.date)}</span>
            ${req.foodProvided ? '<span class="badge badge-success">🍽️ Food</span>' : ''}
            ${req.teaSnacksProvided ? '<span class="badge badge-warning">🍵 Tea</span>' : ''}
            ${req.equipmentProvided ? '<span class="badge badge-info">🔧 Tools</span>' : ''}
          </div>
          <div class="arma-parma-commitment">
            <strong>🤝 Return:</strong> ${Utils.escapeHtml(Utils.truncate(req.returnCommitment || '', 100))}
          </div>
          <div class="job-card-footer">
            <div class="job-card-wage"><span class="arma-credit-badge">⏱ ${req.expectedDuration || 'TBD'}</span></div>
            ${isApplied ? '<span class="badge badge-success">Applied</span>' : ''}
            <span class="text-sm text-muted">${Utils.formatTime(req.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  },

  renderArmaParmaDetail(req) {
    if (!req) return '<div class="empty-state"><h3>Request not found</h3></div>';
    const farmer = DB.getUserById(req.farmerId);
    const isApplied = Auth.currentUser && req.applicants?.includes(Auth.currentUser.id);
    const creditInfo = farmer ? DB.getLaborCreditsByUser(farmer.id) : { balance: 0 };
    const exchanges = farmer ? DB.getExchangesByUser(farmer.id) : [];
    const completedExchanges = exchanges.filter(e => e.status === 'completed').length;

    return `
      <div class="container py-8" style="margin-top:var(--navbar-height)">
        <div class="breadcrumb mb-6">
          <a href="index.html">Home</a><span class="separator">/</span>
          <a href="jobs.html?mode=arma-parma">Arma Parma</a><span class="separator">/</span>
          <span class="current">${Utils.escapeHtml(req.title)}</span>
        </div>
        <div class="job-status-banner active" style="background:linear-gradient(135deg,#16a34a,#059669)">
          <span style="font-size:1.1rem">🤝 Arma Parma — Labor Exchange Request</span>
        </div>
        <div class="dashboard-grid-sidebar">
          <div>
            <div class="card mb-6">
              <div class="card-body">
                <div class="flex justify-between items-start mb-4">
                  <h1 style="font-size:1.5rem;margin:0">${Utils.escapeHtml(req.title)}</h1>
                  <span class="badge badge-arma" style="font-size:0.85rem">🤝 Arma Parma</span>
                </div>
                <div class="job-card-meta mb-4">
                  <span>📍 ${req.district}${req.municipality ? ', ' + req.municipality : ''}${req.ward ? ', Ward ' + req.ward : ''}</span>
                  <span>🌾 ${req.cropType || 'General'}</span>
                  <span>👥 ${req.helpersNeeded} helpers needed</span>
                  <span>📅 ${Utils.formatDate(req.date)}</span>
                  <span>⏰ ${req.startTime || '06:00'} — ${req.expectedDuration || 'Flexible'}</span>
                </div>
                <h4>Description</h4>
                <p>${Utils.escapeHtml(req.description)}</p>
                ${req.workType ? `<h4 class="mt-4">Work Type</h4><p>${Utils.escapeHtml(req.workType)}</p>` : ''}
                <h4 class="mt-4">Required Skills</h4>
                <div class="flex flex-wrap gap-2 mt-2">
                  ${(req.requiredSkills || []).map(s => `<span class="badge badge-primary">${s}</span>`).join('') || '<span class="text-muted">Any skills welcome</span>'}
                </div>
                <div class="arma-detail-section mt-6">
                  <h4>🤝 Return Labor Commitment</h4>
                  <div class="arma-commitment-box">
                    <p style="margin:0;font-size:1rem;line-height:1.6">"${Utils.escapeHtml(req.returnCommitment)}"</p>
                  </div>
                </div>
                <h4 class="mt-6">Amenities</h4>
                <div class="flex flex-wrap gap-3 mt-2">
                  ${req.foodProvided ? '<div class="flex items-center gap-2"><span>✅</span> Food Provided</div>' : '<div class="flex items-center gap-2"><span>❌</span> No Food</div>'}
                  ${req.teaSnacksProvided ? '<div class="flex items-center gap-2"><span>✅</span> Tea/Snacks Provided</div>' : '<div class="flex items-center gap-2"><span>❌</span> No Tea/Snacks</div>'}
                  ${req.equipmentProvided ? '<div class="flex items-center gap-2"><span>✅</span> Equipment Provided</div>' : '<div class="flex items-center gap-2"><span>❌</span> Bring Your Own</div>'}
                </div>
                ${req.additionalNotes ? `<h4 class="mt-6">Additional Notes</h4><p>${Utils.escapeHtml(req.additionalNotes)}</p>` : ''}
                <div class="arma-agreement-section mt-6">
                  <h4>🤝 Arma Parma Agreement</h4>
                  <div class="agreement-box" style="border:2px solid var(--primary)">
                    <ul>
                      <li>Equal labor exchange — return the same amount of work</li>
                      <li>Mutual respect and fair treatment</li>
                      <li>Safe working conditions for all participants</li>
                      <li>Completion of agreed work within the specified timeframe</li>
                    </ul>
                    <p style="font-size:0.8rem;color:var(--text-tertiary);margin:12px 0 0">This agreement is digitally recorded on the platform.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="card mb-4">
              <div class="card-body text-center">
                <div style="font-size:2.5rem;margin-bottom:8px">🤝</div>
                <h3 style="color:var(--primary);margin-bottom:4px">Labor Exchange</h3>
                <p class="text-sm text-muted mb-4">No money needed — return help later</p>
                <hr class="divider">
                <div class="flex flex-col gap-2 text-sm">
                  <div class="flex justify-between"><span class="text-muted">Helpers Needed:</span><strong>${req.helpersNeeded}</strong></div>
                  <div class="flex justify-between"><span class="text-muted">Date:</span><strong>${Utils.formatDate(req.date)}</strong></div>
                  <div class="flex justify-between"><span class="text-muted">Start Time:</span><strong>${req.startTime || '06:00'}</strong></div>
                  <div class="flex justify-between"><span class="text-muted">Duration:</span><strong>${req.expectedDuration || 'TBD'}</strong></div>
                </div>
                <hr class="divider">
                ${req.status === 'open' && Auth.currentUser && !isApplied ? `<button class="btn btn-primary btn-block" onclick="ArmaParma.showJoinModal('${req.id}')">🤝 Join This Exchange</button>` : ''}
                ${isApplied ? '<button class="btn btn-outline btn-block" disabled>✅ Already Applied</button>' : ''}
                ${!Auth.isLoggedIn() ? `<a href="login.html?redirect=job-detail.html?id=${req.id}&type=arma-parma" class="btn btn-primary btn-block">Login to Join</a>` : ''}
                ${req.status === 'open' && Auth.currentUser && Auth.currentUser.id === req.farmerId ? `<a href="post-job.html?edit=${req.id}&type=arma-parma" class="btn btn-outline btn-block mt-2">✏️ Edit Request</a>` : ''}
              </div>
            </div>
            ${farmer ? `
              <div class="card mb-4">
                <div class="card-body">
                  <h4 class="mb-4">Posted By</h4>
                  <div class="flex items-center gap-3 mb-4">
                    ${Utils.avatarHTML(farmer.avatar, farmer.name, 'lg')}
                    <div>
                      <div class="font-semibold"><a href="worker-profile.html?id=${farmer.id}">${farmer.name}</a></div>
                      <div class="text-sm text-muted">${farmer.farmName || 'Farmer'}</div>
                      ${farmer.verified ? '<span class="badge badge-success mt-1">✅ Verified</span>' : ''}
                    </div>
                  </div>
                  <div class="flex justify-between text-sm mb-2"><span class="text-muted">Rating:</span><span>${Utils.ratingHTML(DB.getAvgRating(farmer.id))}</span></div>
                  <div class="flex justify-between text-sm mb-2"><span class="text-muted">Location:</span><strong>${farmer.district || 'Nepal'}</strong></div>
                  <div class="flex justify-between text-sm mb-2"><span class="text-muted">Exchanges:</span><strong>${completedExchanges}</strong></div>
                  ${Auth.isLoggedIn() && Auth.currentUser.id !== farmer.id ? `<a href="chat.html?user=${farmer.id}" class="btn btn-outline btn-block mt-4">💬 Message</a>` : ''}
                </div>
              </div>
            ` : ''}
            <div class="card">
              <div class="card-body">
                <h4 class="mb-3">Smart Matches</h4>
                ${this.getSmartMatches(req).length ? this.getSmartMatches(req).map(m => `
                  <div class="flex items-center gap-3 p-2 hover-lift" style="border-bottom:1px solid var(--border-light);cursor:pointer" onclick="window.location.href='worker-profile.html?id=${m.id}'">
                    ${Utils.avatarHTML(m.avatar, m.name, 'sm')}
                    <div class="flex-1">
                      <div class="font-semibold text-sm">${m.name}</div>
                      <div class="text-xs text-muted">📍 ${m.district} | ⭐ ${DB.getAvgRating(m.id) || 'New'}</div>
                    </div>
                  </div>
                `).join('') : '<p class="text-muted text-sm">No smart matches found nearby.</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  showJoinModal(requestId) {
    if (!Auth.requireAuth()) return;
    const req = DB.getArmaParmaById(requestId);
    if (!req) return;
    const modal = document.getElementById('applyModal');
    if (modal) {
      modal.querySelector('.modal-body').innerHTML = `
        <h4 style="margin-bottom:16px">🤝 Join: ${Utils.escapeHtml(req.title)}</h4>
        <div style="background:var(--primary-50);border-radius:var(--radius);padding:16px;margin-bottom:16px">
          <p style="margin:0;font-size:0.9rem;color:var(--text-secondary)">This is an <strong>Arma Parma (Labor Exchange)</strong> request. You will help the farmer for <strong>${req.expectedDuration || 'the agreed duration'}</strong> and the farmer commits to returning the same labor when you need it.</p>
        </div>
        <div class="agreement-box" style="border:2px solid var(--primary);margin-bottom:16px">
          <h4 style="margin:0 0 8px;color:var(--primary)">🤝 Agreement</h4>
          <ul style="margin:0;padding-left:20px;font-size:0.85rem">
            <li>Equal labor exchange</li>
            <li>Mutual respect</li>
            <li>Safe working conditions</li>
            <li>Completion of agreed work</li>
          </ul>
        </div>
        <div class="form-group">
          <label class="form-label">Message to Farmer</label>
          <textarea class="form-textarea" id="applyMessage" rows="4" placeholder="Introduce yourself and confirm you agree to the Arma Parma terms..."></textarea>
        </div>
      `;
      modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-ghost" onclick="Utils.hideModal('applyModal')">Cancel</button>
        <button class="btn btn-primary" onclick="ArmaParma.submitJoin('${requestId}')">🤝 Confirm & Join</button>
      `;
      Utils.showModal('applyModal');
    }
  },

  submitJoin(requestId) {
    const message = document.getElementById('applyMessage')?.value.trim();
    if (!message) { Utils.toast('Please write a message to the farmer.', 'warning'); return; }
    const req = DB.getArmaParmaById(requestId);
    if (!req) return;
    const applicants = req.applicants || [];
    if (!applicants.includes(Auth.currentUser.id)) applicants.push(Auth.currentUser.id);
    DB.updateArmaParmaRequest(requestId, { applicants });
    DB.addNotification({ userId: req.farmerId, type: 'application', text: `${Auth.currentUser.name} wants to join your Arma Parma: "${req.title}"`, link: `job-detail.html?id=${requestId}&type=arma-parma` });
    DB.addCalendarEvent({ userId: Auth.currentUser.id, type: 'arma-parma', title: req.title, date: req.date, endDate: req.date, color: '#16a34a', armaParmaId: requestId });
    Utils.hideModal('applyModal');
    Utils.toast('🤝 Arma Parma application submitted!', 'success');
    setTimeout(() => location.reload(), 1000);
  },

  acceptApplicant(requestId, applicantId) {
    const req = DB.getArmaParmaById(requestId);
    if (!req) return;
    const exchange = DB.addExchange({
      armaParmaId: requestId, farmer1Id: req.farmerId, farmer2Id: applicantId,
      cropType: req.cropType, workType: req.workType, days: parseInt(req.expectedDuration) || 1,
      farmer1Worked: false, farmer2Worked: false, status: 'active',
      agreementAcceptedAt: new Date().toISOString()
    });
    DB.addLaborCredit({ earnerId: applicantId, debtorId: req.farmerId, days: parseInt(req.expectedDuration) || 1, exchangeId: exchange.id, status: 'pending' });
    DB.updateArmaParmaRequest(requestId, { status: 'in-progress', acceptedWorker: applicantId });
    DB.addNotification({ userId: applicantId, type: 'accepted', text: `Your Arma Parma application for "${req.title}" has been accepted!`, link: `job-detail.html?id=${requestId}&type=arma-parma` });
    Utils.toast('Applicant accepted! Labor credit recorded.', 'success');
    setTimeout(() => location.reload(), 1000);
  },

  completeExchange(exchangeId) {
    const exchange = DB.getExchangeHistory().find(e => e.id === exchangeId);
    if (!exchange) return;
    DB.updateExchange(exchangeId, { status: 'completed' });
    const credit = DB.getLaborCredits().find(c => c.exchangeId === exchangeId);
    if (credit) DB.updateLaborCredit(credit.id, { status: 'completed' });
    DB.addNotification({ userId: exchange.farmer1Id, type: 'completion', text: `Arma Parma exchange completed! Labor credits updated.`, link: '' });
    DB.addNotification({ userId: exchange.farmer2Id, type: 'completion', text: `Arma Parma exchange completed! Labor credits updated.`, link: '' });
    Utils.toast('Exchange completed! Credits updated.', 'success');
    setTimeout(() => location.reload(), 1000);
  },

  getSmartMatches(request) {
    const farmers = DB.getUsers().filter(u => u.role === 'farmer' && u.id !== request.farmerId);
    return farmers.map(f => {
      let score = 0;
      if (f.district === request.district) score += 30;
      if (f.crops?.includes(request.cropType)) score += 20;
      const creditInfo = DB.getLaborCreditsByUser(f.id);
      if (creditInfo.balance > 0) score += 15;
      if (DB.getAvgRating(f.id) >= 4) score += 15;
      const exchanges = DB.getExchangesByUser(f.id).filter(e => e.status === 'completed');
      if (exchanges.length > 0) score += 10;
      return { ...f, matchScore: score };
    }).filter(f => f.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  },

  getNearbyFarmers(request, maxDistance) {
    const farmers = DB.getUsers().filter(u => u.role === 'farmer');
    return farmers.filter(f => {
      if (f.id === request.farmerId) return false;
      if (f.district !== request.district) return false;
      return true;
    });
  },

  renderWorkModeBadge(mode) {
    if (mode === 'arma-parma') return '<span class="badge badge-arma">🤝 Arma Parma</span>';
    return '<span class="badge badge-paid">💰 Paid</span>';
  },

  getExchangesByUser(userId) { return DB.getExchangesByUser(userId); },
  getCreditsByUser(userId) { return DB.getLaborCreditsByUser(userId); }
};
