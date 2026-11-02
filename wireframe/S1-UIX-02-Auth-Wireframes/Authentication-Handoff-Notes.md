# Authentication – Handoff Notes (S1-UIX-02)

> Companion notes. Not part of the product UI.

## 1. Traceability
S1-UIX-02; Student Guide §1.2, §3 and §4.2.

## 2. Registration
- Register asks for First name, Last name and Email address only. No password at registration.
- Creates a User with status Pending and empty rights. No implicit access.
- A Superadmin approves first. Only after approval does the user set a password on first login.

## 3. What is simulated in the wireframes
- Authentication, Google sign-in and email delivery are simulated in Figma.
- "Any password works" and auto-creating unknown users are prototype-only. Do NOT build them.
- Google sign-in must not bypass approval.

## 4. Backend requirements
- Salted password hashing and verification.
- Throttle repeated failed logins.
- Reset token: expiring and single-use.
- Validate required fields, email format and exact match of password confirmation.
- Not yet decided (TBD): token expiry duration, password policy, Remember me duration.
  No fixed 8-character rule was invented.

## 5. Sign-in behavior
- Pending, Blocked and Disapproved accounts cannot sign in.
- Recovery confirmation is generic and never reveals whether an account exists.
- Keep form values when an error is shown.
- Show/Hide toggles password visibility.

## 6. Roles
- Only three roles: Superadmin, Admin, User.
- "CEO" is a demo identity (Michael Reyes), not a fourth role.
- Plan: only a Superadmin approves accounts.

## 7. Security
- The backend must check authorization on every request and filter rows and sensitive fields.
- Hiding UI in the static Figma does not implement security.

## Open decisions (need team confirmation)
| # | Question | Owner |
|---|---|---|
| 1 | Can Admin approve users, or Superadmin only? The HTML prototype conflicts with the plan. | Scrum Master / Developer |
| 2 | Token expiry (reset and set-password) | Developer |
| 3 | Password policy | Team |
| 4 | Remember me duration | Team |
