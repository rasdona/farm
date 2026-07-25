const Notifications = {
  render(containerId, userId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const notifs = DB.getNotifications(userId);
    const user = DB.getUserById(userId);
    const systemNotifs = this._getSystemNotifications(user);
    const allNotifs = [...systemNotifs, ...notifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!allNotifs.length) {
      el.innerHTML = '<div class="empty-state" style="padding:40px"><div class="icon">🔔</div><h3>No notifications</h3><p>You\'re all caught up!</p></div>';
      return;
    }
    el.innerHTML = allNotifs.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" onclick="${n.link ? `window.location.href='${n.link}'` : ''}">
        <div class="icon ${App.getNotifIconClass(n.type)}">${App.getNotifIcon(n.type)}</div>
        <div class="content">
          <div class="text">${n.text}</div>
          <div class="time">${Utils.formatTime(n.createdAt)}</div>
        </div>
      </div>
    `).join('');
  },

  _getSystemNotifications(user) {
    const sys = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (user && typeof Weather !== 'undefined') {
      const district = user.district || 'Kathmandu';
      const weatherData = Weather.getWeather(district);
      if (weatherData && weatherData.wmoCode >= 61 && weatherData.wmoCode <= 67) {
        sys.push({ id: 'SYS-W', type: 'weather', text: `🌧️ Rain alert in ${district}: ${weatherData.condition}. Plan outdoor work accordingly.`, createdAt: today.toISOString(), read: false });
      } else if (weatherData && weatherData.wmoCode >= 71 && weatherData.wmoCode <= 77) {
        sys.push({ id: 'SYS-S', type: 'weather', text: `❄️ Snow alert in ${district}: ${weatherData.condition}. Travel may be affected.`, createdAt: today.toISOString(), read: false });
      } else if (weatherData && weatherData.temperature >= 35) {
        sys.push({ id: 'SYS-H', type: 'weather', text: `🌡️ Heat alert: ${weatherData.temperature}°C in ${district}. Stay hydrated and take breaks.`, createdAt: today.toISOString(), read: false });
      }
    }

    if (user) {
      const calEvents = DB.getCalendarEventsByUser(user.id).filter(e => e.date === todayStr);
      calEvents.forEach(e => {
        sys.push({ id: 'SYS-C-' + e.id, type: 'calendar', text: `📅 Today: ${e.title}${e.time ? ' at ' + e.time : ''}${e.location ? ' — ' + e.location : ''}`, createdAt: today.toISOString(), read: false, link: 'calendar.html' });
      });

      const jobs = DB.getJobs().filter(j => {
        if (j.farmerId !== user.id && j.workerId !== user.id) return false;
        const apps = DB.getApplicationsByJob(j.id);
        if (j.farmerId === user.id && apps.some(a => a.status === 'pending')) {
          sys.push({ id: 'SYS-A-' + j.id, type: 'pending', text: `📥 "${j.title}" has pending applications — review them now.`, createdAt: today.toISOString(), read: false, link: 'job-detail.html?id=' + j.id });
        }
        return false;
      });
    }

    return sys;
  }
};

const Reviews = {
  showReviewModal(reviewedId, jobId) {
    if (!Auth.requireAuth()) return;
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    modal.querySelector('.modal-body').innerHTML = `
      <h4 class="mb-4">Write a Review</h4>
      <div class="form-group">
        <label class="form-label">Rating <span class="required">*</span></label>
        <div class="rating" id="reviewRating" style="font-size:1.8rem;gap:4px">
          ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}" onclick="Reviews.setRating(${i})">★</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Your Review <span class="required">*</span></label>
        <textarea class="form-textarea" id="reviewText" rows="4" placeholder="Share your experience..."></textarea>
      </div>
    `;
    modal.querySelector('.modal-footer').innerHTML = `
      <button class="btn btn-ghost" onclick="Utils.hideModal('reviewModal')">Cancel</button>
      <button class="btn btn-primary" onclick="Reviews.submitReview('${reviewedId}','${jobId}')">Submit Review</button>
    `;
    Utils.showModal('reviewModal');
  },

  selectedRating: 0,

  setRating(r) {
    this.selectedRating = r;
    document.querySelectorAll('#reviewRating .star').forEach(s => {
      s.classList.toggle('filled', parseInt(s.dataset.rating) <= r);
    });
  },

  submitReview(reviewedId, jobId) {
    if (!this.selectedRating) { Utils.toast('Please select a rating', 'warning'); return; }
    const text = document.getElementById('reviewText')?.value.trim();
    if (!text) { Utils.toast('Please write a review', 'warning'); return; }
    DB.addReview({ reviewerId: Auth.currentUser.id, reviewedId, jobId, rating: this.selectedRating, text });
    DB.addNotification({ userId: reviewedId, type: 'review', text: `${Auth.currentUser.name} left you a ${this.selectedRating}-star review`, link: '#' });
    Utils.hideModal('reviewModal');
    Utils.toast('Review submitted!');
    this.selectedRating = 0;
    setTimeout(() => location.reload(), 1000);
  }
};
