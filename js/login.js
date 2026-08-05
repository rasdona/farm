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
    showLoginError('मान्य इमेल ठेगाना लेख्नुहोस् / Please enter a valid email address');
    return false;
  }

  showLoginLoading(true);

  setTimeout(async () => {
    const result = await Auth.login(identifier, password, { rememberMe });
    showLoginLoading(false);

    if (result.success) {
      showLoginSuccess('लगइन सफल भयो! / Login successful!');
      localStorage.setItem('agri_currentUser', result.user.id);
      Auth.init();
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      if (AuthSystem.requiresPhotoUpload(result.user)) {
        setTimeout(() => { window.location.href = 'photo-gate.html' + (redirect ? '?redirect=' + encodeURIComponent(redirect) : ''); }, 800);
      } else {
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      }
    } else if (result.requiresEmailVerification) {
      Utils.toast('कृपया इमेल OTP सत्यापन गर्नुहोस्।', 'warning');
      setTimeout(() => { window.location.href = 'verify-otp.html?type=email&email=' + encodeURIComponent(result.email || identifier); }, 500);
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
  if (Auth.isLoggedIn()) { window.location.href = 'index.html'; return; }

  const strengthInput = document.getElementById('loginPassword');
  if (strengthInput) {
    strengthInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleLogin(e);
    });
  }
});
