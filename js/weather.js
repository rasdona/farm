const Weather = {
  cache: {},
  cacheExpiry: 1800000,

  DISTRICT_COORDS: {
    'Chitwan': { lat: 27.5291, lon: 84.3542 },
    'Ilam': { lat: 26.9134, lon: 87.9267 },
    'Kathmandu': { lat: 27.7172, lon: 85.3240 },
    'Kaski': { lat: 28.2096, lon: 83.9856 },
    'Bara': { lat: 27.1317, lon: 84.8987 },
    'Rautahat': { lat: 27.0833, lon: 85.3333 },
    'Morang': { lat: 26.5000, lon: 87.3333 },
    'Jhapa': { lat: 26.5833, lon: 87.9167 },
    'Sunsari': { lat: 26.5000, lon: 87.0000 },
    'Lalitpur': { lat: 27.6644, lon: 85.3188 },
    'Bhaktapur': { lat: 27.6710, lon: 85.4298 },
    'Makwanpur': { lat: 27.4167, lon: 84.8333 },
    'Gorkha': { lat: 28.0000, lon: 84.6333 },
    'Tanahu': { lat: 27.9333, lon: 84.4167 },
    'Tanahun': { lat: 27.9333, lon: 84.4167 },
    'Syangja': { lat: 28.0833, lon: 83.8333 },
    'Palpa': { lat: 27.8667, lon: 83.5833 },
    'Rupandehi': { lat: 27.5000, lon: 83.5000 },
    'Kapilvastu': { lat: 27.5333, lon: 83.0500 },
    'Dang': { lat: 28.0167, lon: 82.2500 },
    'Banke': { lat: 28.0833, lon: 81.6333 },
    'Bardiya': { lat: 28.3333, lon: 81.5000 },
    'Surkhet': { lat: 28.5167, lon: 81.6000 },
    'Kailali': { lat: 28.7500, lon: 80.9167 },
    'Kanchanpur': { lat: 28.8333, lon: 80.2000 },
    'Dhading': { lat: 27.8667, lon: 84.9333 },
    'Nuwakot': { lat: 27.9167, lon: 85.1667 },
    'Rasuwa': { lat: 28.1000, lon: 85.2833 },
    'Sindhuli': { lat: 27.2500, lon: 85.9167 },
    'Dolakha': { lat: 27.7500, lon: 86.0833 },
    'Sindhupalchok': { lat: 27.8333, lon: 85.6167 },
    'Kavrepalanchowk': { lat: 27.5833, lon: 85.5833 },
    'Ramechhap': { lat: 27.4167, lon: 86.0833 },
    'Solukhumbu': { lat: 27.5000, lon: 86.5833 },
    'Taplejung': { lat: 27.3500, lon: 87.6667 },
    'Panchthar': { lat: 27.1500, lon: 87.5833 },
    'Dhankuta': { lat: 26.9833, lon: 87.3333 },
    'Terhathum': { lat: 27.2000, lon: 87.2500 },
    'Sankhuwasabha': { lat: 27.3500, lon: 87.2833 },
    'Bhojpur': { lat: 27.1667, lon: 87.0500 },
    'Khotang': { lat: 27.2000, lon: 86.7500 },
    'Udayapur': { lat: 26.8333, lon: 86.5833 },
    'Okhaldhunga': { lat: 27.3167, lon: 86.5000 },
    'Saptari': { lat: 26.5500, lon: 86.7500 },
    'Siraha': { lat: 26.6500, lon: 86.2000 },
    'Dhanusha': { lat: 26.5833, lon: 86.0000 },
    'Mahottari': { lat: 26.6667, lon: 85.8333 },
    'Sarlahi': { lat: 26.8333, lon: 85.5000 },
    'Parsa': { lat: 27.0833, lon: 84.7500 },
    'Chitwan': { lat: 27.5291, lon: 84.3542 },
    'Gulmi': { lat: 28.0833, lon: 83.4167 },
    'Arghakhanchi': { lat: 27.9167, lon: 83.2500 },
    'Pyuthan': { lat: 28.0833, lon: 82.9500 },
    'Rolpa': { lat: 28.3333, lon: 82.6167 },
    'Eastern Rukum': { lat: 28.3833, lon: 82.4833 },
    'Western Rukum': { lat: 28.3833, lon: 82.3000 },
    'Baglung': { lat: 28.2667, lon: 83.5833 },
    'Parbat': { lat: 28.2333, lon: 83.7000 },
    'Myagdi': { lat: 28.4167, lon: 83.4833 },
    'Mustang': { lat: 28.8000, lon: 83.8667 },
    'Manang': { lat: 28.6667, lon: 84.0167 },
    'Lamjung': { lat: 28.2167, lon: 84.3833 },
    'Parasi': { lat: 27.7500, lon: 83.8833 },
    'Nawalparasi East': { lat: 27.8000, lon: 84.1000 },
    'Humla': { lat: 29.9667, lon: 81.9333 },
    'Jumla': { lat: 29.2747, lon: 82.1839 },
    'Dolpa': { lat: 28.9500, lon: 82.8167 },
    'Mugu': { lat: 29.5333, lon: 82.0833 },
    'Kalikot': { lat: 29.1333, lon: 81.7500 },
    'Jajarkot': { lat: 28.8333, lon: 82.1833 },
    'Dailekh': { lat: 28.8333, lon: 81.7833 },
    'Salyan': { lat: 28.3833, lon: 82.1667 },
    'Darchula': { lat: 29.5833, lon: 80.5833 },
    'Baitadi': { lat: 29.4167, lon: 80.5333 },
    'Dadeldhura': { lat: 29.3000, lon: 80.5833 },
    'Doti': { lat: 29.1667, lon: 80.9333 },
    'Achham': { lat: 29.1333, lon: 81.3333 },
    'Bajhang': { lat: 29.5500, lon: 81.0000 },
    'Bajura': { lat: 29.4333, lon: 81.3833 },
  },

  WMO_CODES: {
    0: { icon: '☀️', condition: 'Clear Sky', suggestions: ['Perfect for field work', 'Stay hydrated', 'Good harvest day'] },
    1: { icon: '🌤️', condition: 'Mainly Clear', suggestions: ['Good day for outdoor work', 'Moderate sun exposure'] },
    2: { icon: '⛅', condition: 'Partly Cloudy', suggestions: ['Good day for planting', 'Monitor weather changes'] },
    3: { icon: '☁️', condition: 'Overcast', suggestions: ['Good for transplanting', 'Reduced sun stress on crops'] },
    45: { icon: '🌫️', condition: 'Fog', suggestions: ['Avoid pesticide spraying', 'Good for tea plucking', 'Cover sensitive crops'] },
    48: { icon: '🌫️', condition: 'Rime Fog', suggestions: ['Avoid spraying', 'Protect sensitive crops from frost'] },
    51: { icon: '🌧️', condition: 'Light Drizzle', suggestions: ['Good for rice transplanting', 'Check drainage'] },
    53: { icon: '🌧️', condition: 'Moderate Drizzle', suggestions: ['Postpone spraying', 'Good for new plantings'] },
    55: { icon: '🌧️', condition: 'Dense Drizzle', suggestions: ['Postpone field work', 'Check flood-prone areas'] },
    61: { icon: '🌧️', condition: 'Light Rain', suggestions: ['Postpone spraying', 'Check drainage systems'] },
    63: { icon: '🌧️', condition: 'Moderate Rain', suggestions: ['Stay indoors', 'Check crop water levels'] },
    65: { icon: '🌧️', condition: 'Heavy Rain', suggestions: ['Flood alert - check low areas', 'Secure livestock'] },
    71: { icon: '🌨️', condition: 'Light Snow', suggestions: ['Protect frost-sensitive crops', 'Cover livestock areas'] },
    73: { icon: '🌨️', condition: 'Moderate Snow', suggestions: ['Keep livestock sheltered', 'Check crop damage'] },
    75: { icon: '🌨️', condition: 'Heavy Snow', suggestions: ['Emergency livestock shelter', 'Avoid travel'] },
    80: { icon: '🌦️', condition: 'Light Showers', suggestions: ['Good for crops', 'Monitor drainage'] },
    81: { icon: '🌦️', condition: 'Moderate Showers', suggestions: ['Good irrigation supplement', 'Check erosion'] },
    82: { icon: '⛈️', condition: 'Violent Showers', suggestions: ['Secure loose items', 'Avoid open fields'] },
    95: { icon: '⛈️', condition: 'Thunderstorm', suggestions: ['Seek shelter immediately', 'Avoid field work', 'Protect livestock'] },
    96: { icon: '⛈️', condition: 'Thunderstorm + Hail', suggestions: ['Emergency shelter', 'Protect crops from hail damage'] },
    99: { icon: '⛈️', condition: 'Heavy Thunderstorm', suggestions: ['Stay indoors', 'Secure all farm equipment'] },
  },

  async getWeather(district) {
    const cacheKey = district || 'default';
    const cached = this.cache[cacheKey];
    if (cached && (Date.now() - cached.ts < this.cacheExpiry)) return cached.data;

    const coords = this.DISTRICT_COORDS[district] || this.DISTRICT_COORDS['Kathmandu'];

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKathmandu&forecast_days=5`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Weather API error: ${resp.status}`);
      const data = await resp.json();

      const currentCode = data.current?.weather_code ?? 2;
      const wmo = this.WMO_CODES[currentCode] || this.WMO_CODES[2];

      const current = {
        temp: Math.round(data.current?.temperature_2m ?? 25),
        condition: wmo.condition,
        humidity: data.current?.relative_humidity_2m ?? 60,
        rain: data.daily?.precipitation_probability_max?.[0] ?? 20,
        icon: wmo.icon,
        wind: Math.round(data.current?.wind_speed_10m ?? 10),
        code: currentCode,
        suggestions: wmo.suggestions,
      };

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const forecast = [];
      for (let i = 0; i < 5; i++) {
        const code = data.daily?.weather_code?.[i] ?? 2;
        const fw = this.WMO_CODES[code] || this.WMO_CODES[2];
        const d = new Date();
        d.setDate(d.getDate() + i);
        forecast.push({
          date: d.toISOString().split('T')[0],
          day: days[d.getDay()],
          temp: Math.round(data.daily?.temperature_2m_max?.[i] ?? 25),
          icon: fw.icon,
          condition: fw.condition,
          rain: data.daily?.precipitation_probability_max?.[i] ?? 0,
        });
      }

      const result = { current, forecast };
      this.cache[cacheKey] = { data: result, ts: Date.now() };
      return result;
    } catch (e) {
      console.warn('[Weather] API failed, using fallback:', e.message);
      return this._fallback(district);
    }
  },

  _fallback(district) {
    return {
      current: { temp: 25, condition: 'Partly Cloudy', humidity: 60, rain: 20, icon: '⛅', wind: 10, suggestions: ['Good day for planting', 'Ensure adequate irrigation'] },
      forecast: Array.from({ length: 5 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i);
        return { date: d.toISOString().split('T')[0], day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], temp: 25, icon: '⛅', condition: 'Partly Cloudy', rain: 20 };
      }),
    };
  },

  getAlert(weather) {
    const c = weather?.current;
    if (!c) return null;
    const alerts = [];
    const severe = {
      65: 'Heavy Rain', 82: 'Violent Showers', 95: 'Thunderstorm',
      96: 'Thunderstorm + Hail', 99: 'Heavy Thunderstorm',
      71: 'Light Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 45: 'Fog', 48: 'Rime Fog'
    };
    if (severe[c.code]) alerts.push(`${c.icon} ${severe[c.code]} — take extra care with crops and livestock.`);
    if (c.wind >= 40) alerts.push(`💨 Strong wind (${c.wind} km/h) — secure greenhouses and loose equipment.`);
    if (c.temp >= 35) alerts.push(`🌡️ Extreme heat (${c.temp}°C) — irrigate early and avoid midday field work.`);
    if (c.temp <= 5) alerts.push(`❄️ Cold (${c.temp}°C) — protect frost-sensitive crops.`);
    if (c.rain >= 80) alerts.push(`🌧️ High chance of rain (${c.rain}%) — adjust irrigation and plan accordingly.`);
    return alerts.length ? alerts : null;
  },

  renderAlert(weather) {
    const alerts = this.getAlert(weather);
    if (!alerts || !alerts.length) return '';
    return `
      <div class="weather-alert">
        ${alerts.map(a => `<div class="weather-alert-item">⚠️ ${a}</div>`).join('')}
      </div>`;
  },

  renderWidget(containerId, district) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const T = typeof I18N !== 'undefined' ? I18N : null;
    const t = (key) => T ? T.get(key) : key;

    el.innerHTML = `<div class="weather-widget" style="text-align:center;padding:20px"><div class="weather-loading">🌤️ Loading weather...</div></div>`;

    this.getWeather(district).then(weather => {
      const { current, forecast } = weather;
      el.innerHTML = `
        <div class="weather-widget">
          ${this.renderAlert(weather)}
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
    });
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
