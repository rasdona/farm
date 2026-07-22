const CalendarView = {
  currentDate: new Date(),
  currentFilter: 'all',

  init() {
    App.init();
    this.render();
    this.renderSidebar();
  },

  render() {
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
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      html += `<div class="calendar-day-header">${d}</div>`;
    });
    html += '</div><div class="calendar-body">';

    for (let i = 0; i < firstDay; i++) {
      html += '<div class="calendar-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const dayEvents = events.filter(e => {
        const d = new Date(e.date);
        return d.getDate() === day;
      });

      html += `<div class="calendar-cell${isToday ? ' today' : ''}" onclick="CalendarView.showDayDetail(${year},${month},${day})">
        <div class="calendar-day-num">${day}</div>
        <div class="calendar-events">
          ${dayEvents.slice(0, 3).map(e => {
            const colorClass = e.type === 'paid' ? 'calendar-event-paid' : e.type === 'arma' ? 'calendar-event-arma' : 'calendar-event-season';
            return `<div class="calendar-event ${colorClass}" title="${Utils.escapeHtml(e.title)}">${e.title.substring(0, 12)}${e.title.length > 12 ? '...' : ''}</div>`;
          }).join('')}
          ${dayEvents.length > 3 ? `<div class="calendar-more">+${dayEvents.length - 3} more</div>` : ''}
        </div>
      </div>`;
    }

    const remainingCells = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      html += '<div class="calendar-cell empty"></div>';
    }

    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
  },

  renderSidebar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const events = this.getEventsForMonth(year, month);
    const filtered = this.currentFilter === 'all' ? events : events.filter(e => e.type === this.currentFilter);

    const el = document.getElementById('monthEvents');
    if (filtered.length === 0) {
      el.innerHTML = '<p class="text-muted text-center py-4">No events this month</p>';
    } else {
      el.innerHTML = filtered.sort((a, b) => new Date(a.date) - new Date(b.date)).map(e => {
        const d = new Date(e.date);
        const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : '🌱';
        const link = e.jobId ? `job-detail.html?id=${e.jobId}` : '#';
        return `<a href="${link}" class="flex items-center gap-3 p-2 mb-2" style="border-radius:var(--radius);border:1px solid var(--border-light);text-decoration:none;color:inherit">
          <div style="min-width:48px;text-align:center;padding:4px 8px;border-radius:var(--radius);background:var(--bg-alt);font-size:0.8rem">
            <div style="font-weight:700;font-size:1.1rem;color:var(--primary)">${d.getDate()}</div>
            <div class="text-xs">${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}</div>
          </div>
          <div class="flex-1">
            <div class="font-semibold text-sm">${icon} ${Utils.escapeHtml(e.title)}</div>
            <div class="text-xs text-muted">${e.location || ''}</div>
          </div>
        </a>`;
      }).join('');
    }

    const seasons = this.getSeasons(year, month);
    const sg = document.getElementById('seasonGuide');
    sg.innerHTML = seasons.map(s => `
      <div class="flex items-center gap-3 p-2 mb-2" style="border-radius:var(--radius);background:${s.bgColor}">
        <div style="font-size:1.5rem">${s.icon}</div>
        <div>
          <div class="font-semibold text-sm" style="color:${s.textColor}">${s.name}</div>
          <div class="text-xs" style="color:${s.textColor};opacity:0.8">${s.crops}</div>
        </div>
      </div>
    `).join('');

    const stats = {
      paid: events.filter(e => e.type === 'paid').length,
      arma: events.filter(e => e.type === 'arma').length,
      season: events.filter(e => e.type === 'season').length
    };
    document.getElementById('calendarSummary').innerHTML = `
      <div class="flex justify-between mb-2"><span class="text-muted">💰 Paid Jobs:</span><strong>${stats.paid}</strong></div>
      <div class="flex justify-between mb-2"><span class="text-muted">🤝 Arma Parma:</span><strong>${stats.arma}</strong></div>
      <div class="flex justify-between"><span class="text-muted">🌱 Season Events:</span><strong>${stats.season}</strong></div>
    `;
  },

  getEventsForMonth(year, month) {
    const events = [];
    const user = Auth.currentUser;

    DB.getJobs().forEach(j => {
      if (user && j.farmerId !== user.id && j.workerId !== user.id) return;
      if (j.startDate) {
        const d = new Date(j.startDate);
        if (d.getFullYear() === year && d.getMonth() === month) {
          events.push({ date: j.startDate, title: j.title, type: j.workMode === 'arma-parma' ? 'arma' : 'paid', jobId: j.id, location: j.district });
        }
      }
      if (j.endDate) {
        const d = new Date(j.endDate);
        if (d.getFullYear() === year && d.getMonth() === month) {
          events.push({ date: j.endDate, title: j.title + ' (End)', type: j.workMode === 'arma-parma' ? 'arma' : 'paid', jobId: j.id, location: j.district });
        }
      }
    });

    DB.getArmaParmaRequests().forEach(r => {
      if (user && r.farmerId !== user.id && !r.applicants?.includes(user.id)) return;
      if (r.startDate) {
        const d = new Date(r.startDate);
        if (d.getFullYear() === year && d.getMonth() === month) {
          events.push({ date: r.startDate, title: r.title, type: 'arma', jobId: r.id, location: r.district });
        }
      }
    });

    const monthSeasons = this.getSeasons(year, month);
    monthSeasons.forEach(s => {
      s.events.forEach(e => {
        events.push({ date: e.date, title: e.title, type: 'season' });
      });
    });

    return events;
  },

  getSeasons(year, month) {
    const allSeasons = [
      { name: 'Rice Planting', icon: '🌾', crops: 'Rice, Paddy', bgColor: '#ecfdf5', textColor: '#065f46',
        months: [5, 6], events: [{ date: `${year}-06-01`, title: 'Rice Planting Season Starts' }, { date: `${year}-06-15`, title: 'Transplanting Period' }] },
      { name: 'Rice Harvest', icon: '🌾', crops: 'Rice Harvest', bgColor: '#fef3c7', textColor: '#92400e',
        months: [9, 10], events: [{ date: `${year}-10-01`, title: 'Rice Harvest Season' }] },
      { name: 'Tea Plucking', icon: '🍃', crops: 'Tea Leaves', bgColor: '#f0fdf4', textColor: '#166534',
        months: [2, 3, 4, 5, 6, 7, 8, 9], events: [{ date: `${year}-${String(month + 1).padStart(2, '0')}-01`, title: 'Tea Plucking Active' }] },
      { name: 'Maize Planting', icon: '🌽', crops: 'Maize, Corn', bgColor: '#fff7ed', textColor: '#9a3412',
        months: [3, 4], events: [{ date: `${year}-04-15`, title: 'Maize Planting Season' }] },
      { name: 'Wheat Harvest', icon: '🌾', crops: 'Wheat', bgColor: '#fefce8', textColor: '#854d0e',
        months: [3, 4], events: [{ date: `${year}-04-01`, title: 'Wheat Harvest Season' }] },
      { name: 'Potato Harvest', icon: '🥔', crops: 'Potato', bgColor: '#faf5ff', textColor: '#6b21a8',
        months: [10, 11], events: [{ date: `${year}-11-01`, title: 'Potato Harvest Season' }] }
    ];
    return allSeasons.filter(s => s.months.includes(month));
  },

  getSeasonsForDate(date) {
    const month = date.getMonth();
    return this.getSeasons(date.getFullYear(), month);
  },

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.render();
    this.renderSidebar();
  },

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.render();
    this.renderSidebar();
  },

  goToday() {
    this.currentDate = new Date();
    this.render();
    this.renderSidebar();
  },

  toggleType(type, el) {
    this.currentFilter = type;
    document.querySelectorAll('.calendar-filter').forEach(f => {
      f.classList.remove('active');
      f.style.outline = 'none';
    });
    el.classList.add('active');
    el.style.outline = '2px solid var(--primary)';
    this.renderSidebar();
  },

  showDayDetail(year, month, day) {
    const events = this.getEventsForMonth(year, month).filter(e => {
      return new Date(e.date).getDate() === day;
    });
    if (events.length === 0) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let html = `<div class="mb-4"><h3>📅 ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(year, month, day).getDay()]}, ${['January','February','March','April','May','June','July','August','September','October','November','December'][month]} ${day}, ${year}</h3></div>`;
    events.forEach(e => {
      const icon = e.type === 'paid' ? '💰' : e.type === 'arma' ? '🤝' : '🌱';
      const link = e.jobId ? `job-detail.html?id=${e.jobId}` : '#';
      html += `<a href="${link}" class="card mb-3" style="text-decoration:none;color:inherit;cursor:${e.jobId ? 'pointer' : 'default'}">
        <div class="card-body flex items-center gap-3">
          <div style="font-size:1.5rem">${icon}</div>
          <div><div class="font-semibold">${Utils.escapeHtml(e.title)}</div><div class="text-sm text-muted">${e.location || ''}</div></div>
        </div>
      </a>`;
    });
    Utils.modal('Events on this day', html);
  }
};

document.addEventListener('DOMContentLoaded', () => CalendarView.init());