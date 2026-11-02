-- S1-DBA-04: one-time tokens for "reset password" and "set first password"
-- Only the HASH of a token is stored. The raw token exists only in the e-mailed link.
CREATE TABLE password_token (
    token_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES app_user(user_id),
    token_hash CHAR(64)     NOT NULL UNIQUE,               -- sha256 hex of the raw token
    purpose    VARCHAR(14)  NOT NULL CHECK (purpose IN ('reset', 'first_password')),
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,                                -- NULL = not used yet
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX password_token_user_idx ON password_token (user_id);

-- A token is usable only if used_at IS NULL and expires_at > now()
CREATE VIEW password_token_valid AS
SELECT * FROM password_token WHERE used_at IS NULL AND expires_at > now();
