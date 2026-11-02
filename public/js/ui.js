'use strict';

// Show / Hide toggle for password fields (S1-UIX-02).
document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${btn.getAttribute('aria-label').replace(/^(Show|Hide) /, '')}`);
  });
});

// Pause / resume background motion on landing and auth pages.
if (document.querySelector('.bg')) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'motion-toggle';
  let off = false;
  try { off = localStorage.getItem('hope-motion') === 'off'; } catch { /* storage unavailable */ }
  const apply = () => {
    document.body.classList.toggle('motion-off', off);
    btn.textContent = off ? 'Resume motion' : 'Pause motion';
    btn.setAttribute('aria-pressed', String(off));
  };
  btn.addEventListener('click', () => {
    off = !off;
    try { localStorage.setItem('hope-motion', off ? 'off' : 'on'); } catch { /* ignore */ }
    apply();
  });
  apply();
  const foot = document.querySelector('.auth-foot');
  (foot || document.body).append(btn);
}
