-- S1-DBA-03: users, roles, modules, rights catalogue, user permissions
-- Reuses the trigger functions created in 001 (stamp, audit, hard-delete block).

-- 1. Lookup tables ------------------------------------------------------
CREATE TABLE role (
    role_code   VARCHAR(12) PRIMARY KEY,
    description VARCHAR(100) NOT NULL
);

CREATE TABLE module (
    module_code VARCHAR(12) PRIMARY KEY,
    module_name VARCHAR(40) NOT NULL,
    sort_order  SMALLINT    NOT NULL
);

CREATE TABLE right_catalog (
    right_code  VARCHAR(30) PRIMARY KEY,
    module_code VARCHAR(12) NOT NULL REFERENCES module(module_code),
    description VARCHAR(60) NOT NULL,
    sort_order  SMALLINT    NOT NULL
);

-- 2. Users --------------------------------------------------------------
CREATE TABLE app_user (
    user_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL,
    password_hash   TEXT,                                   -- NULL until the first password is set
    role_code       VARCHAR(12)  NOT NULL DEFAULT 'user' REFERENCES role(role_code),
    is_blocked      BOOLEAN      NOT NULL DEFAULT FALSE,    -- blocked users cannot sign in
    approval_status VARCHAR(10)  NOT NULL DEFAULT 'pending'
                    CHECK (approval_status IN ('pending', 'active')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
    stamp           VARCHAR(60)
);

-- one email per live account, ignoring upper/lower case
CREATE UNIQUE INDEX app_user_email_uq ON app_user (lower(email)) WHERE NOT is_deleted;

-- 3. Which rights a user has (soft delete, so un-ticking keeps history) --
CREATE TABLE user_permission (
    user_id    BIGINT      NOT NULL REFERENCES app_user(user_id),
    right_code VARCHAR(30) NOT NULL REFERENCES right_catalog(right_code),
    is_deleted BOOLEAN     NOT NULL DEFAULT FALSE,
    stamp      VARCHAR(60),
    PRIMARY KEY (user_id, right_code)
);

-- 4. Audit log for app_user WITHOUT the password hash -------------------
-- (the generic trg_audit_log would copy password_hash into audit_log)
CREATE OR REPLACE FUNCTION trg_audit_log_app_user() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_action TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES (TG_TABLE_NAME, 'ADD', NEW.user_id::text, NULL,
                to_jsonb(NEW) - 'password_hash', audit_user());
    ELSE
        IF (to_jsonb(OLD) - 'stamp') = (to_jsonb(NEW) - 'stamp') THEN
            RETURN NULL;                                    -- nothing changed
        END IF;
        v_action := CASE
                      WHEN NOT OLD.is_deleted AND NEW.is_deleted THEN 'DELETE'
                      WHEN OLD.is_deleted AND NOT NEW.is_deleted THEN 'RESTORE'
                      ELSE 'EDIT'
                    END;
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES (TG_TABLE_NAME, v_action, NEW.user_id::text,
                to_jsonb(OLD) - 'password_hash', to_jsonb(NEW) - 'password_hash', audit_user());
    END IF;
    RETURN NULL;
END;
$$;

-- 5. Attach the same protections as the HOPE tables ---------------------
CREATE TRIGGER app_user_biu_stamp BEFORE INSERT OR UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER app_user_bd_block BEFORE DELETE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER app_user_bt_block BEFORE TRUNCATE ON app_user
    FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER app_user_aiu_audit AFTER INSERT OR UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_audit_log_app_user();

CREATE TRIGGER user_permission_biu_stamp BEFORE INSERT OR UPDATE ON user_permission
    FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER user_permission_bd_block BEFORE DELETE ON user_permission
    FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER user_permission_bt_block BEFORE TRUNCATE ON user_permission
    FOR EACH STATEMENT EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER user_permission_aiu_audit AFTER INSERT OR UPDATE ON user_permission
    FOR EACH ROW EXECUTE FUNCTION trg_audit_log('user_id', 'right_code');

-- 6. Same "_active" views as the other tables ---------------------------
CREATE VIEW app_user_active        AS SELECT * FROM app_user        WHERE NOT is_deleted;
CREATE VIEW user_permission_active AS SELECT * FROM user_permission WHERE NOT is_deleted;
