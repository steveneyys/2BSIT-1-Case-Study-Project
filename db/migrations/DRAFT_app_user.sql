-- DRAFT for S1-DEV-02 only. The official migration is S1-DBA-03 (DB Admin).
-- If the DB Admin's table differs, update src/repositories/userRepo.js to match, then delete this file.
CREATE TABLE IF NOT EXISTS app_user (
  user_id       BIGSERIAL PRIMARY KEY,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT,                                   -- NULL until set (seeded accounts use a set-password link)
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin','admin','user')),
  is_blocked    BOOLEAN      NOT NULL DEFAULT FALSE,
  status        VARCHAR(10)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Case-insensitive unique email (registration lowercases, but enforce it in the DB too).
CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_uq ON app_user (lower(email));
