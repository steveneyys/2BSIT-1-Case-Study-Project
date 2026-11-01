-- DRAFT for S1-DEV-03 only. The official migration is S1-DBA-04 (DB Admin).
-- If the DB Admin's table differs, update src/repositories/userRepo.js to match, then delete this file.
CREATE TABLE IF NOT EXISTS password_token (
  token_id   BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES app_user (user_id),
  token_hash CHAR(64)    NOT NULL UNIQUE,   -- SHA-256 hex of the emailed token; never store the raw token
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
