-- ============================================================================
-- SCRIPT POSTGRESQL: RESET TOTAL & GANTI 100% DATA MASTER DENGAN 36 OPD LENGKAP
-- PROVINSI PAPUA BARAT (SISTEM e-KASUARI)
--
-- PERHATIAN: Script ini menggunakan TRUNCATE CASCADE.
-- Gunakan hanya jika Anda ingin mengosongkan organisasi simulasi lama dan
-- mengisi ulang secara bersih (ID rapi berurutan).
-- ============================================================================

BEGIN;

-- 1. Kosongkan tabel organisasi dan tabel pivot pengguna terkait
TRUNCATE TABLE organization_user CASCADE;
TRUNCATE TABLE organization_units CASCADE;
TRUNCATE TABLE organizations RESTART IDENTITY CASCADE;

-- 2. Insert Induk Provinsi (ID: 1)
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, is_bappeda, created_at, updated_at)
VALUES (1, 'PROV-PAPBAR', 'Pemerintah Provinsi Papua Barat', 'Pemprov Papua Barat', 'province', NULL, true, false, NOW(), NOW());

-- 3. Insert 1. Sekretariat Daerah (ID: 2)
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, is_bappeda, created_at, updated_at)
VALUES (2, 'SETDA-PB', 'Sekretariat Daerah', 'Setda', 'opd', 1, true, false, NOW(), NOW());

-- 4. Insert 10 Biro Sekretariat Daerah (Setara OPD -> type: 'opd') (ID: 3 - 12)
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, is_bappeda, created_at, updated_at) VALUES
(3,  'BIRO-PEM-PB',     'Biro Pemerintahan',                'Biro Pemerintahan', 'opd', 2, true, false, NOW(), NOW()),
(4,  'BIRO-HUKUM-PB',   'Biro Hukum',                       'Biro Hukum',        'opd', 2, true, false, NOW(), NOW()),
(5,  'BIRO-ADPIM-PB',   'Biro Administrasi Pimpinan',        'Biro Adpim',        'opd', 2, true, false, NOW(), NOW()),
(6,  'BIRO-ADBANG-PB',  'Biro Administrasi Pembangunan',     'Biro Adbang',       'opd', 2, true, false, NOW(), NOW()),
(7,  'BIRO-MENSPIR-PB', 'Biro Mental dan Spiritual',        'Biro Menspir',      'opd', 2, true, false, NOW(), NOW()),
(8,  'BIRO-EKBANG-PB',  'Biro Perekonomian dan Kerjasama',   'Biro Perekonomian', 'opd', 2, true, false, NOW(), NOW()),
(9,  'BIRO-UMUM-PB',    'Biro Layanan Umum',                'Biro Umum',         'opd', 2, true, false, NOW(), NOW()),
(10, 'BIRO-ORG-PB',     'Biro Organisasi',                  'Biro Organisasi',   'opd', 2, true, false, NOW(), NOW()),
(11, 'BIRO-PBJ-PB',     'Biro Pengadaan Barang dan Jasa',   'Biro PBJ',          'opd', 2, true, false, NOW(), NOW()),
(12, 'BIRO-OTSUS-PB',   'Biro Otonomi Khusus (Otsus)',       'Biro Otsus',        'opd', 2, true, false, NOW(), NOW());

-- 5. Insert 35 OPD Lainnya (ID: 13 - 47)
INSERT INTO organizations (id, code, name, short_name, type, parent_id, is_active, is_bappeda, created_at, updated_at) VALUES
(13, 'SET-DPRPB',        'Sekretariat DPRPB',                                                                          'Sekretariat DPRPB',   'opd', 1, true, false, NOW(), NOW()),
(14, 'SET-MRPB',         'Sekretariat MRPB',                                                                          'Sekretariat MRPB',    'opd', 1, true, false, NOW(), NOW()),
(15, 'INSP-PB',          'Inspektorat Daerah',                                                                        'Inspektorat',         'opd', 1, true, false, NOW(), NOW()),
(16, 'DISDIK-PB',        'Dinas Pendidikan',                                                                          'Dinas Pendidikan',    'opd', 1, true, false, NOW(), NOW()),
(17, 'DINKES-PB',        'Dinas Kesehatan',                                                                           'Dinas Kesehatan',     'opd', 1, true, false, NOW(), NOW()),
(18, 'PUPR-PB',          'Dinas Pekerjaan Umum dan Perumahan Rakyat',                                                 'Dinas PUPR',          'opd', 1, true, false, NOW(), NOW()),
(19, 'SATPOL-PB',        'Satuan Polisi Pamong Praja Daerah Provinsi',                                                'Satpol PP',           'opd', 1, true, false, NOW(), NOW()),
(20, 'DINSOS-PB',        'Dinas Sosial',                                                                              'Dinas Sosial',        'opd', 1, true, false, NOW(), NOW()),
(21, 'DUKCAPIL-PB',      'Dinas Administrasi Kependudukan, Pencatatan Sipil, Pengendalian Penduduk dan Keluarga Berencana', 'Dinas Dukcapil',      'opd', 1, true, false, NOW(), NOW()),
(22, 'DISNAKERTRANS-PB', 'Dinas Transmigrasi dan Tenaga Kerja',                                                      'Disnakertrans',       'opd', 1, true, false, NOW(), NOW()),
(23, 'DISPANG-PB',       'Dinas Ketahanan Pangan',                                                                    'Dinas Ketapang',      'opd', 1, true, false, NOW(), NOW()),
(24, 'DISTANBUN-PB',     'Dinas Tanaman Pangan, Hortikultura dan Perkebunan',                                         'Distanbun',           'opd', 1, true, false, NOW(), NOW()),
(25, 'DISNAKKESWAN-PB',  'Dinas Peternakan dan Kesehatan Hewan',                                                      'Disnakkeswan',        'opd', 1, true, false, NOW(), NOW()),
(26, 'DISHUB-PB',        'Dinas Perhubungan',                                                                         'Dinas Perhubungan',   'opd', 1, true, false, NOW(), NOW()),
(27, 'DISHUT-PB',        'Dinas Kehutanan',                                                                           'Dinas Kehutanan',     'opd', 1, true, false, NOW(), NOW()),
(28, 'DLHP-PB',          'Dinas Lingkungan Hidup dan Pertanahan',                                                     'Dinas LHP',           'opd', 1, true, false, NOW(), NOW()),
(29, 'DISKOP-PB',        'Dinas Koperasi, Usaha Kecil dan Menengah',                                                  'Dinas Koperasi UKM',  'opd', 1, true, false, NOW(), NOW()),
(30, 'DPMK-PB',          'Dinas Pemberdayaan Masyarakat dan Kampung',                                                 'Dinas PMK',           'opd', 1, true, false, NOW(), NOW()),
(31, 'DP3A-PB',          'Dinas Pemberdayaan Perempuan dan Perlindungan Anak',                                        'Dinas P3A',           'opd', 1, true, false, NOW(), NOW()),
(32, 'DKP-PB',           'Dinas Kelautan dan Perikanan',                                                              'Dinas DKP',           'opd', 1, true, false, NOW(), NOW()),
(33, 'ESDM-PB',          'Dinas Energi dan Sumber Daya Mineral',                                                      'Dinas ESDM',          'opd', 1, true, false, NOW(), NOW()),
(34, 'DISPORA-PB',       'Dinas Kepemudaan dan Olahraga',                                                             'Dispora',             'opd', 1, true, false, NOW(), NOW()),
(35, 'DISBUDPAR-PB',     'Dinas Kebudayaan dan Pariwisata',                                                           'Disbudpar',           'opd', 1, true, false, NOW(), NOW()),
(36, 'DPMPTSP-PB',       'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',                                    'DPMPTSP',             'opd', 1, true, false, NOW(), NOW()),
(37, 'DISKOMINFO-PB',    'Dinas Komunikasi Informatika, Persandian dan Statistik',                                    'Diskominfo Perstik',  'opd', 1, true, false, NOW(), NOW()),
(38, 'DISPERINDAG-PB',   'Dinas Perindustrian dan Perdagangan',                                                       'Disperindag',         'opd', 1, true, false, NOW(), NOW()),
(39, 'DISPUSIP-PB',      'Dinas Kearsipan dan Perpustakaan',                                                          'Dispusip',            'opd', 1, true, false, NOW(), NOW()),
(40, 'BAPPEDA-PB',       'Badan Perencanaan Pembangunan Daerah',                                                      'Bappeda',             'opd', 1, true, true,  NOW(), NOW()),
(41, 'BALITBANGDA-PB',   'Badan Penelitian dan Pengembangan Daerah',                                                  'Balitbangda',         'opd', 1, true, false, NOW(), NOW()),
(42, 'BPKAD-PB',         'Badan Pengelola Keuangan dan Aset Daerah',                                                 'BPKAD',               'opd', 1, true, false, NOW(), NOW()),
(43, 'BAPENDA-PB',       'Badan Pendapatan Daerah',                                                                   'Bapenda',             'opd', 1, true, false, NOW(), NOW()),
(44, 'BKD-PB',           'Badan Kepegawaian Daerah',                                                                  'BKD',                 'opd', 1, true, false, NOW(), NOW()),
(45, 'BPSDM-PB',         'Badan Pengembangan Sumber Daya Manusia Daerah Provinsi',                                    'BPSDM',               'opd', 1, true, false, NOW(), NOW()),
(46, 'PENGHUBUNG-PB',    'Badan Penghubung Daerah',                                                                   'Badan Penghubung',    'opd', 1, true, false, NOW(), NOW()),
(47, 'BPBD-PB',          'Badan Penanggulangan Bencana Daerah',                                                       'BPBD',                'opd', 1, true, false, NOW(), NOW());

-- Sesuaikan sequence serial auto-increment ID
SELECT setval('organizations_id_seq', 47, true);

COMMIT;

-- Selesai! Seluruh 47 data organisasi (1 Pemprov + 1 Setda + 10 Biro + 35 OPD) telah terisi bersih.
