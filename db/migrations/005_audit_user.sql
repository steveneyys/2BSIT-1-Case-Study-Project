-- S1-DBA-06: make audit_user() record the logged-in user reliably.
--
-- The app logs in with one shared DB account, so every request must tell the
-- database who is acting, inside its own transaction:
--     SELECT set_audit_user('person@example.com');   -- lasts until COMMIT/ROLLBACK
-- audit_user() then returns that name; without it, it falls back to the DB login.

-- Login e-mails can be up to 100 characters, but audit_log.action_by was 50.
ALTER TABLE audit_log ALTER COLUMN action_by TYPE VARCHAR(100);

-- Sets the acting user for the CURRENT TRANSACTION only (true = local), so on a
-- pooled connection one person's name can never leak into another request.
CREATE OR REPLACE FUNCTION set_audit_user(p_username TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    IF p_username IS NULL OR btrim(p_username) = '' THEN
        RAISE EXCEPTION 'set_audit_user: username is required';
    END IF;
    PERFORM set_config('app.username', left(btrim(p_username), 100), true);
END;
$$;

CREATE OR REPLACE FUNCTION audit_user() RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(NULLIF(btrim(current_setting('app.username', true)), ''),
                    session_user::text);
$$;

-- stamp columns hold 60 characters, so the stamp shows at most the first 32
-- characters of the name; audit_log.action_by keeps the full name.
CREATE OR REPLACE FUNCTION audit_stamp(p_action TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT p_action || ' ' || left(audit_user(), 32) || ' ' ||
           to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH12:MI AM');
$$;
