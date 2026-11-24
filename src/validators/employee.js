'use strict';

const EMPNO_RE = /^[0-9]{5}$/; // empno VARCHAR(5); existing numbers are 00001, 00003, ...

// "Today" in Manila, as YYYY-MM-DD, so a birth date cannot be in the future wherever the server runs.
const manilaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// A real calendar date written as YYYY-MM-DD (so 2026-02-30 is refused). Returns the text, '' for empty, or null if invalid.
function parseDate(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const same = d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  return same && Number(m[1]) >= 1900 ? text : null;
}

// Limits match the database columns: lastName/firstName VARCHAR(15), gender M or F.
// `needEmpno` is true on Add (the person types the number); on Edit the number comes from the address, never the body.
function validateEmployee(body = {}, { needEmpno = false, today = manilaToday() } = {}) {
  const errors = {};
  const empno = String(body.empno ?? '').trim();
  const lastname = String(body.lastname ?? '').trim();
  const firstname = String(body.firstname ?? '').trim();
  const gender = String(body.gender ?? '').trim().toUpperCase();
  const birth = parseDate(body.birthdate);
  const hire = parseDate(body.hiredate);
  const sep = parseDate(body.sepdate);

  if (needEmpno) {
    if (!empno) errors.empno = 'Enter the employee number.';
    else if (!EMPNO_RE.test(empno)) errors.empno = 'Use exactly 5 digits, for example 00015.';
  }
  if (!lastname) errors.lastname = 'Enter the last name.';
  else if (lastname.length > 15) errors.lastname = 'Last name must be 15 characters or fewer.';
  if (!firstname) errors.firstname = 'Enter the first name.';
  else if (firstname.length > 15) errors.firstname = 'First name must be 15 characters or fewer.';
  if (!gender) errors.gender = 'Choose a gender.';
  else if (gender !== 'M' && gender !== 'F') errors.gender = 'Gender must be M or F.';

  if (birth === '') errors.birthdate = 'Enter the birth date.';
  else if (birth === null) errors.birthdate = 'Enter a real date as YYYY-MM-DD.';
  else if (birth > today) errors.birthdate = 'Birth date cannot be in the future.';

  if (hire === '') errors.hiredate = 'Enter the hire date.';
  else if (hire === null) errors.hiredate = 'Enter a real date as YYYY-MM-DD.';
  else if (birth && !errors.birthdate && hire <= birth) errors.hiredate = 'Hire date must be after the birth date.';

  if (sep === null) errors.sepdate = 'Enter a real date as YYYY-MM-DD, or leave it empty.';
  else if (sep && hire && !errors.hiredate && sep < hire) errors.sepdate = 'Separation date cannot be before the hire date.';

  return {
    errors,
    value: {
      ...(needEmpno ? { empno } : {}),
      lastname, firstname, gender,
      birthdate: birth || null, hiredate: hire || null, sepdate: sep || null,
    },
  };
}

module.exports = { validateEmployee, parseDate, EMPNO_RE };
