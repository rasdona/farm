const Weather = {
  cache: {},
  cacheExpiry: 1800000,

  getWeather(district) {
    const cacheKey = district || 'default';
    const cached = this.cache[cacheKey];
    if (cached && (Date.now() - cached.ts < this.cacheExpiry)) return cached.data;
    const data = DB.getWeather(district);
    this.cache[cacheKey] = { data, ts: Date.now() };
    return data;
  },

  renderWidget(containerId, district) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = (key) => T ? T.get(key) : key;
    const weather = this.getWeather(district);
    const { current, forecast } = weather;

    el.innerHTML = `
      <div class="weather-widget">
        <div class="weather-current">
          <div class="weather-main">
            <span class="weather-icon">${current.icon}</span>
            <div class="weather-info">
              <div class="weather-temp">${current.temp}°C</div>
              <div class="weather-condition">${current.condition}</div>
              <div class="weather-location">${district || 'Kathmandu'}</div>
            </div>
          </div>
          <div class="weather-details">
            <div class="weather-detail"><span>💧</span> ${current.humidity}%</div>
            <div class="weather-detail"><span>🌧️</span> ${current.rain}%</div>
            <div class="weather-detail"><span>💨</span> ${current.wind} km/h</div>
          </div>
        </div>
        ${current.suggestions && current.suggestions.length ? `
          <div class="weather-tips">
            <div class="weather-tips-title">🌱 ${t('eco.farmingTips')}</div>
            ${current.suggestions.map(s => `<div class="weather-tip-item">• ${s}</div>`).join('')}
          </div>
        ` : ''}
        ${forecast && forecast.length ? `
          <div class="weather-forecast">
            <div class="weather-forecast-title">📅 ${t('eco.forecast')}</div>
            <div class="weather-forecast-grid">
              ${forecast.map(day => `
                <div class="weather-forecast-day">
                  <div class="weather-day-name">${day.day}</div>
                  <div class="weather-day-icon">${day.icon}</div>
                  <div class="weather-day-temp">${day.temp}°</div>
                  <div class="weather-day-rain">🌧️${day.rain}%</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  getAvailabilityBadge(status) {
    const badges = {
      'available': { icon: '🟢', text: 'Available', color: '#16a34a', bg: '#dcfce7' },
      'partial': { icon: '🟡', text: 'Partially Busy', color: '#ca8a04', bg: '#fef9c3' },
      'busy': { icon: '🔴', text: 'Busy', color: '#dc2626', bg: '#fee2e2' }
    };
    return badges[status] || badges['available'];
  },

  renderAvailabilityBadge(status) {
    const badge = this.getAvailabilityBadge(status);
    return `<span class="availability-badge" style="background:${badge.bg};color:${badge.color};padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:4px">${badge.icon} ${badge.text}</span>`;
  }
};
