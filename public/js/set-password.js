'use strict';

// Shared by the set-password link (S1-DEV-03) and the reset-password link (S1-DEV-04 can reuse this page).
const form = document.getElementById('set-form');
const banner = document.getElementById('banner');
const submit = document.getElementById('submit');
const token = new URLSearchParams(window.location.search).get('token');

function showErrors(errors = {}) {
  for (const f of ['password', 'confirmPassword']) {
    form.querySelector(`[data-for="${f}"]`).textContent = errors[f] || '';
    form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

if (!token) {
  banner.className = 'banner bad';
  banner.textContent = 'This link is invalid or has expired.';
  submit.disabled = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showErrors();
  banner.className = 'banner';
  submit.disabled = true;
  try {
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password: form.elements.password.value,
        confirmPassword: form.elements.confirmPassword.value,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      banner.className = 'banner ok';
      banner.textContent = json.message;
      form.reset();
      setTimeout(() => { window.location.href = '/login.html'; }, 1500);
      return;
    }
    if (json.errors) showErrors(json.errors);
    else { banner.className = 'banner bad'; banner.textContent = json.error || 'Something went wrong.'; }
  } catch {
    banner.className = 'banner bad';
    banner.textContent = 'Could not reach the server. Please try again.';
  }
  submit.disabled = false;
});
