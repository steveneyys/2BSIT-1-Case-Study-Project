'use strict';

// Google sign-in / sign-up. The button comes from Google (it cannot be restyled); the server verifies the
// result and never lets Google skip approval: new people become Pending, Blocked/Pending accounts are refused.
(async () => {
  const box = document.getElementById('google');
  const banner = document.getElementById('banner');
  if (!box) return;

  let clientId = null;
  try {
    const res = await fetch('/api/auth/google-config');
    clientId = (await res.json()).clientId;
  } catch { /* leave the button hidden */ }
  if (!clientId) return; // Google sign-in is not configured: show nothing

  function say(kind, text) {
    banner.className = `banner ${kind}`;
    banner.textContent = text;
  }

  async function onCredential(response) {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { window.location.href = '/home.html'; return; }
      say(json.code === 'pending' ? 'warn' : 'bad', json.error || 'Google sign-in failed. Please try again.');
    } catch {
      say('bad', 'Could not reach the server. Please try again.');
    }
  }

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = () => {
    window.google.accounts.id.initialize({ client_id: clientId, callback: onCredential });
    const form = document.querySelector('form');
    window.google.accounts.id.renderButton(document.getElementById('google-btn'), {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: box.dataset.mode === 'register' ? 'signup_with' : 'signin_with',
      width: Math.min(form ? form.clientWidth : 320, 400),
    });
    box.hidden = false;
  };
  script.onerror = () => { /* offline or blocked: the normal form still works */ };
  document.head.append(script);
})();
