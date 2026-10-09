-- ============================================================================
-- SCRIPT RESET STRUKTUR SATU OPD (RUMAH BESAR OPD)
-- SISTEM e-KASUARI
--
-- Struktur:
-- OPD (root, type = 'opd')
--  ├── Sekretariat (type = 'sekretariat', parent_id = root)
--  ├── Bidang Tata Kelola E-Government (type = 'bidang', parent_id = root)
--  ├── Bidang Informasi & Komunikasi Publik (type = 'bidang', parent_id = root)
--  ├── Bidang Persandian & Keamanan Informasi (type = 'bidang', parent_id = root)
--  └── Bidang Statistik Sektoral (type = 'bidang', parent_id = root)
-- ============================================================================

BEGIN;

-- 1. Bersihkan relasi organisasi
DELETE FROM organization_user;
DELETE FROM organization_units;
DELETE FROM organizations;

-- 2. Insert OPD Induk (Root)
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, created_at, updated_at)
VALUES (1, 'OPD-INDUK', 'Dinas Komunikasi, Informatika, Persandian dan Statistik', 'Diskominfoperstatik', 'opd', NULL, true, NOW(), NOW());

-- 3. Insert Sekretariat
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, created_at, updated_at)
VALUES (2, 'OPD-SEKRETARIAT', 'Sekretariat Dinas', 'Sekretariat', 'sekretariat', 1, true, NOW(), NOW());

-- 4. Insert Bidang-bidang Teknis
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, created_at, updated_at) VALUES
(3, 'OPD-BIDANG-EGOV', 'Bidang Tata Kelola E-Government', 'Bidang E-Gov', 'bidang', 1, true, NOW(), NOW()),
(4, 'OPD-BIDANG-IKP',  'Bidang Informasi dan Komunikasi Publik', 'Bidang IKP', 'bidang', 1, true, NOW(), NOW()),
(5, 'OPD-BIDANG-SANDI', 'Bidang Persandian dan Keamanan Informasi', 'Bidang Sandi', 'bidang', 1, true, NOW(), NOW()),
(6, 'OPD-BIDANG-STAT',  'Bidang Statistik Sektoral', 'Bidang Statistik', 'bidang', 1, true, NOW(), NOW());

COMMIT;
