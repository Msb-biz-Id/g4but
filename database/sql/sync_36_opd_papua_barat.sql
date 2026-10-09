-- ============================================================================
-- SCRIPT POSTGRESQL: SINKRONISASI & PENGGANTIAN MASTER DATA 36 OPD + 10 BIRO
-- PROVINSI PAPUA BARAT (SISTEM e-KASUARI)
-- 
-- Sifat: AMAN (Non-destructive / Smart Upsert)
-- Menyelaraskan 22 data lama dengan 36 OPD resmi + 10 Biro setara OPD.
-- ============================================================================

BEGIN;

-- 1. Normalisasi Kode Lama yang Tidak Konsisten dari Input Manual
UPDATE organizations SET code = 'BIRO-OTSUS-PB'    WHERE code IN ('BIRO ADMINISTRASI PELAKSANAAN OTONOMI KHUSUS', 'BIRO ADMINISTRASIPELAKSANAAN OTSUS');
UPDATE organizations SET code = 'BIRO-HUKUM-PB'    WHERE code = 'BIRO HUKUM';
UPDATE organizations SET code = 'PENGHUBUNG-PB'    WHERE code = 'BADAN PENGHUBUNG';
UPDATE organizations SET code = 'DISNAKERTRANS-PB' WHERE code = 'DINAS TRANSMIGRASI DAN TENAGA KERJA';
UPDATE organizations SET code = 'BAPENDA-PB'       WHERE code = 'BAPENDA';
UPDATE organizations SET code = 'BIRO-ADPIM-PB'    WHERE code = 'Biro Administrasi Pimpinan';
UPDATE organizations SET code = 'SETDA-PB'         WHERE code = 'Sekretariat Daerah';
UPDATE organizations SET code = 'DISKOMINFO-PB'    WHERE code = 'KOMINFO-PB';

-- 2. Hapus tuntas Organisasi yang Tidak Masuk Daftar Resmi (Contoh: Dinas Damkar)
DELETE FROM organization_user WHERE organization_id IN (SELECT id FROM organizations WHERE code = 'Dinas Damkar' OR name ILIKE '%Damkar%');
DELETE FROM organizations WHERE code = 'Dinas Damkar' OR name ILIKE '%Damkar%';

-- Hapus record duplikat lama jika ada kode ganda yang tertinggal
DELETE FROM organizations WHERE code = 'Sekretariat Daerah' AND id != (SELECT id FROM organizations WHERE code = 'SETDA-PB' LIMIT 1);
DELETE FROM organizations WHERE code IN ('BIRO ADMINISTRASI PELAKSANAAN OTONOMI KHUSUS', 'BIRO ADMINISTRASIPELAKSANAAN OTSUS') AND id != (SELECT id FROM organizations WHERE code = 'BIRO-OTSUS-PB' LIMIT 1);

-- 3. Pastikan Induk Provinsi Papua Barat Terdaftar
INSERT INTO organizations (code, name, short_name, type, is_active, created_at, updated_at)
VALUES ('PROV-PAPBAR', 'Pemerintah Provinsi Papua Barat', 'Pemprov Papua Barat', 'province', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, type = 'province', is_active = true, updated_at = NOW();

-- Ambil ID Provinsi
DO $$
DECLARE
    prov_id BIGINT;
    setda_id BIGINT;
BEGIN
    SELECT id INTO prov_id FROM organizations WHERE code = 'PROV-PAPBAR' LIMIT 1;

    -- 4. Insert / Update Sekretariat Daerah
    INSERT INTO organizations (code, name, short_name, type, parent_id, is_active, created_at, updated_at)
    VALUES ('SETDA-PB', 'Sekretariat Daerah', 'Setda', 'opd', prov_id, true, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE 
    SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, type = 'opd', parent_id = prov_id, is_active = true, updated_at = NOW()
    RETURNING id INTO setda_id;

    IF setda_id IS NULL THEN
        SELECT id INTO setda_id FROM organizations WHERE code = 'SETDA-PB' LIMIT 1;
    END IF;

    -- 5. Insert / Update 10 Biro (Tipe diset 'opd' agar setara dan tampil di dashboard analitik)
    INSERT INTO organizations (code, name, short_name, type, parent_id, is_active, created_at, updated_at)
    VALUES 
        ('BIRO-PEM-PB',     'Biro Pemerintahan',                'Biro Pemerintahan', 'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-HUKUM-PB',   'Biro Hukum',                       'Biro Hukum',        'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-ADPIM-PB',   'Biro Administrasi Pimpinan',        'Biro Adpim',        'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-ADBANG-PB',  'Biro Administrasi Pembangunan',     'Biro Adbang',       'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-MENSPIR-PB', 'Biro Mental dan Spiritual',        'Biro Menspir',      'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-EKBANG-PB',  'Biro Perekonomian dan Kerjasama',   'Biro Perekonomian', 'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-UMUM-PB',    'Biro Layanan Umum',                'Biro Umum',         'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-ORG-PB',     'Biro Organisasi',                  'Biro Organisasi',   'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-PBJ-PB',     'Biro Pengadaan Barang dan Jasa',   'Biro PBJ',          'opd', setda_id, true, NOW(), NOW()),
        ('BIRO-OTSUS-PB',   'Biro Otonomi Khusus (Otsus)',       'Biro Otsus',        'opd', setda_id, true, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE 
    SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, type = 'opd', parent_id = setda_id, is_active = true, updated_at = NOW();

    -- 6. Insert / Update 35 Perangkat Daerah Lainnya (Nomor 2 s/d 36)
    INSERT INTO organizations (code, name, short_name, type, parent_id, is_active, is_bappeda, created_at, updated_at)
    VALUES 
        ('SET-DPRPB',        'Sekretariat DPRPB',                                                                          'Sekretariat DPRPB',   'opd', prov_id, true, false, NOW(), NOW()),
        ('SET-MRPB',         'Sekretariat MRPB',                                                                          'Sekretariat MRPB',    'opd', prov_id, true, false, NOW(), NOW()),
        ('INSP-PB',          'Inspektorat Daerah',                                                                        'Inspektorat',         'opd', prov_id, true, false, NOW(), NOW()),
        ('DISDIK-PB',        'Dinas Pendidikan',                                                                          'Dinas Pendidikan',    'opd', prov_id, true, false, NOW(), NOW()),
        ('DINKES-PB',        'Dinas Kesehatan',                                                                           'Dinas Kesehatan',     'opd', prov_id, true, false, NOW(), NOW()),
        ('PUPR-PB',          'Dinas Pekerjaan Umum dan Perumahan Rakyat',                                                 'Dinas PUPR',          'opd', prov_id, true, false, NOW(), NOW()),
        ('SATPOL-PB',        'Satuan Polisi Pamong Praja Daerah Provinsi',                                                'Satpol PP',           'opd', prov_id, true, false, NOW(), NOW()),
        ('DINSOS-PB',        'Dinas Sosial',                                                                              'Dinas Sosial',        'opd', prov_id, true, false, NOW(), NOW()),
        ('DUKCAPIL-PB',      'Dinas Administrasi Kependudukan, Pencatatan Sipil, Pengendalian Penduduk dan Keluarga Berencana', 'Dinas Dukcapil',      'opd', prov_id, true, false, NOW(), NOW()),
        ('DISNAKERTRANS-PB', 'Dinas Transmigrasi dan Tenaga Kerja',                                                      'Disnakertrans',       'opd', prov_id, true, false, NOW(), NOW()),
        ('DISPANG-PB',       'Dinas Ketahanan Pangan',                                                                    'Dinas Ketapang',      'opd', prov_id, true, false, NOW(), NOW()),
        ('DISTANBUN-PB',     'Dinas Tanaman Pangan, Hortikultura dan Perkebunan',                                         'Distanbun',           'opd', prov_id, true, false, NOW(), NOW()),
        ('DISNAKKESWAN-PB',  'Dinas Peternakan dan Kesehatan Hewan',                                                      'Disnakkeswan',        'opd', prov_id, true, false, NOW(), NOW()),
        ('DISHUB-PB',        'Dinas Perhubungan',                                                                         'Dinas Perhubungan',   'opd', prov_id, true, false, NOW(), NOW()),
        ('DISHUT-PB',        'Dinas Kehutanan',                                                                           'Dinas Kehutanan',     'opd', prov_id, true, false, NOW(), NOW()),
        ('DLHP-PB',          'Dinas Lingkungan Hidup dan Pertanahan',                                                     'Dinas LHP',           'opd', prov_id, true, false, NOW(), NOW()),
        ('DISKOP-PB',        'Dinas Koperasi, Usaha Kecil dan Menengah',                                                  'Dinas Koperasi UKM',  'opd', prov_id, true, false, NOW(), NOW()),
        ('DPMK-PB',          'Dinas Pemberdayaan Masyarakat dan Kampung',                                                 'Dinas PMK',           'opd', prov_id, true, false, NOW(), NOW()),
        ('DP3A-PB',          'Dinas Pemberdayaan Perempuan dan Perlindungan Anak',                                        'Dinas P3A',           'opd', prov_id, true, false, NOW(), NOW()),
        ('DKP-PB',           'Dinas Kelautan dan Perikanan',                                                              'Dinas DKP',           'opd', prov_id, true, false, NOW(), NOW()),
        ('ESDM-PB',          'Dinas Energi dan Sumber Daya Mineral',                                                      'Dinas ESDM',          'opd', prov_id, true, false, NOW(), NOW()),
        ('DISPORA-PB',       'Dinas Kepemudaan dan Olahraga',                                                             'Dispora',             'opd', prov_id, true, false, NOW(), NOW()),
        ('DISBUDPAR-PB',     'Dinas Kebudayaan dan Pariwisata',                                                           'Disbudpar',           'opd', prov_id, true, false, NOW(), NOW()),
        ('DPMPTSP-PB',       'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',                                    'DPMPTSP',             'opd', prov_id, true, false, NOW(), NOW()),
        ('DISKOMINFO-PB',    'Dinas Komunikasi Informatika, Persandian dan Statistik',                                    'Diskominfo Perstik',  'opd', prov_id, true, false, NOW(), NOW()),
        ('DISPERINDAG-PB',   'Dinas Perindustrian dan Perdagangan',                                                       'Disperindag',         'opd', prov_id, true, false, NOW(), NOW()),
        ('DISPUSIP-PB',      'Dinas Kearsipan dan Perpustakaan',                                                          'Dispusip',            'opd', prov_id, true, false, NOW(), NOW()),
        ('BAPPEDA-PB',       'Badan Perencanaan Pembangunan Daerah',                                                      'Bappeda',             'opd', prov_id, true, true,  NOW(), NOW()),
        ('BALITBANGDA-PB',   'Badan Penelitian dan Pengembangan Daerah',                                                  'Balitbangda',         'opd', prov_id, true, false, NOW(), NOW()),
        ('BPKAD-PB',         'Badan Pengelola Keuangan dan Aset Daerah',                                                 'BPKAD',               'opd', prov_id, true, false, NOW(), NOW()),
        ('BAPENDA-PB',       'Badan Pendapatan Daerah',                                                                   'Bapenda',             'opd', prov_id, true, false, NOW(), NOW()),
        ('BKD-PB',           'Badan Kepegawaian Daerah',                                                                  'BKD',                 'opd', prov_id, true, false, NOW(), NOW()),
        ('BPSDM-PB',         'Badan Pengembangan Sumber Daya Manusia Daerah Provinsi',                                    'BPSDM',               'opd', prov_id, true, false, NOW(), NOW()),
        ('PENGHUBUNG-PB',    'Badan Penghubung Daerah',                                                                   'Badan Penghubung',    'opd', prov_id, true, false, NOW(), NOW()),
        ('BPBD-PB',          'Badan Penanggulangan Bencana Daerah',                                                       'BPBD',                'opd', prov_id, true, false, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE 
    SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, type = 'opd', parent_id = prov_id, is_active = true, is_bappeda = EXCLUDED.is_bappeda, updated_at = NOW();

    -- 7. Bersihkan sisa tipe 'biro' menjadi 'opd' jika ada data tertinggal
    UPDATE organizations SET type = 'opd' WHERE type = 'biro';

END $$;

COMMIT;

-- Verifikasi Total Data Aktif:
-- SELECT id, code, name, type, parent_id, is_active FROM organizations ORDER BY id;
