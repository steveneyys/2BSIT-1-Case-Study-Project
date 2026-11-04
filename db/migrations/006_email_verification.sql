ALTER TABLE app_user
ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Treat existing accounts as verified so this feature does not lock them out.
UPDATE app_user
SET email_verified_at = COALESCE(created_at, now())
WHERE email_verified_at IS NULL;

CREATE TABLE email_verification_token (
    token_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES app_user(user_id),
    token_hash CHAR(64)     NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX email_verification_token_user_idx
ON email_verification_token (user_id);