import { Auth } from './auth.js';

await Auth.init();
if (Auth.isLoggedIn()) { window.location.href = 'index.html'; }

if (window.location.hash === '#register') showTab('register');

document.getElementById('tab-login').addEventListener('click', () => showTab('login'));
document.getElementById('tab-register').addEventListener('click', () => showTab('register'));

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Signing in…';
  const result = await Auth.login(
    document.getElementById('loginEmail').value.trim(),
    document.getElementById('loginPassword').value
  );
  if (result.ok) {
    window.location.href = sessionStorage.getItem('fn_redirect') || 'index.html';
    sessionStorage.removeItem('fn_redirect');
  } else {
    showError('loginError', result.error);
    btn.disabled = false; btn.textContent = 'Sign in';
  }
});

document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const pass  = document.getElementById('regPassword').value;
  const pass2 = document.getElementById('regPassword2').value;
  if (pass !== pass2) { showError('registerError', 'Passwords do not match.'); return; }
  btn.disabled = true; btn.textContent = 'Creating account…';
  const result = await Auth.register(
    document.getElementById('regName').value.trim(),
    document.getElementById('regEmail').value.trim(),
    pass
  );
  if (result.ok) {
    window.location.href = 'profile.html';
  } else {
    showError('registerError', result.error);
    btn.disabled = false; btn.textContent = 'Create account';
  }
});

document.getElementById('forgotPasswordLink')?.addEventListener('click', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  if (email) document.getElementById('resetEmail').value = email;
  showTab('reset');
});

document.getElementById('backToLoginLink')?.addEventListener('click', e => {
  e.preventDefault();
  showTab('login');
});

document.getElementById('sendResetBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('resetEmail').value.trim();
  const errorEl = document.getElementById('resetError');
  const msgEl = document.getElementById('resetMessage');
  if (!email) { showError('resetError', 'Please enter your email address.'); return; }
  const btn = document.getElementById('sendResetBtn');
  btn.disabled = true; btn.textContent = 'Sending…';
  const result = await Auth.resetPassword(email);
  if (result.ok) {
    errorEl.style.display = 'none';
    msgEl.textContent = 'Reset link sent! Check your inbox (and spam folder).';
    msgEl.style.display = '';
    btn.textContent = 'Sent ✓';
  } else {
    showError('resetError', result.error);
    btn.disabled = false; btn.textContent = 'Send reset link';
  }
});

function showTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('loginPanel').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('registerPanel').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('resetPanel').style.display    = tab === 'reset'    ? '' : 'none';
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = ''; }
}
