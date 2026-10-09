-- ============================================================================
-- SCRIPT POSTGRESQL: SINKRONISASI MASTER PENGGUNA UNTUK 36 OPD + 10 BIRO
-- PROVINSI PAPUA BARAT (SISTEM e-KASUARI)
--
-- Menjamin setiap OPD & Biro memiliki akun operasional:
-- 1. Admin OPD    (admin.<slug>@ekasuari.test)
-- 2. Akun Utama   (<slug>@ekasuari.test)
-- 3. Operator OPD (operator.<slug>@ekasuari.test)
-- 4. Validator OPD(validator.<slug>@ekasuari.test)
-- 5. Kepala OPD   (kepala.<slug>@ekasuari.test)
-- Default Password: password
-- ============================================================================

BEGIN;

DO $$
DECLARE
    rec RECORD;
    v_slug TEXT;
    v_short TEXT;
    v_user_id BIGINT;
    v_role_admin BIGINT;
    v_role_operator BIGINT;
    v_role_validator BIGINT;
    v_role_kepala BIGINT;
    v_pwd TEXT := '$2y$12$lFSv8w3O/vexmQNnYTr3YOGQ3rn4LW1DvJ44tZNHrH62mIn56yhtG'; -- Hash 'password'
BEGIN
    -- Ambil ID Role
    SELECT id INTO v_role_admin FROM roles WHERE name = 'Admin OPD' LIMIT 1;
    SELECT id INTO v_role_operator FROM roles WHERE name = 'Operator OPD' LIMIT 1;
    SELECT id INTO v_role_validator FROM roles WHERE name = 'Validator OPD' LIMIT 1;
    SELECT id INTO v_role_kepala FROM roles WHERE name = 'Kepala OPD' LIMIT 1;

    -- Iterasi seluruh OPD dan Biro yang aktif
    FOR rec IN 
        SELECT id, code, name, short_name 
        FROM organizations 
        WHERE type != 'province' AND is_active = true 
        ORDER BY id 
    LOOP
        v_short := COALESCE(rec.short_name, rec.name);
        v_slug := LOWER(REPLACE(REPLACE(REPLACE(rec.code, '-PB', ''), 'PROV-', ''), 'SET-', ''));

        -- 1. Akun Admin OPD (admin.<slug>@ekasuari.test)
        INSERT INTO users (name, email, password, job_title, employee_number, is_active, email_verified_at, locale, must_change_password, mfa_enabled, google2fa_enabled, created_at, updated_at)
        VALUES ('Admin ' || v_short, 'admin.' || v_slug || '@ekasuari.test', v_pwd, 'Admin OPD / Pengelola SAKIP ' || v_short, '198501' || LPAD(rec.id::text, 4, '0') || '01', true, NOW(), 'id', false, false, false, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_user_id;

        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM users WHERE email = 'admin.' || v_slug || '@ekasuari.test';
        END IF;

        INSERT INTO organization_user (organization_id, user_id, is_default, created_at, updated_at)
        VALUES (rec.id, v_user_id, true, NOW(), NOW())
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        IF v_role_admin IS NOT NULL THEN
            INSERT INTO role_user (role_id, user_id) VALUES (v_role_admin, v_user_id) ON CONFLICT DO NOTHING;
        END IF;

        -- 2. Akun Operator OPD (operator.<slug>@ekasuari.test)
        INSERT INTO users (name, email, password, job_title, employee_number, is_active, email_verified_at, locale, must_change_password, mfa_enabled, google2fa_enabled, created_at, updated_at)
        VALUES ('Operator ' || v_short, 'operator.' || v_slug || '@ekasuari.test', v_pwd, 'Operator Teknis Kinerja ' || v_short, '199002' || LPAD(rec.id::text, 4, '0') || '02', true, NOW(), 'id', false, false, false, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_user_id;

        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM users WHERE email = 'operator.' || v_slug || '@ekasuari.test';
        END IF;

        INSERT INTO organization_user (organization_id, user_id, is_default, created_at, updated_at)
        VALUES (rec.id, v_user_id, true, NOW(), NOW())
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        IF v_role_operator IS NOT NULL THEN
            INSERT INTO role_user (role_id, user_id) VALUES (v_role_operator, v_user_id) ON CONFLICT DO NOTHING;
        END IF;

        -- 4. Akun Validator OPD (validator.<slug>@ekasuari.test)
        INSERT INTO users (name, email, password, job_title, employee_number, is_active, email_verified_at, locale, must_change_password, mfa_enabled, google2fa_enabled, created_at, updated_at)
        VALUES ('Validator ' || v_short, 'validator.' || v_slug || '@ekasuari.test', v_pwd, 'Validator & Verifikator Kinerja ' || v_short, '198803' || LPAD(rec.id::text, 4, '0') || '03', true, NOW(), 'id', false, false, false, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_user_id;

        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM users WHERE email = 'validator.' || v_slug || '@ekasuari.test';
        END IF;

        INSERT INTO organization_user (organization_id, user_id, is_default, created_at, updated_at)
        VALUES (rec.id, v_user_id, true, NOW(), NOW())
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        IF v_role_validator IS NOT NULL THEN
            INSERT INTO role_user (role_id, user_id) VALUES (v_role_validator, v_user_id) ON CONFLICT DO NOTHING;
        END IF;

        -- 5. Akun Kepala OPD (kepala.<slug>@ekasuari.test)
        INSERT INTO users (name, email, password, job_title, employee_number, is_active, email_verified_at, locale, must_change_password, mfa_enabled, google2fa_enabled, created_at, updated_at)
        VALUES ('Kepala ' || v_short, 'kepala.' || v_slug || '@ekasuari.test', v_pwd, 'Pimpinan Instansi (' || v_short || ')', '197204' || LPAD(rec.id::text, 4, '0') || '04', true, NOW(), 'id', false, false, false, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_user_id;

        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM users WHERE email = 'kepala.' || v_slug || '@ekasuari.test';
        END IF;

        INSERT INTO organization_user (organization_id, user_id, is_default, created_at, updated_at)
        VALUES (rec.id, v_user_id, true, NOW(), NOW())
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        IF v_role_kepala IS NOT NULL THEN
            INSERT INTO role_user (role_id, user_id) VALUES (v_role_kepala, v_user_id) ON CONFLICT DO NOTHING;
        END IF;

    END LOOP;

    -- Hapus tuntas akun alias duplikat yang berformat <slug>@ekasuari.test
    DELETE FROM role_user WHERE user_id IN (
        SELECT id FROM users WHERE email ~ '^[a-z0-9_-]+@ekasuari\.test$' 
        AND email NOT IN ('admin@ekasuari.test', 'pimpinan@ekasuari.test', 'evaluator@ekasuari.test', 'inspektorat@ekasuari.test', 'auditor@ekasuari.test')
    );
    DELETE FROM organization_user WHERE user_id IN (
        SELECT id FROM users WHERE email ~ '^[a-z0-9_-]+@ekasuari\.test$' 
        AND email NOT IN ('admin@ekasuari.test', 'pimpinan@ekasuari.test', 'evaluator@ekasuari.test', 'inspektorat@ekasuari.test', 'auditor@ekasuari.test')
    );
    DELETE FROM users WHERE email ~ '^[a-z0-9_-]+@ekasuari\.test$' 
    AND email NOT IN ('admin@ekasuari.test', 'pimpinan@ekasuari.test', 'evaluator@ekasuari.test', 'inspektorat@ekasuari.test', 'auditor@ekasuari.test');

    -- Hapus akun demo kamar
    DELETE FROM role_user WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%kamar%@ekasuari.test' OR email IN ('admin.opd@ekasuari.test', 'operator.opd@ekasuari.test', 'validator.opd@ekasuari.test', 'kepala.opd@ekasuari.test'));
    DELETE FROM organization_user WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%kamar%@ekasuari.test' OR email IN ('admin.opd@ekasuari.test', 'operator.opd@ekasuari.test', 'validator.opd@ekasuari.test', 'kepala.opd@ekasuari.test'));
    DELETE FROM users WHERE email LIKE '%kamar%@ekasuari.test' OR email IN ('admin.opd@ekasuari.test', 'operator.opd@ekasuari.test', 'validator.opd@ekasuari.test', 'kepala.opd@ekasuari.test');

END $$;

COMMIT;

-- Verifikasi Akun Pengguna per Organisasi:
-- SELECT o.name, COUNT(ou.user_id) as total_users
-- FROM organizations o
-- LEFT JOIN organization_user ou ON o.id = ou.organization_id
-- WHERE o.type != 'province' AND o.is_active = true
-- GROUP BY o.id, o.name
-- ORDER BY o.name;
