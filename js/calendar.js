const CalendarView = {
  currentDate: new Date(),
  currentFilter: 'all',
  currentView: 'month',

  init() {
    App.init();
    this.render();
    this.renderSidebar();
    if (typeof Weather !== 'undefined') {
      Weather.renderWidget('calendarWeather', Auth.currentUser?.district || 'Kathmandu');
    }
  },

  setView(view, el) {
    this.currentView = view;
    document.querySelectorAll('.calendar-view-btn').forEach(b => { b.classList.remove('active'); b.classList.add('btn-ghost'); });
    el.classList.add('active'); el.classList.remove('btn-ghost');
    this.render();
  },

  prev() {
    if (this.currentView === 'month') this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    else if (this.currentView === 'week') this.currentDate.setDate(this.currentDate.getDate() - 7);
    else this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.render(); this.renderSidebar();
  },

  next() {
    if (this.currentView === 'month') this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    else if (this.currentView === 'week') this.currentDate.setDate(this.currentDate.getDate() + 7);
    else this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.render(); this.renderSidebar();
  },

  goToday() { this.currentDate = new Date(); this.render(); this.renderSidebar(); },

  render() {
    if (this.currentView === 'month') this._renderMonth();
    else if (this.currentView === 'week') this._renderWeek();
    else this._renderDay();
  },

  _renderMonth() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const events = this.getEventsForMonth(year, month);
    let html = '<div class="calendar-header-row">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { html += `<div class="calendar-day-header">${d}</div>`; });
    html += '</div><div class="calendar-body">';
    for (let i = 0; i < firstDay; i++) html += '<div class="calendar-cell empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const dayEvents = events.filter(e => new Date(e.date).getDate() === day);
      html += `<div class="calendar-cell${isToday ? ' today' : ''}" onclick="CalendarView.showDayDetail(${year},${month},${day})">
        <div class="calendar-day-num">${day}</div>
        <div class="calendar-events">
          ${dayEvents.slice(0, 3).map(e => {
            const c = e.type === 'paid' ? 'calendar-event-paid' : e.type === 'arma' ? 'calendar-event-arma' : e.type === 'personal' ? 'calendar-event-personal' : e.type === 'marketplace' ? 'calendar-event-marketplace' : e.type === 'equipment' ? 'calendar-event-equipment' : 'calendar-event-season';
            return `<div class="calendar-event ${c}" title="${Utils.escapeHtml(e.title)}">${e.title.substring(0, 12)}${e.title.length > 12 ? '...' : ''}</div>`;
          }).join('')}
          ${dayEvents.length > 3 ? `<div class="calendar-more">+${dayEvents.length - 3} more</div>` : ''}
        </div>
      </div>`;
    }
    const remainingCells = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) html += '<div class="calendar-cell empty"></div>';
    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
  },

  _renderWeek() {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calendarMonthYear').textContent = `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} – ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
    const events = this._getEventsForRange(startOfWeek, endOfWeek);
    const today = new Date();
    let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      const dayEvents = events.filter(e => new Date(e.date).toDateString() === d.toDateString());
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      html += `<div style="background:var(--surface);min-height:100px;padding:8px;${isToday ? 'background:var(--primary-50)' : ''}">
        <div style="font-size:0.75rem;font-weight:600;color:${isToday ? 'var(--primary)' : 'var(--text-secondary)'};margin-bottom:4px">${dayNames[i]} ${d.getDate()}</div>
        ${dayEvents.map(e => {
          const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : e.type === 'personal' ? '📝' : e.type === 'season' ? '🌱' : '📋';
          const bg = e.type === 'paid' ? '#dbeafe' : e.type === 'arma' ? '#dcfce7' : e.type === 'personal' ? '#ede9fe' : '#fef3c7';
          return `<div style="font-size:0.72rem;padding:3px 6px;border-radius:4px;margin-bottom:2px;background:${bg};cursor:pointer" onclick="${e.jobId ? `window.location.href='job-detail.html?id=${e.jobId}'` : ''}">${icon} ${Utils.escapeHtml(e.title.substring(0, 20))}</div>`;
        }).join('')}
      </div>`;
    }
    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
  },

  _renderDay() {
    const d = this.currentDate;
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calendarMonthYear').textContent = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999);
    const events = this._getEventsForRange(dayStart, dayEnd);
    let html = '<div style="position:relative">';
    for (let h = 6; h < 22; h++) {
      const hourEvents = events.filter(e => { const ed = new Date(e.date); return ed.getHours() === h; });
      html += `<div style="display:grid;grid-template-columns:60px 1fr;gap:8px;min-height:48px;border-bottom:1px solid var(--border-light);padding:4px 0">
        <div style="font-size:0.75rem;color:var(--text-tertiary);text-align:right;padding-top:2px">${String(h).padStart(2,'0')}:00</div>
        <div>${hourEvents.map(e => {
          const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : e.type === 'personal' ? '📝' : '📋';
          const bg = e.type === 'paid' ? '#dbeafe' : e.type === 'arma' ? '#dcfce7' : e.type === 'personal' ? '#ede9fe' : '#fef3c7';
          return `<div style="font-size:0.8rem;padding:6px 10px;border-radius:var(--radius);background:${bg};margin-bottom:4px;cursor:pointer" onclick="${e.jobId ? `window.location.href='job-detail.html?id=${e.jobId}'` : ''}">${icon} <strong>${Utils.escapeHtml(e.title)}</strong>${e.location ? ` · 📍 ${e.location}` : ''}</div>`;
        }).join('')}</div>
      </div>`;
    }
    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
  },

  _getEventsForRange(start, end) {
    const all = this.getEventsForMonth(start.getFullYear(), start.getMonth());
    const all2 = start.getMonth() !== end.getMonth() ? this.getEventsForMonth(end.getFullYear(), end.getMonth()) : [];
    return [...all, ...all2].filter(e => { const d = new Date(e.date); return d >= start && d <= end; });
  },

  renderSidebar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const events = this.getEventsForMonth(year, month);
    const filtered = this.currentFilter === 'all' ? events : events.filter(e => e.type === this.currentFilter);
    const user = Auth.currentUser;
    const availability = user ? DB.getAvailabilityInfo(user.id) : null;
    const el = document.getElementById('monthEvents');
    if (el && availability) {
      const badge = typeof Weather !== 'undefined' ? Weather.getAvailabilityBadge(availability.status) : null;
      if (badge) el.innerHTML = `<div class="availability-status-bar" style="display:flex;align-items:center;gap:8px;padding:10px 14px;margin-bottom:12px;background:${badge.bg};border-radius:var(--radius);font-size:0.85rem"><span style="font-size:1.1rem">${badge.icon}</span><span style="font-weight:600;color:${badge.color}">${badge.text}</span></div>`;
    }
    if (el) {
      if (filtered.length === 0) {
        el.innerHTML = '<p class="text-muted text-center py-4">No events this month</p>';
      } else {
        el.innerHTML = filtered.sort((a, b) => new Date(a.date) - new Date(b.date)).map(e => {
          const d = new Date(e.date);
          const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : e.type === 'personal' ? '📝' : '🌱';
          const link = e.jobId ? `job-detail.html?id=${e.jobId}` : '#';
          return `<a href="${link}" class="flex items-center gap-3 p-2 mb-2" style="border-radius:var(--radius);border:1px solid var(--border-light);text-decoration:none;color:inherit">
            <div style="min-width:48px;text-align:center;padding:4px 8px;border-radius:var(--radius);background:var(--bg-alt);font-size:0.8rem">
              <div style="font-weight:700;font-size:1.1rem;color:var(--primary)">${d.getDate()}</div>
              <div class="text-xs">${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}</div>
            </div>
            <div class="flex-1"><div class="font-semibold text-sm">${icon} ${Utils.escapeHtml(e.title)}</div><div class="text-xs text-muted">${e.location || ''}</div></div>
          </a>`;
        }).join('');
      }
    }
    const seasons = this.getSeasons(year, month);
    const sg = document.getElementById('seasonGuide');
    if (sg) sg.innerHTML = seasons.map(s => `
      <div class="flex items-center gap-3 p-2 mb-2" style="border-radius:var(--radius);background:${s.bgColor}">
        <div style="font-size:1.5rem">${s.icon}</div>
        <div><div class="font-semibold text-sm" style="color:${s.textColor}">${s.name}</div><div class="text-xs" style="color:${s.textColor};opacity:0.8">${s.crops}</div></div>
      </div>
    `).join('');
    const stats = { paid: events.filter(e => e.type === 'paid').length, arma: events.filter(e => e.type === 'arma').length, season: events.filter(e => e.type === 'season').length, personal: events.filter(e => e.type === 'personal').length };
    const summary = document.getElementById('calendarSummary');
    if (summary) summary.innerHTML = `
      <div class="flex justify-between mb-2"><span class="text-muted">💰 Paid Jobs:</span><strong>${stats.paid}</strong></div>
      <div class="flex justify-between mb-2"><span class="text-muted">🤝 Arma Parma:</span><strong>${stats.arma}</strong></div>
      <div class="flex justify-between mb-2"><span class="text-muted">🌱 Season Events:</span><strong>${stats.season}</strong></div>
      <div class="flex justify-between mb-2"><span class="text-muted">📝 Personal:</span><strong>${stats.personal}</strong></div>
    `;
    this._renderUpcomingJobs();
  },

  _renderUpcomingJobs() {
    const el = document.getElementById('upcomingJobsList');
    if (!el) return;
    const user = Auth.currentUser;
    const jobs = DB.getJobs().filter(j => j.status === 'active' && j.startDate).filter(j => {
      if (!user) return true;
      return j.farmerId === user.id || j.workerId === user.id || DB.getApplicationsByWorker(user.id).some(a => a.jobId === j.id);
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).filter(j => new Date(j.startDate) >= new Date()).slice(0, 5);
    if (!jobs.length) { el.innerHTML = '<p class="text-muted text-center py-3" style="font-size:0.85rem">No upcoming jobs</p>'; return; }
    el.innerHTML = jobs.map(j => `<a href="job-detail.html?id=${j.id}" class="flex items-center gap-3 p-2 mb-2" style="border-radius:var(--radius);border:1px solid var(--border-light);text-decoration:none;color:inherit;font-size:0.85rem">
      <div style="font-size:1.2rem">${j.workMode === 'arma-parma' ? '🤝' : '💰'}</div>
      <div class="flex-1"><div class="font-semibold">${Utils.escapeHtml(j.title.substring(0, 25))}</div><div class="text-xs text-muted">📍 ${j.district || ''} · ${Utils.formatDateShort(j.startDate)}</div></div>
    </a>`).join('');
  },

  getEventsForMonth(year, month) {
    const events = [];
    const user = Auth.currentUser;
    DB.getJobs().forEach(j => {
      if (user && j.farmerId !== user.id && j.workerId !== user.id) return;
      const apps = DB.getApplicationsByJob(j.id);
      const isParticipant = user && (j.farmerId === user.id || j.workerId === user.id || apps.some(a => a.workerId === user.id));
      if (!isParticipant && user) return;
      if (j.startDate) { const d = new Date(j.startDate); if (d.getFullYear() === year && d.getMonth() === month) events.push({ date: j.startDate, title: j.title, type: j.workMode === 'arma-parma' ? 'arma' : 'paid', jobId: j.id, location: j.district }); }
      if (j.endDate) { const d = new Date(j.endDate); if (d.getFullYear() === year && d.getMonth() === month) events.push({ date: j.endDate, title: j.title + ' (End)', type: j.workMode === 'arma-parma' ? 'arma' : 'paid', jobId: j.id, location: j.district }); }
    });
    DB.getArmaParmaRequests().forEach(r => {
      if (user && r.farmerId !== user.id && !r.applicants?.includes(user.id)) return;
      if (r.startDate) { const d = new Date(r.startDate); if (d.getFullYear() === year && d.getMonth() === month) events.push({ date: r.startDate, title: r.title, type: 'arma', jobId: r.id, location: r.district }); }
    });
    this.getSeasons(year, month).forEach(s => s.events.forEach(e => events.push({ date: e.date, title: e.title, type: 'season' })));
    if (user) {
      DB.getPreHarvestBookings().filter(b => b.sellerId === user.id || b.bookings?.some(bk => bk.buyerId === user.id)).forEach(b => {
        if (b.harvestDate) { const d = new Date(b.harvestDate); if (d.getFullYear() === year && d.getMonth() === month) events.push({ date: b.harvestDate, title: '🌾 ' + b.crop + ' Harvest', type: 'marketplace', location: b.district }); }
      });
      DB.getEquipmentRentals().filter(e => e.ownerId === user.id).forEach(eq => {
        if (eq.startDate) { const d = new Date(eq.startDate); if (d.getFullYear() === year && d.getMonth() === month) events.push({ date: eq.startDate, title: '🚜 ' + eq.name, type: 'equipment', location: eq.district }); }
      });
      DB.getCalendarEventsByUser(user.id).forEach(ce => {
        if (ce.date) { const d = new Date(ce.date); if (d.getFullYear() === year && d.getMonth() === month) events.push({ date: ce.date, title: ce.title, type: 'personal', location: ce.location || '', eventId: ce.id }); }
      });
    }
    return events;
  },

  getSeasons(year, month) {
    const allSeasons = [
      { name: 'Rice Planting', icon: '🌾', crops: 'Rice, Paddy', bgColor: '#ecfdf5', textColor: '#065f46', months: [5, 6], events: [{ date: `${year}-06-01`, title: 'Rice Planting Season Starts' }, { date: `${year}-06-15`, title: 'Transplanting Period' }] },
      { name: 'Rice Harvest', icon: '🌾', crops: 'Rice Harvest', bgColor: '#fef3c7', textColor: '#92400e', months: [9, 10], events: [{ date: `${year}-10-01`, title: 'Rice Harvest Season' }] },
      { name: 'Tea Plucking', icon: '🍃', crops: 'Tea Leaves', bgColor: '#f0fdf4', textColor: '#166534', months: [2, 3, 4, 5, 6, 7, 8, 9], events: [{ date: `${year}-${String(month + 1).padStart(2, '0')}-01`, title: 'Tea Plucking Active' }] },
      { name: 'Maize Planting', icon: '🌽', crops: 'Maize, Corn', bgColor: '#fff7ed', textColor: '#9a3412', months: [3, 4], events: [{ date: `${year}-04-15`, title: 'Maize Planting Season' }] },
      { name: 'Wheat Harvest', icon: '🌾', crops: 'Wheat', bgColor: '#fefce8', textColor: '#854d0e', months: [3, 4], events: [{ date: `${year}-04-01`, title: 'Wheat Harvest Season' }] },
      { name: 'Potato Harvest', icon: '🥔', crops: 'Potato', bgColor: '#faf5ff', textColor: '#6b21a8', months: [10, 11], events: [{ date: `${year}-11-01`, title: 'Potato Harvest Season' }] }
    ];
    return allSeasons.filter(s => s.months.includes(month));
  },

  toggleType(type, el) {
    this.currentFilter = type;
    document.querySelectorAll('.calendar-filter').forEach(f => { f.classList.remove('active'); f.style.outline = 'none'; });
    el.classList.add('active'); el.style.outline = '2px solid var(--primary)';
    this.renderSidebar();
  },

  showDayDetail(year, month, day) {
    const events = this.getEventsForMonth(year, month).filter(e => new Date(e.date).getDate() === day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    let html = `<div class="mb-4"><h3>📅 ${dayNames[new Date(year, month, day).getDay()]}, ${monthNames[month]} ${day}, ${year}</h3></div>`;
    if (events.length) events.forEach(e => {
      const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : e.type === 'personal' ? '📝' : '🌱';
      const link = e.jobId ? `job-detail.html?id=${e.jobId}` : '#';
      html += `<a href="${link}" class="card mb-3" style="text-decoration:none;color:inherit;cursor:${e.jobId ? 'pointer' : 'default'}">
        <div class="card-body flex items-center gap-3"><div style="font-size:1.5rem">${icon}</div><div><div class="font-semibold">${Utils.escapeHtml(e.title)}</div><div class="text-sm text-muted">${e.location || ''}</div></div></div>
      </a>`;
    });
    html += `<div class="mt-3"><button class="btn btn-primary btn-sm" onclick="CalendarView.showAddEvent('${dateStr}')">+ Add Event on This Day</button></div>`;
    Utils.modal('Events on this day', html);
  },

  showAddEvent(prefillDate) {
    const user = Auth.currentUser;
    if (!user) { Utils.toast('Please log in to add events', 'warning'); return; }
    const today = prefillDate || this.currentDate.toISOString().split('T')[0];
    const html = `
      <div class="form-group"><label class="form-label">Event Title *</label><input type="text" class="form-input" id="calEventTitle" placeholder="e.g., Team meeting, Farm visit"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date *</label><input type="date" class="form-input" id="calEventDate" value="${today}"></div>
        <div class="form-group"><label class="form-label">Time</label><input type="time" class="form-input" id="calEventTime" value="09:00"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="calEventType"><option value="personal">📝 Personal</option><option value="reminder">⏰ Reminder</option><option value="meeting">🤝 Meeting</option></select></div>
        <div class="form-group"><label class="form-label">Location</label><input type="text" class="form-input" id="calEventLocation" placeholder="Optional"></div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="calEventNotes" rows="2" placeholder="Optional notes"></textarea></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-ghost" onclick="document.querySelector('.modal-backdrop.active')?.classList.remove('active')">Cancel</button><button class="btn btn-primary" onclick="CalendarView.saveEvent()">Save Event</button></div>
    `;
    Utils.modal('Add Calendar Event', html);
  },

  saveEvent() {
    const user = Auth.currentUser;
    const title = document.getElementById('calEventTitle')?.value?.trim();
    const date = document.getElementById('calEventDate')?.value;
    const time = document.getElementById('calEventTime')?.value;
    const type = document.getElementById('calEventType')?.value;
    const location = document.getElementById('calEventLocation')?.value?.trim();
    const notes = document.getElementById('calEventNotes')?.value?.trim();
    if (!title || !date) { Utils.toast('Please fill in title and date', 'error'); return; }
    DB.addCalendarEvent({ userId: user.id, title, date, time: time || '09:00', type: type || 'personal', location: location || '', notes: notes || '' });
    document.querySelector('.modal-backdrop.active')?.classList.remove('active');
    Utils.toast('Event added to calendar!', 'success');
    this.render(); this.renderSidebar();
  }
};

document.addEventListener('DOMContentLoaded', () => CalendarView.init());
