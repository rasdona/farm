const NearbyFarmers = {
  farmers: [],
  selectedCrops: [],

  init() {
    App.init();
    this.loadFarmers();
    this.renderCropFilters();
    this.filter();
  },

  loadFarmers() {
    const user = Auth.currentUser;
    const myDistrict = user?.district || 'Kathmandu';
    this.farmers = DB.getUsers().filter(u => u.role === 'farmer' && u.id !== user?.id).map(f => {
      const districtDistances = {
        'Kathmandu': { 'Lalitpur': 2, 'Bhaktapur': 5, 'Kavrepalanchok': 15, 'Dhading': 30, 'Makwanpur': 45 },
        'Lalitpur': { 'Kathmandu': 2, 'Bhaktapur': 7, 'Kavrepalanchok': 18, 'Dhading': 32, 'Makwanpur': 43 },
        'Bhaktapur': { 'Kathmandu': 5, 'Lalitpur': 7, 'Kavrepalanchok': 12, 'Dhading': 28, 'Makwanpur': 40 },
        'Chitwan': { 'Nawalparasi': 30, 'Tanahu': 45, 'Gorkha': 60, 'Makwanpur': 50, 'Bara': 40 },
        'Jhapa': { 'Morang': 15, 'Sunsari': 40, 'Panchthar': 50, 'Ilam': 30 },
        'Morang': { 'Jhapa': 15, 'Sunsari': 25, 'Panchthar': 60, 'Terhathum': 40 },
        'Ilam': { 'Jhapa': 30, 'Panchthar': 20, 'Terhathum': 25, 'Sankhuwasabha': 80 }
      };
      const distMap = districtDistances[myDistrict] || {};
      const distance = distMap[f.district] || Math.floor(Math.random() * 80) + 5;
      const creditInfo = DB.getLaborCreditsByUser(f.id);
      const rating = DB.getAvgRating(f.id);
      const armaReqs = DB.getArmaParmaRequests().filter(r => r.farmerId === f.id);

      return {
        ...f,
        distance,
        creditBalance: creditInfo.balance,
        creditEarned: creditInfo.earned,
        rating: parseFloat(rating) || 0,
        armaParmaCount: armaReqs.length,
        lookingFor: armaReqs.length > 0 ? 'exchange' : 'worker',
        lookingForLabel: armaReqs.length > 0 ? '🤝 Arma Parma Exchange' : '👷 Needs Workers'
      };
    });
  },

  renderCropFilters() {
    const crops = [...new Set(this.farmers.flatMap(f => f.crops || []))].sort();
    document.getElementById('cropFilters').innerHTML = crops.map(c => `
      <button class="badge badge-outline crop-tag" data-crop="${c}" onclick="NearbyFarmers.toggleCrop('${c}',this)" style="cursor:pointer;padding:4px 10px;font-size:0.75rem">${c}</button>
    `).join('');
  },

  toggleCrop(crop, el) {
    if (this.selectedCrops.includes(crop)) {
      this.selectedCrops = this.selectedCrops.filter(c => c !== crop);
      el.classList.remove('active');
      el.style.background = '';
      el.style.color = '';
    } else {
      this.selectedCrops.push(crop);
      el.classList.add('active');
      el.style.background = 'var(--primary)';
      el.style.color = 'white';
    }
    this.filter();
  },

  filter() {
    const distance = document.getElementById('distanceFilter').value;
    const lookingFor = document.getElementById('lookingForFilter').value;
    const sortBy = document.getElementById('sortByFilter').value;

    let filtered = [...this.farmers];
    if (distance) filtered = filtered.filter(f => f.distance <= parseInt(distance));
    if (lookingFor === 'worker') filtered = filtered.filter(f => f.lookingFor === 'worker');
    else if (lookingFor === 'exchange') filtered = filtered.filter(f => f.lookingFor === 'exchange');
    else if (lookingFor === 'both') filtered = filtered.filter(f => f.lookingFor === 'exchange' || f.crops?.length > 2);
    if (this.selectedCrops.length) filtered = filtered.filter(f => this.selectedCrops.some(c => f.crops?.includes(c)));

    if (sortBy === 'distance') filtered.sort((a, b) => a.distance - b.distance);
    else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'credits') filtered.sort((a, b) => b.creditEarned - a.creditEarned);

    this.renderList(filtered);
  },

  renderList(farmers) {
    document.getElementById('nearbyCount').textContent = `${farmers.length} farmer${farmers.length !== 1 ? 's' : ''} found`;
    const el = document.getElementById('nearbyList');
    if (!farmers.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">📍</div><h3>No farmers found</h3><p>Try adjusting your filters or expanding your search radius.</p></div>`;
      return;
    }
    el.innerHTML = farmers.map(f => `
      <div class="nearby-farmer-card" onclick="window.location.href='profile.html?id=${f.id}'">
        <div class="relative">
          ${Utils.avatarHTML(Utils.getUserPhoto(f), f.name, 'md')}
          ${f.distance <= 10 ? '<div style="position:absolute;bottom:-2px;right:-2px;background:#059669;color:white;font-size:0.6rem;padding:2px 5px;border-radius:var(--radius-full);font-weight:700">NEAR</div>' : ''}
        </div>
        <div style="flex:1;min-width:0">
          <div class="font-semibold" style="font-size:0.95rem">${f.farmName || f.name}</div>
          <div class="text-sm text-muted">📍 ${f.district} · ${f.distance} km away</div>
          <div class="flex flex-wrap gap-1 mt-1">
            ${(f.crops || []).slice(0, 3).map(c => `<span class="badge badge-outline" style="font-size:0.65rem;padding:2px 6px">${c}</span>`).join('')}
            ${(f.crops || []).length > 3 ? `<span class="badge badge-outline" style="font-size:0.65rem;padding:2px 6px">+${f.crops.length - 3}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:0.8rem;font-weight:600;color:${f.lookingFor === 'exchange' ? '#059669' : '#2563eb'}">${f.lookingForLabel}</div>
          ${f.rating > 0 ? `<div style="font-size:0.75rem;margin-top:2px">⭐ ${f.rating.toFixed(1)}</div>` : ''}
          ${f.creditEarned > 0 ? `<div style="font-size:0.75rem;color:#065f46">🤝 ${f.creditEarned} credits</div>` : ''}
        </div>
      </div>
    `).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => NearbyFarmers.init());