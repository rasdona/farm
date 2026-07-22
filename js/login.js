function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!identifier || !password) {
    showLoginError('कृपया सबै फिल्ड भर्नुहोस् / Please fill all fields');
    return false;
  }

  const inputType = AuthSystem.detectInputType(identifier);
  if (inputType === 'unknown') {
    showLoginError('फोन नम्बर वा इमेल सही छैन / Please enter a valid phone number or email');
    return false;
  }

  showLoginLoading(true);

  setTimeout(async () => {
    const result = await Auth.login(identifier, password, { rememberMe });
    showLoginLoading(false);

    if (result.success) {
      showLoginSuccess('लगइन सफल भयो! / Login successful!');
      Auth.currentUser = result.user;
      localStorage.setItem('agri_currentUser', result.user.id);
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      if (AuthSystem.requiresPhotoUpload(result.user)) {
        setTimeout(() => { window.location.href = 'photo-gate.html' + (redirect ? '?redirect=' + encodeURIComponent(redirect) : ''); }, 800);
      } else {
        setTimeout(() => { window.location.href = redirect || Auth.getDashboardUrl(); }, 800);
      }
    } else {
      showLoginError(result.message);
    }
  }, 600);

  return false;
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('loginSuccess').classList.add('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showLoginSuccess(msg) {
  const el = document.getElementById('loginSuccess');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('loginError').classList.add('hidden');
}

function showLoginLoading(show) {
  const btn = document.getElementById('loginBtn');
  const text = document.getElementById('loginBtnText');
  const loader = document.getElementById('loginBtnLoader');
  if (show) {
    btn.disabled = true;
    text.textContent = 'लगइन हुँदैछ...';
    loader.classList.remove('hidden');
  } else {
    btn.disabled = false;
    text.textContent = 'लगइन गर्नुहोस्';
    loader.classList.add('hidden');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.setAttribute('aria-label', 'Show password');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  App.init();
  if (Auth.isLoggedIn()) { window.location.href = Auth.getDashboardUrl(); return; }

  const identifierInput = document.getElementById('loginIdentifier');
  const icon = document.getElementById('inputTypeIcon');
  const hint = document.getElementById('inputHint');

  identifierInput.addEventListener('input', function() {
    const val = this.value.trim();
    const type = AuthSystem.detectInputType(val);
    if (type === 'phone') {
      icon.textContent = '📱';
      hint.textContent = 'फोन नम्बर पहिचान भयो';
      hint.style.color = '#059669';
    } else if (type === 'email') {
      icon.textContent = '📧';
      hint.textContent = 'इमेल पहिचान भयो';
      hint.style.color = '#2563eb';
    } else {
      icon.textContent = '📱';
      hint.textContent = 'फोन नम्बर वा इमेल दुवै काम गर्छ';
      hint.style.color = '';
    }
  });

  const strengthInput = document.getElementById('loginPassword');
  if (strengthInput) {
    strengthInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleLogin(e);
    });
  }
});