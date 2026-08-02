let currentStep = 1;
const totalSteps = 5;
let regPhotoDataUrl = null;
let regPhotoFile = null;

function compressPhoto(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          const reader2 = new FileReader();
          reader2.onload = () => resolve(reader2.result);
          reader2.onerror = reject;
          reader2.readAsDataURL(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function goToStep(step) {
  if (step > currentStep && !validateCurrentStep()) return;
  document.querySelectorAll('.auth-form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + step).classList.add('active');
  document.querySelectorAll('.auth-step').forEach((s, i) => {
    s.classList.toggle('active', i + 1 <= step);
    s.classList.toggle('completed', i + 1 < step);
  });
  currentStep = step;
  document.getElementById('step' + step).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateCurrentStep() {
  const errEl = document.getElementById('regError');
  errEl.classList.add('hidden');

  if (currentStep === 1) {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    if (!name || name.length < 2) { showRegError('कृपया पूरा नाम लेख्नुहोस्', 'regName'); return false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showRegError('मान्य इमेल ठेगाना लेख्नुहोस्', 'regEmail'); return false; }
    if (DB.getUserByEmail(email)) { showRegError('यो इमेल पहिले नै दर्ता भएको छ', 'regEmail'); return false; }
    if (!phone || !/^[9][0-9]{9}$/.test(phone)) { showRegError('मान्य फोन नम्बर लेख्नुहोस् (98XXXXXXXX)', 'regPhone'); return false; }
    if (DB.getUserByPhone(phone)) { showRegError('यो फोन नम्बर पहिले नै दर्ता भएको छ', 'regPhone'); return false; }
    return true;
  }
  if (currentStep === 2) {
    const roles = document.querySelectorAll('.auth-role-check:checked');
    if (roles.length === 0) { showRegError('कम्तिमा एउटा भूमिका छान्नुहोस्'); return false; }
    return true;
  }
  if (currentStep === 3) {
    if (!document.getElementById('regProvince').value) { showRegError('प्रदेश छान्नुहोस्'); return false; }
    if (!document.getElementById('regDistrict').value) { showRegError('जिल्ला छान्नुहोस्'); return false; }
    return true;
  }
  if (currentStep === 4) {
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    if (password.length < 8) { showRegError('पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ'); return false; }
    if (!/[A-Z]/.test(password)) { showRegError('पासवर्डमा ठूलो अक्षर चाहिन्छ'); return false; }
    if (!/[a-z]/.test(password)) { showRegError('पासवर्डमा सानो अक्षर चाहिन्छ'); return false; }
    if (!/[0-9]/.test(password)) { showRegError('पासवर्डमा अंक चाहिन्छ'); return false; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { showRegError('पासवर्डमा विशेष चिह्न चाहिन्छ'); return false; }
    if (password !== confirmPassword) { showRegError('पासवर्ड मिल्दैन'); return false; }
    if (!document.getElementById('regTerms').checked) { showRegError('सेवाका शर्त सहमत हुनुहोस्'); return false; }
    return true;
  }
  return true;
}

function showRegError(msg, focusId) {
  const el = document.getElementById('regError');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (focusId) document.getElementById(focusId)?.focus();
}

function updatePasswordStrength() {
  const pwd = document.getElementById('regPassword').value;
  const fill = document.getElementById('pwdStrengthFill');
  const label = document.getElementById('pwdStrengthLabel');
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
  const percentage = score * 20;
  fill.style.width = percentage + '%';
  fill.style.background = percentage >= 80 ? '#059669' : percentage >= 60 ? '#2563eb' : percentage >= 40 ? '#f59e0b' : '#ef4444';
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  label.textContent = pwd ? labels[score] : '';
  document.getElementById('reqLength').classList.toggle('done', pwd.length >= 8);
  document.getElementById('reqUpper').classList.toggle('done', /[A-Z]/.test(pwd));
  document.getElementById('reqLower').classList.toggle('done', /[a-z]/.test(pwd));
  document.getElementById('reqNumber').classList.toggle('done', /[0-9]/.test(pwd));
  document.getElementById('reqSpecial').classList.toggle('done', /[!@#$%^&*(),.?":{}|<>]/.test(pwd));
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
}

function initLocationDropdowns() {
  const provinceSelect = document.getElementById('regProvince');
  const provinces = SAMPLE_LOCATIONS.provinces;
  provinceSelect.innerHTML = '<option value="">प्रदेश छान्नुहोस्</option>' +
    provinces.map((p, i) => `<option value="${p.name}">${p.name} प्रदेश</option>`).join('');
}

function updateDistricts() {
  const province = document.getElementById('regProvince').value;
  const districtSelect = document.getElementById('regDistrict');
  if (!province) { districtSelect.innerHTML = '<option value="">पहिले प्रदेश छान्नुहोस्</option>'; return; }
  const prov = SAMPLE_LOCATIONS.provinces.find(p => p.name === province);
  districtSelect.innerHTML = '<option value="">जिल्ला छान्नुहोस्</option>' +
    (prov ? prov.districts.map(d => `<option value="${d}">${d}</option>`).join('') : '');
}

function showRegProgress(steps) {
  let container = document.getElementById('regProgress');
  if (!container) {
    container = document.createElement('div');
    container.id = 'regProgress';
    container.style.cssText = 'margin:16px 0;padding:12px;background:var(--bg-alt);border-radius:8px;font-size:0.82rem;max-height:200px;overflow-y:auto;';
    const errEl = document.getElementById('regError');
    errEl.parentNode.insertBefore(container, errEl.nextSibling);
  }
  const labels = {
    1: 'Validating form',
    2: 'Checking server connection',
    3: 'Checking mobile number',
    4: 'Checking email',
    5: 'Creating account',
    6: 'Storing registration data',
    7: 'Complete'
  };
  container.innerHTML = steps.map(s => {
    const icon = s.status === 'started' ? '⏳' : s.status === 'success' ? '✅' : '❌';
    const color = s.status === 'success' ? '#059669' : s.status === 'failed' ? '#dc2626' : '#6b7280';
    return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;color:' + color + '">'
      + '<span>' + icon + '</span>'
      + '<span style="flex:1">' + (labels[s.step] || 'Step ' + s.step) + '</span>'
      + (s.detail ? '<span style="font-size:0.75rem;opacity:0.7;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + s.detail.replace(/"/g, '&quot;') + '">' + s.detail + '</span>' : '')
      + '</div>';
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function hideRegProgress() {
  const el = document.getElementById('regProgress');
  if (el) el.style.display = 'none';
}

function resetRegProgress() {
  const el = document.getElementById('regProgress');
  if (el) el.remove();
}

async function handleRegister() {
  if (!validateCurrentStep()) return;
  const errEl = document.getElementById('regError');
  errEl.classList.add('hidden');

  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;

  const roles = Array.from(document.querySelectorAll('.auth-role-check:checked')).map(c => c.value);

  const data = {
    name: document.getElementById('regName').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    password: password,
    confirmPassword: confirmPassword,
    roles: roles,
    province: document.getElementById('regProvince').value,
    district: document.getElementById('regDistrict').value,
    municipality: document.getElementById('regMunicipality').value.trim(),
    ward: document.getElementById('regWard').value,
    gender: document.getElementById('regGender').value,
    dob: document.getElementById('regDob').value,
    citizenshipNumber: document.getElementById('regCitizenship').value.trim(),
    preferredLanguage: 'ne',
    photoDataUrl: regPhotoDataUrl || null,
    photoFile: regPhotoFile || null
  };

  if (data.photoDataUrl) {
    try {
      sessionStorage.setItem('agri_pendingPhoto', data.photoDataUrl);
    } catch (e) {
      console.warn('[Registration] Could not store photo in sessionStorage:', e.message);
      showRegPhotoError('फोटो स्टोर गर्न असफल। दर्ता बिना फोटो जारी राखिनेछ।');
      data.photoDataUrl = null;
      regPhotoDataUrl = null;
      regPhotoFile = null;
    }
  }

  const btn = document.getElementById('regSubmitBtn');
  const origText = 'दर्ता गर्नुहोस्';
  btn.disabled = true;
  btn.textContent = 'दर्ता हुँदैछ...';

  resetRegProgress();
  errEl.classList.add('hidden');

  try {
    console.log('[Registration] Starting registration flow for:', data.email);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 45000)
    );
    const result = await Promise.race([AuthSystem.register(data), timeoutPromise]);

    if (result.steps) showRegProgress(result.steps);

    if (result.success) {
      console.log('[Registration] Registration succeeded');

      Utils.toast('दर्ता सफल भयो! OTP पठाइँदैछ...');
      btn.textContent = 'दर्ता सफल! ✓';
      btn.style.background = '#059669';

      try { sessionStorage.setItem('agri_otpSent', JSON.stringify({ email: data.email.trim().toLowerCase(), at: Date.now() })); } catch (e) {}

      setTimeout(() => { window.location.href = 'verify-otp.html?type=email&email=' + encodeURIComponent(data.email.trim().toLowerCase()); }, 1500);
    } else {
      console.error('[Registration] Registration failed:', result.message || JSON.stringify(result.errors));

      if (result.errors && result.errors.length) {
        const firstErr = result.errors[0];
        showRegError(firstErr.message);
        if (firstErr.field) {
          const fieldMap = { name: 'regName', phone: 'regPhone', email: 'regEmail', password: 'regPassword', confirmPassword: 'regConfirmPassword', roles: null, province: 'regProvince', district: 'regDistrict' };
          const fieldId = fieldMap[firstErr.field];
          if (fieldId) document.getElementById(fieldId)?.focus();
        }
      } else {
        showRegError(result.message || 'दर्ता असफल भयो। कृपया फेरि प्रयास गर्नुहोस्।');
      }

      btn.disabled = false;
      btn.textContent = origText;
      btn.style.background = '';
    }
  } catch (err) {
    console.error('[Registration] Unhandled error:', err);

    if (err.message === 'TIMEOUT') {
      showRegError('सर्भरसँग सम्पर्क गर्न असफल भयो (समय सकियो)। कृपया इन्टरनेट जाँच गर्नुहोस् र फेरि प्रयास गर्नुहोस्।');
    } else {
      showRegError('एउटा अप्रत्याशित त्रुटि भयो: ' + (err.message || 'Unknown error') + '। कृपया फेरि प्रयास गर्नुहोस्।');
    }

    btn.disabled = false;
    btn.textContent = origText;
    btn.style.background = '';
  } finally {
    if (btn.textContent === 'दर्ता हुँदैछ...') {
      btn.disabled = false;
      btn.textContent = origText;
      btn.style.background = '';
    }
  }
}

async function handleRegPhotoSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showRegPhotoError('मान्य फोटो छान्नुहोस्। JPG, PNG, वा WEBP मात्र।');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showRegPhotoError('फोटो साइज धेरै ठूलो छ। अधिकतम 5MB।');
    return;
  }

  try {
    document.getElementById('regPhotoSuccess').textContent = 'फोटो प्रशोधन हुँदैछ...';
    document.getElementById('regPhotoSuccess').classList.remove('hidden');

    const compressed = await compressPhoto(file, 400, 400, 0.75);

    const validated = await new Promise((resolve, reject) => {
      const img = new Image();
      const loadTimeout = setTimeout(() => reject(new Error('Image load timeout')), 10000);
      img.onload = () => {
        clearTimeout(loadTimeout);
        if (img.width < 100 || img.height < 100) {
          reject(new Error('Image too small: ' + img.width + 'x' + img.height));
          return;
        }
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(loadTimeout);
        reject(new Error('Image load failed'));
      };
      img.src = compressed;
    });

    regPhotoDataUrl = compressed;

    const byteStr = atob(compressed.split(',')[1]);
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    regPhotoFile = new Blob([ab], { type: 'image/jpeg' });
    regPhotoFile.name = 'avatar.jpg';

    document.getElementById('regPhotoPreview').src = compressed;
    document.getElementById('regPhotoPreview').style.display = 'block';
    document.getElementById('regPhotoPlaceholder').style.display = 'none';
    document.getElementById('regPhotoRing').style.borderStyle = 'solid';
    document.getElementById('regPhotoRing').style.borderColor = 'var(--primary)';
    document.getElementById('regPhotoHint').innerHTML = '<span style="color:var(--primary);font-weight:600">✓ फोटो छानियो!</span> <span style="color:var(--text-tertiary)">फोटो बदल्न यहाँ क्लिक गर्नुहोस्</span>';
    document.getElementById('regPhotoError').classList.add('hidden');
    const sizeKB = Math.round(compressed.length * 0.75 / 1024);
    document.getElementById('regPhotoSuccess').textContent = 'फोटो तयार छ! (' + sizeKB + 'KB) दर्ता गर्दा अपलोड हुनेछ।';
    document.getElementById('regPhotoSuccess').classList.remove('hidden');
  } catch (err) {
    console.error('[RegPhoto] Processing failed:', err.message);
    regPhotoDataUrl = null;
    regPhotoFile = null;
    if (err.message && err.message.includes('too small')) {
      showRegPhotoError('फोटो कम्तिमा 100x100 पिक्सेल हुनुपर्छ।');
    } else {
      showRegPhotoError('फोटो प्रशोधन गर्न असफल। कृपया फेरि प्रयास गर्नुहोस्।');
    }
    document.getElementById('regPhotoSuccess').classList.add('hidden');
  }
}

function showRegPhotoError(msg) {
  const el = document.getElementById('regPhotoError');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('regPhotoSuccess').classList.add('hidden');
}

function skipPhotoUpload() {
  regPhotoDataUrl = null;
  regPhotoFile = null;
  handleRegister();
}

function initDobSelects() {
  const daySel = document.getElementById('regDobDay');
  const monthSel = document.getElementById('regDobMonth');
  const yearSel = document.getElementById('regDobYear');
  if (!daySel || !monthSel || !yearSel) return;

  for (let m = 1; m <= 12; m++) {
    monthSel.add(new Option(String(m).padStart(2, '0'), String(m).padStart(2, '0')));
  }
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 10; y >= currentYear - 100; y--) {
    yearSel.add(new Option(String(y), String(y)));
  }
  rebuildDobDays();
  daySel.addEventListener('change', syncDobValue);
  monthSel.addEventListener('change', () => { rebuildDobDays(); syncDobValue(); });
  yearSel.addEventListener('change', () => { rebuildDobDays(); syncDobValue(); });
}

function rebuildDobDays() {
  const daySel = document.getElementById('regDobDay');
  if (!daySel) return;
  const y = document.getElementById('regDobYear').value;
  const m = document.getElementById('regDobMonth').value;
  const max = (y && m) ? new Date(Number(y), Number(m), 0).getDate() : 31;
  const current = daySel.value;
  daySel.length = 1;
  for (let d = 1; d <= max; d++) {
    daySel.add(new Option(String(d).padStart(2, '0'), String(d).padStart(2, '0')));
  }
  if (current && Number(current) <= max) daySel.value = current;
}

function syncDobValue() {
  const d = document.getElementById('regDobDay').value;
  const m = document.getElementById('regDobMonth').value;
  const y = document.getElementById('regDobYear').value;
  const input = document.getElementById('regDob');
  if (d && m && y) input.value = y + '-' + m + '-' + d;
  else input.value = '';
}

document.addEventListener('DOMContentLoaded', function() {
  App.init();
  if (Auth.isLoggedIn()) { window.location.href = Auth.getDashboardUrl(); return; }
  initLocationDropdowns();
  initDobSelects();
  document.querySelectorAll('.auth-role-card').forEach(card => {
    card.addEventListener('click', function() {
      setTimeout(() => {
        const checked = this.querySelector('.auth-role-check').checked;
        this.classList.toggle('selected', checked);
      }, 10);
    });
  });
  document.getElementById('regPhotoRing').addEventListener('dragover', (e) => { e.preventDefault(); document.getElementById('regPhotoRing').style.borderColor = 'var(--primary)'; });
  document.getElementById('regPhotoRing').addEventListener('dragleave', () => { if (!regPhotoDataUrl) { document.getElementById('regPhotoRing').style.borderColor = 'var(--border)'; } });
  document.getElementById('regPhotoRing').addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById('regPhotoInput');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleRegPhotoSelect(input);
    }
  });
});