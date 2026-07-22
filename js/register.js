let currentStep = 1;
const totalSteps = 4;

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
    const phone = document.getElementById('regPhone').value.trim();
    if (!name || name.length < 2) { showRegError('कृपया पूरा नाम लेख्नुहोस्', 'regName'); return false; }
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
  const result = AuthSystem.validatePasswordStrength(pwd);
  const fill = document.getElementById('pwdStrengthFill');
  const label = document.getElementById('pwdStrengthLabel');
  fill.style.width = result.percentage + '%';
  fill.style.background = result.percentage >= 80 ? '#059669' : result.percentage >= 60 ? '#2563eb' : result.percentage >= 40 ? '#f59e0b' : '#ef4444';
  label.textContent = pwd ? result.label : '';
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

async function handleRegister() {
  if (!validateCurrentStep()) return;
  const errEl = document.getElementById('regError');
  errEl.classList.add('hidden');

  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;

  if (password.length < 8) { showRegError('पासवर्ड कम्तिमा ८ अक्षरको हुनुपर्छ'); return; }
  if (!/[A-Z]/.test(password)) { showRegError('पासवर्डमा ठूलो अक्षर चाहिन्छ'); return; }
  if (!/[a-z]/.test(password)) { showRegError('पासवर्डमा सानो अक्षर चाहिन्छ'); return; }
  if (!/[0-9]/.test(password)) { showRegError('पासवर्डमा अंक चाहिन्छ'); return; }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { showRegError('पासवर्डमा विशेष चिह्न चाहिन्छ'); return; }
  if (password !== confirmPassword) { showRegError('पासवर्ड मिल्दैन'); return; }
  if (!document.getElementById('regTerms').checked) { showRegError('सेवाका शर्त सहमत हुनुहोस्'); return; }

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
    preferredLanguage: 'ne'
  };

  const btn = document.getElementById('regSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'दर्ता हुँदैछ...';

  try {
    const result = await AuthSystem.register(data);
    if (result.success) {
      Auth.currentUser = result.user;
      localStorage.setItem('agri_currentUser', result.user.id);
      sessionStorage.setItem('agri_pendingPhone', data.phone);
      Utils.toast('दर्ता सफल भयो! OTP पठाइँदैछ...');
      setTimeout(() => { window.location.href = 'verify-otp.html?type=phone&phone=' + encodeURIComponent(data.phone); }, 800);
    } else {
      if (result.errors && result.errors.length) {
        const firstErr = result.errors[0];
        showRegError(firstErr.message);
        if (firstErr.field) {
          const fieldMap = { name: 'regName', phone: 'regPhone', email: 'regEmail', password: 'regPassword', confirmPassword: 'regConfirmPassword', roles: null, province: 'regProvince', district: 'regDistrict' };
          const fieldId = fieldMap[firstErr.field];
          if (fieldId) document.getElementById(fieldId)?.focus();
        }
      } else {
        showRegError(result.message || 'दर्ता असफल भयो');
      }
      btn.disabled = false;
      btn.textContent = 'दर्ता गर्नुहोस्';
    }
  } catch (err) {
    showRegError('एउटा त्रुटि भयो। कृपया फेरि प्रयास गर्नुहोस्');
    btn.disabled = false;
    btn.textContent = 'दर्ता गर्नुहोस्';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  App.init();
  if (Auth.isLoggedIn()) { window.location.href = Auth.getDashboardUrl(); return; }
  initLocationDropdowns();
  document.querySelectorAll('.auth-role-card').forEach(card => {
    card.addEventListener('click', function() {
      setTimeout(() => {
        const checked = this.querySelector('.auth-role-check').checked;
        this.classList.toggle('selected', checked);
      }, 10);
    });
  });
});