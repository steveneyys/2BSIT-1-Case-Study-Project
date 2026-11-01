'use strict';

const form = document.getElementById('login-form');
const banner = document.getElementById('banner');
const submit = document.getElementById('submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  banner.className = 'banner';
  submit.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.elements.email.value, password: form.elements.password.value }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = '/home.html';
      return;
    }
    banner.className = 'banner bad';
    banner.textContent = json.error || 'Something went wrong. Please try again.';
  } catch {
    banner.className = 'banner bad';
    banner.textContent = 'Could not reach the server. Please try again.';
  } finally {
    submit.disabled = false;
  }
});
