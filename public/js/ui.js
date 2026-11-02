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
