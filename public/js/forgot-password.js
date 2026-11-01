'use strict';

const form = document.getElementById('forgot-form');
const banner = document.getElementById('banner');
const submit = document.getElementById('submit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  banner.className = 'banner';
  submit.disabled = true;
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.elements.email.value }),
    });
    const json = await res.json().catch(() => ({}));
    banner.className = `banner ${res.ok ? 'ok' : 'bad'}`;
    banner.textContent = json.message || json.error || 'Something went wrong. Please try again.';
    if (res.ok) form.reset();
  } catch {
    banner.className = 'banner bad';
    banner.textContent = 'Could not reach the server. Please try again.';
  } finally {
    submit.disabled = false;
  }
});
