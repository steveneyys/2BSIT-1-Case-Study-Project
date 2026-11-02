'use strict';

const form = document.getElementById('register-form');
const banner = document.getElementById('banner');
const submit = document.getElementById('submit');
const fields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];

function showErrors(errors = {}) {
  for (const f of fields) {
    form.querySelector(`[data-for="${f}"]`).textContent = errors[f] || '';
    form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function showBanner(kind, text) {
  banner.className = `banner ${kind}`;
  banner.textContent = text; // textContent, never innerHTML: no XSS from server text
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showErrors();
  banner.className = 'banner';

  const data = Object.fromEntries(fields.map((f) => [f, form.elements[f].value]));
  if (data.password !== data.confirmPassword) {
    showErrors({ confirmPassword: 'Passwords do not match.' });
    return;
  }

  submit.disabled = true;
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 201) {
      form.reset();
      if (json.message) document.getElementById('done-msg').textContent = json.message;
      document.getElementById('form-view').hidden = true;
      document.getElementById('done').hidden = false;
    } else if (json.errors) {
      showErrors(json.errors);
    } else {
      showBanner('bad', json.error || 'Something went wrong. Please try again.');
    }
  } catch {
    showBanner('bad', 'Could not reach the server. Please try again.');
  } finally {
    submit.disabled = false;
  }
});
