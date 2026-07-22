const Jobs = {
  searchJobs(filters = {}) {
    let jobs = DB.getJobs().filter(j => j.status !== 'expired');
    if (filters.q) {
      const q = filters.q.toLowerCase();
      jobs = jobs.filter(j => j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || j.cropType?.toLowerCase().includes(q) || j.requiredSkills?.some(s => s.toLowerCase().includes(q)));
    }
    if (filters.district) jobs = jobs.filter(j => j.district === filters.district);
    if (filters.cropType) jobs = jobs.filter(j => j.cropType === filters.cropType);
    if (filters.skill) jobs = jobs.filter(j => j.requiredSkills?.includes(filters.skill));
    if (filters.wageMin) jobs = jobs.filter(j => (j.wage?.daily || 0) >= parseInt(filters.wageMin));
    if (filters.wageMax) jobs = jobs.filter(j => (j.wage?.daily || 0) <= parseInt(filters.wageMax));
    if (filters.status) jobs = jobs.filter(j => j.status === filters.status);
    if (filters.urgent) jobs = jobs.filter(j => j.urgent);
    if (filters.foodProvided) jobs = jobs.filter(j => j.foodProvided);
    if (filters.accommodation) jobs = jobs.filter(j => j.accommodationProvided);
    if (filters.sort === 'wage-high') jobs.sort((a, b) => (b.wage?.daily || 0) - (a.wage?.daily || 0));
    else if (filters.sort === 'wage-low') jobs.sort((a, b) => (a.wage?.daily || 0) - (b.wage?.daily || 0));
    else if (filters.sort === 'oldest') jobs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return jobs;
  },

  renderJobList(containerId, jobs, emptyMsg = 'No jobs found') {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!jobs.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">💼</div><h3>${emptyMsg}</h3><p>Try adjusting your search filters or check back later.</p></div>`;
      return;
    }
    el.innerHTML = jobs.map(j => App.renderJobCard(j)).join('');
  },

  renderJobDetail(job) {
    if (!job) return '<div class="empty-state"><h3>Job not found</h3></div>';
    const farmer = DB.getUserById(job.farmerId);
    const isApplied = Auth.currentUser && DB.getApplications().find(a => a.jobId === job.id && a.workerId === Auth.currentUser.id);
    return `
      <div class="container py-8" style="margin-top:var(--navbar-height)">
        <div class="breadcrumb mb-6">
          <a href="index.html">Home</a><span class="separator">/</span>
          <a href="jobs.html">Jobs</a><span class="separator">/</span>
          <span class="current">${Utils.escapeHtml(job.title)}</span>
        </div>
        <div class="job-status-banner ${job.status}">${job.status === 'active' ? '✅ Active - Accepting Applications' : job.status === 'filled' ? '👥 Position Filled' : job.status === 'urgent' ? '🔥 Urgent Hiring' : '🔒 Closed'}</div>
        <div class="dashboard-grid-sidebar">
          <div>
            <div class="card mb-6">
              <div class="card-body">
                <div class="flex justify-between items-start mb-4">
                  <h1 style="font-size:1.5rem;margin:0">${Utils.escapeHtml(job.title)}</h1>
                  ${job.urgent ? '<span class="badge badge-danger">🔥 Urgent</span>' : ''}
                </div>
                <div class="job-card-meta mb-4">
                  <span>📍 ${job.district}${job.municipality ? ', ' + job.municipality : ''}${job.ward ? ', Ward ' + job.ward : ''}</span>
                  <span>🌾 ${job.cropType || 'General'}</span>
                  <span>👥 ${job.workersNeeded} workers needed</span>
                  <span>📅 ${Utils.formatDate(job.startDate)} - ${Utils.formatDate(job.endDate)}</span>
                </div>
                <h4>Description</h4>
                <p>${Utils.escapeHtml(job.description)}</p>
                <h4 class="mt-6">Required Skills</h4>
                <div class="flex flex-wrap gap-2 mt-2">
                  ${(job.requiredSkills || []).map(s => `<span class="badge badge-primary">${s}</span>`).join('')}
                </div>
                <h4 class="mt-6">Working Details</h4>
                <div class="grid grid-2 gap-4 mt-2">
                  <div><strong>Working Hours:</strong> ${job.workingHours || 'Flexible'}</div>
                  <div><strong>Working Days:</strong> ${job.workingDays || 'Mon-Sat'}</div>
                  <div><strong>Farm Type:</strong> ${job.farmType || 'General'}</div>
                  <div><strong>Applications:</strong> ${job.applications || 0}</div>
                </div>
                ${job.location ? `
                  <h4 class="mt-6">Location</h4>
                  <div class="map-container mt-2" style="background:linear-gradient(135deg,var(--primary-50),var(--bg-alt))">
                    <div style="text-align:center"><span style="font-size:2rem">📍</span><p class="mt-2">${job.district}, Nepal</p></div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          <div>
            <div class="card mb-4">
              <div class="card-body text-center">
                <h3 style="color:var(--primary);margin-bottom:4px">${Utils.formatCurrency(job.wage?.daily || 0)}</h3>
                <p class="text-sm text-muted mb-4">per day</p>
                ${job.wage?.weekly ? `<div class="flex justify-between text-sm mb-2"><span class="text-muted">Weekly:</span><strong>${Utils.formatCurrency(job.wage.weekly)}</strong></div>` : ''}
                ${job.wage?.monthly ? `<div class="flex justify-between text-sm mb-2"><span class="text-muted">Monthly:</span><strong>${Utils.formatCurrency(job.wage.monthly)}</strong></div>` : ''}
                <hr class="divider">
                <div class="flex flex-col gap-2 text-sm">
                  ${job.foodProvided ? '<div class="flex items-center gap-2"><span>✅</span> Food Provided</div>' : '<div class="flex items-center gap-2"><span>❌</span> No Food</div>'}
                  ${job.accommodationProvided ? '<div class="flex items-center gap-2"><span>✅</span> Accommodation Provided</div>' : '<div class="flex items-center gap-2"><span>❌</span> No Accommodation</div>'}
                </div>
                <hr class="divider">
                ${job.status === 'active' && Auth.isWorker() && !isApplied ? `<button class="btn btn-primary btn-block" onclick="Jobs.showApplyModal('${job.id}')">Apply Now</button>` : ''}
                ${isApplied ? `<button class="btn btn-outline btn-block" disabled>Already Applied</button>` : ''}
                ${!Auth.isLoggedIn() ? `<a href="login.html?redirect=job-detail.html?id=${job.id}" class="btn btn-primary btn-block">Login to Apply</a>` : ''}
                <button class="btn btn-outline btn-block mt-2" onclick="Jobs.shareJob('${job.id}')">📤 Share Job</button>
              </div>
            </div>
            ${farmer ? `
              <div class="card">
                <div class="card-body">
                  <h4 class="mb-4">Posted By</h4>
                  <div class="flex items-center gap-3 mb-4">
                    ${Utils.avatarHTML(Utils.getUserPhoto(farmer), farmer.name, 'lg')}
                    <div>
                      <div class="font-semibold">${farmer.name}</div>
                      <div class="text-sm text-muted">${farmer.farmName || 'Farmer'}</div>
                      ${farmer.verified ? '<span class="badge badge-success mt-1">✅ Verified</span>' : ''}
                    </div>
                  </div>
                  <div class="flex justify-between text-sm mb-2"><span class="text-muted">Rating:</span><span>${Utils.ratingHTML(DB.getAvgRating(farmer.id))}</span></div>
                  <div class="flex justify-between text-sm mb-2"><span class="text-muted">Jobs Posted:</span><strong>${DB.getJobsByFarmer(farmer.id).length}</strong></div>
                  <div class="flex justify-between text-sm mb-4"><span class="text-muted">Location:</span><strong>${farmer.district || 'Nepal'}</strong></div>
                  ${Auth.isLoggedIn() && Auth.currentUser.id !== farmer.id ? `<a href="chat.html?user=${farmer.id}" class="btn btn-outline btn-block">💬 Message</a>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  showApplyModal(jobId) {
    if (!Auth.requireProfilePhoto()) return;
    const job = DB.getJobById(jobId);
    if (!job) return;
    const modal = document.getElementById('applyModal');
    if (modal) {
      modal.querySelector('.modal-body').innerHTML = `
        <h4 style="margin-bottom:16px">Apply for: ${Utils.escapeHtml(job.title)}</h4>
        <div class="form-group">
          <label class="form-label">Cover Message <span class="required">*</span></label>
          <textarea class="form-textarea" id="applyMessage" rows="5" placeholder="Tell the farmer why you're a good fit for this job..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Daily Wage (NPR)</label>
          <input type="number" class="form-input" id="applyWage" value="${Auth.currentUser?.expectedWage?.daily || ''}" placeholder="e.g. 800">
        </div>
      `;
      modal.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-ghost" onclick="Utils.hideModal('applyModal')">Cancel</button>
        <button class="btn btn-primary" onclick="Jobs.submitApplication('${jobId}')">Submit Application</button>
      `;
      Utils.showModal('applyModal');
    }
  },

  submitApplication(jobId) {
    const message = document.getElementById('applyMessage')?.value.trim();
    if (!message) { Utils.toast('Please write a cover message.', 'warning'); return; }
    const job = DB.getJobById(jobId);
    if (!job) return;
    DB.addApplication({ jobId, workerId: Auth.currentUser.id, farmerId: job.farmerId, message });
    DB.addNotification({ userId: job.farmerId, type: 'application', text: `${Auth.currentUser.name} applied for ${job.title}`, link: `job-detail.html?id=${jobId}` });
    Utils.hideModal('applyModal');
    Utils.toast('Application submitted successfully!', 'success');
    setTimeout(() => location.reload(), 1000);
  },

  shareJob(jobId) {
    const url = window.location.origin + '/job-detail.html?id=' + jobId;
    if (navigator.share) {
      navigator.share({ title: 'Job on AgriConnect Nepal', url });
    } else {
      Utils.copyToClipboard(url);
    }
  },

  postJob(data) {
    if (!Auth.requireRole('farmer')) return null;
    data.farmerId = Auth.currentUser.id;
    const job = DB.addJob(data);
    DB.addAuditLog({ action: 'job_posted', userId: Auth.currentUser.id, details: `Job posted: ${job.title}` });
    return job;
  },

  getDistrictOptions() {
    let options = '<option value="">All Districts</option>';
    SAMPLE_LOCATIONS.provinces.forEach(p => {
      p.districts.forEach(d => { options += `<option value="${d}">${d}</option>`; });
    });
    return options;
  },

  getCropOptions() {
    return '<option value="">All Crops</option>' + SAMPLE_CATEGORIES.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  }
};
