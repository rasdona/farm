const Workers = {
  searchWorkers(filters = {}) {
    let workers = DB.getUsers().filter(u => u.role === 'worker' && !u.suspended);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      workers = workers.filter(w => w.name.toLowerCase().includes(q) || w.skills?.some(s => s.toLowerCase().includes(q)) || w.district?.toLowerCase().includes(q));
    }
    if (filters.district) workers = workers.filter(w => w.district === filters.district || w.availableDistricts?.includes(filters.district));
    if (filters.skill) workers = workers.filter(w => w.skills?.includes(filters.skill));
    if (filters.experience) workers = workers.filter(w => (w.experience || 0) >= parseInt(filters.experience));
    if (filters.wageMin) workers = workers.filter(w => (w.expectedWage?.daily || 0) >= parseInt(filters.wageMin));
    if (filters.wageMax) workers = workers.filter(w => (w.expectedWage?.daily || 0) <= parseInt(filters.wageMax));
    if (filters.verified) workers = workers.filter(w => w.verified);
    if (filters.availability) workers = workers.filter(w => w.availability === filters.availability);
    if (filters.sort === 'rating') workers.sort((a, b) => parseFloat(DB.getAvgRating(b.id)) - parseFloat(DB.getAvgRating(a.id)));
    else if (filters.sort === 'experience') workers.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    else if (filters.sort === 'wage-low') workers.sort((a, b) => (a.expectedWage?.daily || 0) - (b.expectedWage?.daily || 0));
    else if (filters.sort === 'wage-high') workers.sort((a, b) => (b.expectedWage?.daily || 0) - (a.expectedWage?.daily || 0));
    else workers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return workers;
  },

  renderWorkerList(containerId, workers, emptyMsg = 'No workers found') {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!workers.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">👷</div><h3>${emptyMsg}</h3><p>Try adjusting your search filters or check back later.</p></div>`;
      return;
    }
    el.innerHTML = workers.map(w => App.renderWorkerCard(w)).join('');
  },

  renderWorkerProfile(worker) {
    if (!worker || worker.role !== 'worker') return '<div class="empty-state"><h3>Worker not found</h3></div>';
    const rating = DB.getAvgRating(worker.id);
    const reviews = DB.getReviews(worker.id);
    const completedJobs = DB.getApplications().filter(a => a.workerId === worker.id && a.status === 'accepted').length;
    const creditInfo = DB.getLaborCreditsByUser(worker.id);
    const exchanges = DB.getExchangesByUser(worker.id);
    const completedExchanges = exchanges.filter(e => e.status === 'completed').length;
    const armaReqs = DB.getArmaParmaRequests().filter(r => r.applicants?.includes(worker.id));
    const reliabilityScore = reviews.length > 0 ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100) : 0;
    const userRoles = DB.getUserRoles(worker.id);
    return `
      <div class="profile-header">
        <div class="profile-cover" style="background:linear-gradient(135deg, #16a34a 0%, #15803d 50%, #0f766e 100%)">
          <div class="profile-cover-overlay"></div>
        </div>
        <div class="profile-info">
          <div class="profile-avatar-wrapper">
            ${Utils.avatarHTML(Utils.getUserPhoto(worker), worker.name, 'xxl')}
            ${worker.verified ? '<div class="profile-verification">✅</div>' : ''}
          </div>
          <div class="profile-header-content">
            <div>
              <h1 class="profile-name">${worker.name}</h1>
              <div class="flex flex-wrap gap-2 mt-1">
                ${userRoles.map(r => { const role = AUTH_ROLES.find(ar => ar.id === r); return role ? `<span class="badge badge-primary" style="font-size:0.75rem">${role.icon} ${role.nameNe}</span>` : ''; }).join('')}
              </div>
              <p class="profile-tagline">${Utils.escapeHtml(worker.bio || 'Agricultural Worker')}</p>
              <div class="profile-meta">
                <span>📍 ${worker.district || 'Nepal'}</span>
                <span>🔧 ${worker.experience || 0} years experience</span>
                <span>🌐 ${(worker.languages || ['Nepali']).join(', ')}</span>
                <span class="badge badge-${worker.availability === 'available' ? 'success' : worker.availability === 'busy' ? 'warning' : 'secondary'}">${Utils.capitalize(worker.availability || 'available')}</span>
              </div>
            </div>
            <div class="profile-actions">
              ${Auth.isFarmer() ? `<a href="chat.html?user=${worker.id}" class="btn btn-primary">💬 Message</a>` : ''}
              ${Auth.isFarmer() ? `<button class="btn btn-outline" onclick="Utils.toast('Invitation sent!','success')">📨 Invite</button>` : ''}
              ${Auth.currentUser && Auth.currentUser.id !== worker.id ? `<button class="btn btn-outline" onclick="App.toggleSaveWorker('${worker.id}',this)">🤍 Save</button>` : ''}
            </div>
          </div>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="number">${rating > 0 ? rating : '-'}</div><div class="label">Rating</div></div>
          <div class="profile-stat"><div class="number">${reviews.length}</div><div class="label">Reviews</div></div>
          <div class="profile-stat"><div class="number">${completedJobs}</div><div class="label">Jobs Done</div></div>
          <div class="profile-stat"><div class="number">${completedExchanges}</div><div class="label">Exchanges</div></div>
          <div class="profile-stat"><div class="number">${Utils.formatCurrency(worker.expectedWage?.daily || 0)}</div><div class="label">Daily Wage</div></div>
        </div>
      </div>
      <div class="grid grid-sidebar" style="grid-template-columns:2fr 1fr;gap:24px">
        <div>
          <div class="card mb-4">
            <div class="card-header"><h3>About</h3></div>
            <div class="card-body"><p>${Utils.escapeHtml(worker.bio || 'No bio available.')}</p></div>
          </div>
          <div class="card mb-4">
            <div class="card-header"><h3>Skills</h3></div>
            <div class="card-body">
              <div class="flex flex-wrap gap-2">
                ${(worker.skills || []).map(s => `<span class="badge badge-primary" style="font-size:0.85rem;padding:6px 14px">${s}</span>`).join('') || '<span class="text-muted">No skills listed</span>'}
              </div>
            </div>
          </div>
          <div class="card mb-4">
            <div class="card-header"><h3>Available Districts</h3></div>
            <div class="card-body">
              <div class="flex flex-wrap gap-2">
                ${(worker.availableDistricts || [worker.district]).filter(Boolean).map(d => `<span class="badge badge-info">📍 ${d}</span>`).join('') || '<span class="text-muted">Not specified</span>'}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Reviews (${reviews.length})</h3></div>
            <div class="card-body">
              ${reviews.length ? reviews.map(r => {
                const reviewer = DB.getUserById(r.reviewerId);
                return `<div class="review-card">
                  <div class="review-card-header">
                    ${Utils.avatarHTML(Utils.getUserPhoto(reviewer), reviewer?.name || 'User', 'md')}
                    <div><div class="review-card-author">${reviewer?.name || 'Anonymous'}</div><div class="review-card-date">${Utils.formatDate(r.createdAt)}</div></div>
                    <div style="margin-left:auto">${Utils.ratingHTML(r.rating)}</div>
                  </div>
                  <div class="review-card-text">${Utils.escapeHtml(r.text)}</div>
                </div>`;
              }).join('') : '<p class="text-muted text-center py-4">No reviews yet</p>'}
            </div>
          </div>
        </div>
        <div>
          <div class="labor-credit-card mb-4">
            <h4 class="mb-3" style="color:#065f46">🤝 Labor Credits</h4>
            <div class="credit-balance">${creditInfo.balance >= 0 ? '+' : ''}${creditInfo.balance}</div>
            <div class="credit-label">Balance</div>
            <div class="flex justify-between mt-3" style="font-size:0.85rem;color:#065f46">
              <span>⬆️ Earned: ${creditInfo.earned}</span>
              <span>⬇️ Owed: ${creditInfo.owed}</span>
            </div>
            ${creditInfo.pendingEarned > 0 || creditInfo.pendingOwed > 0 ? `<div class="mt-2 text-xs" style="color:#059669">⏳ Pending: ${creditInfo.pendingEarned} earned / ${creditInfo.pendingOwed} owed</div>` : ''}
          </div>
          <div class="card mb-4">
            <div class="card-body">
              <h4 class="mb-4">⭐ Reputation</h4>
              <div class="flex justify-between mb-2"><span class="text-muted">Reliability Score:</span><strong>${reliabilityScore}%</strong></div>
              <div class="flex justify-between mb-2"><span class="text-muted">Completed Jobs:</span><strong>${completedJobs}</strong></div>
              <div class="flex justify-between mb-2"><span class="text-muted">Arma Parma Exchanges:</span><strong>${completedExchanges}</strong></div>
              <div class="flex justify-between"><span class="text-muted">Response Rate:</span><strong>${reviews.length > 0 ? '95%' : 'N/A'}</strong></div>
            </div>
          </div>
          <div class="card mb-4">
            <div class="card-body">
              <h4 class="mb-4">Wage Expectation</h4>
              <div class="flex justify-between mb-2"><span class="text-muted">Daily:</span><strong>${Utils.formatCurrency(worker.expectedWage?.daily || 0)}</strong></div>
              <div class="flex justify-between"><span class="text-muted">Monthly:</span><strong>${Utils.formatCurrency(worker.expectedWage?.monthly || 0)}</strong></div>
            </div>
          </div>
          <div class="card mb-4">
            <div class="card-body">
              <h4 class="mb-4">Languages</h4>
              <div class="flex flex-wrap gap-2">
                ${(worker.languages || ['Nepali']).map(l => `<span class="badge badge-secondary">${l}</span>`).join('')}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-body text-center">
              <h4 class="mb-2">Member Since</h4>
              <p class="text-muted text-sm">${Utils.formatDate(worker.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderFarmerProfile(farmer) {
    if (!farmer || farmer.role !== 'farmer') return '<div class="empty-state"><h3>Farmer not found</h3></div>';
    const jobs = DB.getJobsByFarmer(farmer.id);
    const rating = DB.getAvgRating(farmer.id);
    const reviews = DB.getReviews(farmer.id);
    const creditInfo = DB.getLaborCreditsByUser(farmer.id);
    const exchanges = DB.getExchangesByUser(farmer.id);
    const completedExchanges = exchanges.filter(e => e.status === 'completed').length;
    const armaReqs = DB.getArmaParmaRequests().filter(r => r.farmerId === farmer.id);
    const userRoles = DB.getUserRoles(farmer.id);
    return `
      <div class="profile-header">
        <div class="profile-cover" style="background:linear-gradient(135deg, #92400e 0%, #78350f 50%, #451a03 100%)">
          <div class="profile-cover-overlay"></div>
        </div>
        <div class="profile-info">
          <div class="profile-avatar-wrapper">
            ${Utils.avatarHTML(Utils.getUserPhoto(farmer), farmer.name, 'xxl')}
            ${farmer.verified ? '<div class="profile-verification">✅</div>' : ''}
          </div>
          <div class="profile-header-content">
            <div>
              <h1 class="profile-name">${farmer.farmName || farmer.name}</h1>
              <div class="flex flex-wrap gap-2 mt-1">
                ${userRoles.map(r => { const role = AUTH_ROLES.find(ar => ar.id === r); return role ? `<span class="badge badge-primary" style="font-size:0.75rem">${role.icon} ${role.nameNe}</span>` : ''; }).join('')}
              </div>
              <p class="profile-tagline">${Utils.escapeHtml(farmer.description || 'Farmer')}</p>
              <div class="profile-meta">
                <span>📍 ${farmer.district || 'Nepal'}</span>
                <span>🌾 ${(farmer.crops || []).join(', ')}</span>
                <span>📐 ${farmer.farmSize || 'Not specified'}</span>
                ${farmer.verified ? '<span class="badge badge-success">✅ Verified</span>' : ''}
              </div>
            </div>
            <div class="profile-actions">
              ${Auth.isWorker() ? `<a href="chat.html?user=${farmer.id}" class="btn btn-primary">💬 Message</a>` : ''}
            </div>
          </div>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="number">${jobs.length}</div><div class="label">Jobs Posted</div></div>
          <div class="profile-stat"><div class="number">${jobs.filter(j => j.status === 'filled').length}</div><div class="label">Filled</div></div>
          <div class="profile-stat"><div class="number">${rating > 0 ? rating : '-'}</div><div class="label">Rating</div></div>
          <div class="profile-stat"><div class="number">${reviews.length}</div><div class="label">Reviews</div></div>
          <div class="profile-stat"><div class="number">${completedExchanges}</div><div class="label">Arma Parma</div></div>
        </div>
      </div>
      <div class="grid grid-sidebar" style="grid-template-columns:2fr 1fr;gap:24px">
        <div>
          <div class="card mb-4">
            <div class="card-header"><h3>About</h3></div>
            <div class="card-body"><p>${Utils.escapeHtml(farmer.description || 'No description available.')}</p></div>
          </div>
          <div class="card mb-4">
            <div class="card-header"><h3>Active Jobs</h3></div>
            <div class="card-body">
              ${jobs.filter(j => j.status === 'active').length ? jobs.filter(j => j.status === 'active').map(j => `
                <div class="flex items-center gap-3 p-3" style="border-bottom:1px solid var(--border-light)">
                  <div class="flex-1"><div class="font-semibold"><a href="job-detail.html?id=${j.id}">${Utils.escapeHtml(j.title)}</a></div>
                  <div class="text-sm text-muted">📍 ${j.district} | 👥 ${j.workersNeeded} workers | 💰 NPR ${j.wage?.daily || 0}/day</div></div>
                </div>
              `).join('') : '<p class="text-muted">No active jobs</p>'}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Reviews (${reviews.length})</h3></div>
            <div class="card-body">
              ${reviews.length ? reviews.map(r => {
                const reviewer = DB.getUserById(r.reviewerId);
                return `<div class="review-card">
                  <div class="review-card-header">
                    ${Utils.avatarHTML(Utils.getUserPhoto(reviewer), reviewer?.name || 'User', 'md')}
                    <div><div class="review-card-author">${reviewer?.name || 'Anonymous'}</div><div class="review-card-date">${Utils.formatDate(r.createdAt)}</div></div>
                    <div style="margin-left:auto">${Utils.ratingHTML(r.rating)}</div>
                  </div>
                  <div class="review-card-text">${Utils.escapeHtml(r.text)}</div>
                </div>`;
              }).join('') : '<p class="text-muted text-center py-4">No reviews yet</p>'}
            </div>
          </div>
        </div>
        <div>
          <div class="labor-credit-card mb-4">
            <h4 class="mb-3" style="color:#065f46">🤝 Labor Credits</h4>
            <div class="credit-balance">${creditInfo.balance >= 0 ? '+' : ''}${creditInfo.balance}</div>
            <div class="credit-label">Balance</div>
            <div class="flex justify-between mt-3" style="font-size:0.85rem;color:#065f46">
              <span>⬆️ Earned: ${creditInfo.earned}</span>
              <span>⬇️ Owed: ${creditInfo.owed}</span>
            </div>
          </div>
          <div class="card mb-4">
            <div class="card-body">
              <h4 class="mb-4">⭐ Reputation</h4>
              <div class="flex justify-between mb-2"><span class="text-muted">Reliability Score:</span><strong>${reviews.length > 0 ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100) : 0}%</strong></div>
              <div class="flex justify-between mb-2"><span class="text-muted">Jobs Posted:</span><strong>${jobs.length}</strong></div>
              <div class="flex justify-between mb-2"><span class="text-muted">Arma Parma Posted:</span><strong>${armaReqs.length}</strong></div>
              <div class="flex justify-between"><span class="text-muted">Completed Exchanges:</span><strong>${completedExchanges}</strong></div>
            </div>
          </div>
          <div class="card mb-4">
            <div class="card-body">
              <h4 class="mb-4">Farm Details</h4>
              <div class="flex flex-col gap-3">
                <div class="flex justify-between"><span class="text-muted">Farm Name:</span><strong>${farmer.farmName || 'N/A'}</strong></div>
                <div class="flex justify-between"><span class="text-muted">Farm Size:</span><strong>${farmer.farmSize || 'N/A'}</strong></div>
                <div class="flex justify-between"><span class="text-muted">Crops:</span><strong>${(farmer.crops || []).join(', ') || 'N/A'}</strong></div>
                <div class="flex justify-between"><span class="text-muted">Location:</span><strong>${farmer.district || 'N/A'}</strong></div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-body text-center">
              <h4 class="mb-2">Member Since</h4>
              <p class="text-muted text-sm">${Utils.formatDate(farmer.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
