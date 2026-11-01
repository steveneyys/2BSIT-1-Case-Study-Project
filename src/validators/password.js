'use strict';

// Shared by register (DEV-02), set-password (DEV-03) and reset (DEV-04).
function validatePassword(password, confirmPassword) {
  const errors = {};
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (password.length > 128) errors.password = 'Password must be 128 characters or fewer.';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must include at least one letter and one number.';
  }
  if (!errors.password && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

module.exports = { validatePassword };
