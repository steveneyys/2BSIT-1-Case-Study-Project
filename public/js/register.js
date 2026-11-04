'use strict';

const form = document.getElementById('register-form');
const banner = document.getElementById('banner');
const submit = document.getElementById('submit');

const fields = [
  'firstName',
  'lastName',
  'email',
  'password',
  'confirmPassword',
];

function showErrors(errors = {}) {
  for (const field of fields) {
    const errorBox = form.querySelector(`[data-for="${field}"]`);
    errorBox.textContent = errors[field] || '';
    form.elements[field].setAttribute(
      'aria-invalid',
      errors[field] ? 'true' : 'false'
    );
  }
}

function showBanner(kind, text) {
  banner.className = `banner ${kind}`;
  banner.textContent = text;
}

// The verification link redirects back here with one of these query values.
const verified = new URLSearchParams(window.location.search).get('verified');

if (verified === '1') {
  showBanner(
    'ok',
    'Email confirmed. Your account is still Pending until a Superadmin approves it.'
  );
} else if (verified === '0') {
  showBanner(
    'bad',
    'That email confirmation link is invalid, expired, or already used.'
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  showErrors();
  banner.className = 'banner';

  const data = {
    firstName: form.elements.firstName.value.trim(),
    lastName: form.elements.lastName.value.trim(),
    email: form.elements.email.value.trim(),
    // Keep passwords exactly as entered; spaces can be part of a password.
    password: form.elements.password.value,
    confirmPassword: form.elements.confirmPassword.value,
  };

  if (data.password.length < 8) {
    showErrors({ password: 'Password must be at least 8 characters.' });
    return;
  }

  if (data.password !== data.confirmPassword) {
    showErrors({ confirmPassword: 'Passwords do not match.' });
    return;
  }

  submit.disabled = true;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 201) {
      form.reset();

      document.getElementById('done-msg').textContent =
        result.message ||
        'Registration received. Check your email for the confirmation link.';

      document.getElementById('form-view').hidden = true;
      document.getElementById('done').hidden = false;
    } else if (result.errors) {
      showErrors(result.errors);
    } else {
      showBanner(
        'bad',
        result.error || 'Something went wrong. Please try again.'
      );
    }
  } catch {
    showBanner('bad', 'Could not reach the server. Please try again.');
  } finally {
    submit.disabled = false;
  }
});