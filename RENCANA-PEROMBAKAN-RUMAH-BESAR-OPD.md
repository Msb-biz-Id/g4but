# RENCANA PEROMBAKAN TOTAL — RUMAH BESAR OPD

> Status: FINAL PLAN (berdasarkan audit menyeluruh kode + database + RBAC + frontend + test/seeder)
> Keputusan kunci (dari pemilik sistem):
> 1. Struktur = **SATU OPD**: OPD (pimpinan/inti) → **Sekretariat** → **Bidang-bidang**
> 2. **Capaian IKU PEMDA dihapus total**; IKU level OPD/Bidang **dipertahankan**
> 3. SAKIP / PKO / LKIP **tidak dihapus**, tetapi break-down-nya diganti: Pemda vs OPD → **OPD Inti / Sekretariat / Bidang**
> 4. Semua **seeder** dan **test** yang ada saat ini **dihapus** dan diganti set baru yang sesuai struktur OPD

---

## 0. RINGKASAN EKSEKUTIF

Sistem saat ini adalah platform akuntabilitas kinerja **level Provinsi** (multi-OPD, role provinsi, modul RPJMD/IKU-Pemda/SAKIP-Pemda/PKO-Pemda/LKIP-Pemda). Perombakan mengubahnya menjadi sistem internal **satu OPD** dengan hierarki **OPD → Sekretariat → Bidang**.

Tiga lapis pekerjaan:

| Lapis | Isi |
|---|---|
| **A. Hapus total** | Modul RPJMD Realisasi, Capaian IKU Pemda, LKIP Pemda, SAKIP Pemda, PKO Pemda (+ seluruh analytics, dashboard widget, PDF export, konteks AI, seeder, test yang menyentuhnya) |
| **B. Rescope** | Modul yang bertahan (Perencanaan, IKU OPD, Pengukuran/Realisasi, LKIP OPD, SAKIP OPD, PKO OPD, Analytics, AI, EWS) diarahkan ke OPD Inti / Sekretariat / Bidang |
| **C. Bangun ulang** | RBAC baru (role + permission matrix + data scoping), struktur organisasi baru, seeder baru, test suite baru |

Estimasi dampak: ~20 model, ~15 controller/service, ~25 file frontend, ~25 blade PDF, 12 tabel migrasi, 11 seeder, ~40 test file.

---

# BAGIAN 1 — HASIL AUDIT

## 1.1 Arsitektur saat ini

- **Stack**: Laravel 13 + Inertia React 18 + Vite 7 + Tailwind + shadcn/ui + ECharts; PDF via barryvdh/laravel-dompdf; export Excel via phpoffice/phpspreadsheet; auth via roles/permissions custom (bukan Spatie), Ziggy untuk `route()`.
- **AI**: `ai-service/` = FastAPI Python, proxy LLM generik (**tidak perlu diubah**). Semua prompt & konteks domain dibangun di PHP: `app/Services/Ai/AiContextBuilder.php`, `AiService.php`, `PromptGuardrail.php`, `AiQuotaService.php`.
- **Menu**: satu sumber di `resources/js/Layouts/AuthenticatedLayout.tsx` (`menuGroups`, gating via `permissions.includes(...)` + flag `MVP_PHASE_1`).
- **Scoping data**: `app/Services/AuthorizationService.php` → `accessibleOrganizationIds()` + middleware `EnsureOrganizationScope` (cek `organization_id`/`owner_organization_id` di request).

## 1.2 Invasaris modul yang DIHAPUS TOTAL

### (1) RPJMD Realisasi
| Jenis | File |
|---|---|
| Model | `app/Models/RealizationRpjmdItem.php` |
| Controller | `app/Http/Controllers/Measurement/PerformanceMeasurementController.php` → `rpjmdIndex/Store/Update/Destroy/UpdateMission/Batch/ExportPdf` |
| Service | `app/Services/RpjmdAnalyticsService.php` (hapus seluruh file) |
| Route | `measurement.realization.rpjmd*` (`routes/web.php` ~baris 181–186, 217) |
| Frontend | `resources/js/Pages/Measurement/RealizationRpjmd.tsx` |
| Blade | `resources/views/pdf/measurement-rpjmd.blade.php`, `pdf/dashboard/rpjmd.blade.php`, `pdf/analytics/rpjmd.blade.php` |
| Tabel | `realization_rpjmd_items` (+ turunan migrasi `2026_09_19_*`, `2026_09_20_000001_*`, `2026_10_03_000001_*`) |
| Test | `tests/Feature/RpjmdAnalyticsServiceTest.php`, `tests/Feature/RealizationRpjmdHierarchyTest.php` |

### (2) Capaian IKU PEMDA
| Jenis | File |
|---|---|
| Model | `app/Models/RealizationIkuItem.php` (hapus). **`app/Models/IkuRealization.php` TETAP** (dipakai IKU OPD) |
| Controller | `PerformanceMeasurementController` → `ikuIndex/Store/Update/Destroy/Batch/ExportPdf` (**ini Capaian IKU Pemda — hapus**). `app/Http/Controllers/Planning/IkuController.php` **TETAP** (master IKU) |
| Route | `measurement.realization.iku*` (web.php ~189–193, 218) |
| Frontend | `resources/js/Pages/Measurement/RealizationIku.tsx` |
| Blade | `resources/views/pdf/measurement-iku.blade.php`, `pdf/iku-detail.blade.php` |
| Tabel | `realization_iku_items` |
| Sinkronisasi | `EvaluationController::saveSakip()` baris ~315–351 menyinkronkan nilai ke `RealizationIkuItem` — **hapus blok ini** |

### (3) LKIP Pemerintah Daerah
| Jenis | File |
|---|---|
| Controller | `app/Http/Controllers/Reporting/ReportController.php` → tab/upload/hapus **LKIP Pemda** (baris ~60, 148–194, 321–326) |
| Service | `app/Services/SakipDocumentService.php` → `getCanonicalPemdaDefinitions()`, `getSakipPemdaMatrix()` **dihapus**; definisi canonical OPD **di-rescope** ke OPD Inti/Sekretariat/Bidang |
| Frontend | `resources/js/Pages/Reports/Index.tsx` — tab "LKIP Pemda" dihapus, tab OPD → per unit |
| Tabel | `planning_documents` type `lkip/lkjip` (kolom tabel tetap, hanya baris scope Pemda yang dibuang) |
| Test | bagian LKIP Pemda di `tests/Feature/ReportingEvaluationEwsTest.php`, `tests/Feature/Authorization/OpdDataIsolationTest.php` |

### (4) SAKIP Pemerintah Daerah
| Jenis | File |
|---|---|
| Controller | `app/Http/Controllers/Evaluation/EvaluationController.php` → cabang **SAKIP Pemda** di `index()`, `saveSakip()`, `uploadLhe()`, `exportSakipPdf()` (baris ~42–46, 75, 104, 605, 1002) |
| Frontend | `resources/js/Pages/Evaluations/Index.tsx` — sub-tab "SAKIP Pemda" dihapus |
| Blade | `resources/views/pdf/measurement-sakip.blade.php` (rework → per unit), `pdf/dashboard/sakip-pemda.blade.php`, `pdf/analytics/sakip-pemda.blade.php`, `pdf/analytics/sakip-docs-pemda.blade.php` (hapus) |
| Tabel | `evaluations`, `evaluation_scores` (kolom tetap; baris `organization_id = org provinsi` dibuang) |
| Analytics | widget `SakipDonutChart`, `PemdaSakipMatrix`, `nilai_sakip_pemda`, `sakip_pemda_matrix` di `Dashboard.tsx` & `Analytics/Index.tsx` |

### (5) PKO Pemda
| Jenis | File |
|---|---|
| Controller | `EvaluationController` → `savePkoIndicator`, `deletePkoIndicator`, `exportPkoPdf` cabang **Pemda** |
| Frontend | `resources/js/Pages/Evaluations/Index.tsx` — sub-tab "PKO Pemda" dihapus |
| Blade | `pdf/analytics/pko-pemda.blade.php` (hapus); `pdf/measurement-pko.blade.php` (rework → per unit) |
| Tabel | `pko_evaluations`, `pko_indicators` (tetap, dipakai PKO per unit) |
| Command | `app/Console/Commands/ResetDemoData.php` (mereset `pko_*` + data provinsi — **hapus/rebuild command ini**) |
| Analytics | `PkoTrendChart`, `nilai_pko_pemda`, `rata_rata_pko_pemda` di Dashboard/Analytics |

## 1.3 CROSS-DEPENDENCY (WAJIB ditangani, bukan sekadar hapus file)

| Kode yang bertahan | Masih menyentuh modul terhapus | Tindakan |
|---|---|---|
| `EvaluationController::saveSakip()` | sync total ke `RealizationIkuItem` | hapus blok sync |
| `PerformanceMeasurementController::ikuExportPdf/opdExportPdf` | fallback ke `RealizationRpjmdItem`, `IkuRealization` | hapus fallback RPJMD |
| `OpdAnalyticsService` | `RealizationIkuItem`, `IkuRealization`, `getPkoMatrix()` Pemda | hapus sumber Pemda; scope per unit |
| `DashboardController` | `RealizationIkuItem`, `PkoEvaluation` Pemda, `SakipDocumentService::getSakipPemdaMatrix()` | hapus widget Pemda |
| `AiContextBuilder` | `RealizationIkuItem`, `PkoEvaluation`, ringkasan IKU Pemda | rewrite konteks → per unit |
| `EarlyWarningAnalyticsService` + `app/Console/Commands/EvaluateAlertRules` | `SakipDocumentService` versi Pemda | ganti ke matriks per unit |
| `IkuImportService`, `IkuImportController`, `IkuController`, `IkuPolicy` | guard `isProvincialAdmin`, `level='pemda'` | ganti guard per unit |
| `AuthorizationService`, `User::isProvincialLevel/isProvincialAdmin` | role provinsi | rename + logika baru |
| `RequireMfa` | daftar role `Admin Provinsi` | update daftar role |
| `app/Console/Commands/IssueIntegrationToken` | role `Admin Provinsi` | update role |
| `app/Console/Commands/ResetDemoData` | seluruh data provinsi | **hapus file** |

## 1.4 Kondisi database (temuan penting)

- **Tidak ada kolom `is_pemda`** — diskriminasi Pemda vs OPD lewat `organizations.type='province'` dan `indicators.level='pemda'|'perangkat_daerah'`.
- Hierarki: `organizations.parent_id` (adjacency) + `type` string (province/opd/biro/inspektorat/unit) + `organization_units` paralel (unit_type bebas).
- Tabel yang **hanya** milik modul provinsi: `realization_rpjmd_items`, `realization_iku_items`.
- Tabel **ganda/campur**: `pko_evaluations` (dipakai Pemda & OPD — cukup rescope), `evaluations` (kolom `lhe_file_path`, `evaluation_status` campur PKO).
- **Duplikasi migrasi**: `2026_08_11_000015` & `2026_08_11_000020` sama-sama `create_ai_tables.php`; `planning_documents` dibuat 2× (`2026_08_24_000002` vs `2026_08_29_000010` yang dead-guard); 3 timestamp kembar (urutan eksekusi bergantung filesystem).
- **3 tabel periode paralel** (`planning_periods`, `measurement_periods`, `performance_periods`) + kolom alias ganda (`planning_period_id` vs `performance_period_id`, `title` vs `activity`, `indicator_id` vs `indicator_version_id`) dari migrasi "fix-up" `2026_09_04_162157`.
- 2 model pohon paralel: `performance_nodes/relations` vs `planning_trees/cascading_relations`.
- MFA ganda: `mfa_enabled` vs `google2fa_enabled`.
- `audit_logs.organization_id` tanpa FK; beberapa kolom hasil fix-up tanpa FK.
- `indicators` unique `iku_duplicate_prevention` dibuat di atas kolom nullable → tidak efektif.

## 1.5 Kondisi RBAC saat ini

- `app/Enums/Role.php`: 10 role **berbasis provinsi**: Super Admin, Admin Provinsi, Admin OPD, Operator OPD, Validator OPD, Evaluator Provinsi, Inspektorat, Kepala OPD, Pimpinan Provinsi, Auditor.
- Permission: tabel `permissions(resource, action, module)` + pivot `permission_role`, `role_user`, `permission_user` (global, **tanpa dimensi organisasi**). ~110 permission di `database/seeders/RolePermissionSeeder.php`.
- Pengecekan: `Gate::before` (Super Admin bypass) + ~60 `Gate::define` di `AuthorizationService` (banyak hard-code nama role provinsi) + `IkuPolicy` (satu-satunya policy).
- Scoping data: `AuthorizationService::accessibleOrganizationIds()` → Super Admin/Admin Provinsi/`isProvincialLevel()` = **semua organisasi**; selain itu = org milik user. `EnsureOrganizationScope` memverifikasi param `organization_id` request.
- Menu frontend: 46 titik gating `permissions.includes(...)` di `AuthenticatedLayout.tsx` + `MVP_PHASE_1` menyembunyikan item Phase-2.

## 1.6 Tests & seeders saat ini

- **43 file test** (Feature 26, Auth 7, Authorization 2, Unit 4, tambahan). ~12 test bergantung langsung ke modul terhapus; ~15 bergantung role provinsi.
- **11 seeder**: `RolePermissionSeeder` (role provinsi), `LocalUserSeeder` (org PROV-PAPBAR + 12 OPD), `KamarOpdSeeder`, `MasterOpdPapuaBaratSeeder` (36 OPD + 10 Biro), `SyncAllOpdUsersSeeder`, `IkuSeeder` (IKU Pemda), `DemoDataSeeder`, `SakipComprehensiveSeeder`, `EvaluasiKinerjaVisualSeeder`, `PerformanceMeasurementSampleSeeder`, `AppConfigSeeder`, `MasterPeriodSeeder`.
- `phpunit.xml`: SQLite `:memory:` + `RefreshDatabase`. Factory hanya `UserFactory`.
- `scripts/` (deploy/backup/nginx) dan `k6/load-test.js` generik — aman.

---

# BAGIAN 2 — TARGET STATE

## 2.1 Struktur organisasi (SATU OPD)

Gunakan tabel `organizations` yang sudah ada (semua FK `organization_id` di tabel transaksi tetap berlaku — **tidak perlu ubah 15+ tabel**):

```
OPD (root, type = 'opd')            ← "OPD Inti" / Pimpinan
├── Sekretariat (type = 'sekretariat', parent_id = root)
├── Bidang A (type = 'bidang', parent_id = root)
├── Bidang B (type = 'bidang', parent_id = root)
└── ... (n Bidang)
```

Aturan:
- Nilai `type` baru: **`opd` | `sekretariat` | `bidang`** (hapus `province`, `biro`, `inspektorat`, `unit`).
- Validasi parent: hanya root (`opd`) yang boleh jadi parent `sekretariat`/`bidang`. Kedalaman maksimum 2.
- Hapus kolom `is_bappeda`, `is_pilot_project` (semantik Bappeda/Pilot provinsi tidak relevan).
- `organization_units` **tidak dipakai lagi** untuk scoping (opsional di-drop pada pembersihan akhir).
- Atribut turunan untuk UI: `short_name` tetap.

## 2.2 Role baru — hanya Kepala & Admin per sisi

Hanya ada **Kepala** dan **Admin** di masing-masing **OPD**, **Sekretariat**, dan **Bidang** (tidak ada Operator, Validator, Evaluator, Auditor). Segregasi Maker–Checker tetap terjaga: **Admin = maker** (input/kelola/ajukan), **Kepala = checker** (setujui/tolak/sahkan).

| # | Role | Sisi | Cakupan data | Peran |
|---|---|---|---|---|
| 1 | `Super Admin` | Sistem | semua unit | Konfigurasi sistem, role, user global |
| 2 | `Admin OPD` | OPD | semua unit | Administrasi OPD: IAM, master data, input & kelola seluruh modul lintas unit, input penilaian SAKIP/PKO |
| 3 | `Kepala OPD` | OPD | semua unit | Pimpinan: dashboard eksekutif, sahkan Perjanjian Kinerja & dokumen perencanaan, sahkan hasil evaluasi |
| 4 | `Admin Sekretariat` | Sekretariat | Sekretariat | Maker lingkup Sekretariat: dokumen perencanaan, realisasi, evidence, LKIP, usulan PKO |
| 5 | `Kepala Sekretariat` | Sekretariat | Sekretariat | Checker lingkup Sekretariat: approve/review/sahkan + followup rekomendasi |
| 6 | `Admin Bidang` | Bidang | Bidang-nya | Maker lingkup Bidang: dokumen, realisasi, evidence, LKIP, usulan PKO |
| 7 | `Kepala Bidang` | Bidang | Bidang-nya | Checker lingkup Bidang: approve/review/sahkan + followup rekomendasi |

Aturan:
- **Admin TIDAK boleh** `realization:approve` / `agreement:approve` / finalize (tetap maker).
- **Kepala TIDAK menginput** data teknis (hanya view + approve/review/sahkan).
- Role `Operator`, `Validator`, `Evaluator`, `Inspektorat`, `Auditor` **dihapus**. Fungsi penilai SAKIP/PKO dijalankan `Admin OPD`/`Admin Sekretariat` dengan pengesahan `Kepala OPD`. Akses pemeriksaan eksternal bila diperlukan diberikan sebagai permission read-only, tanpa role khusus.

`RequireMfa` wajib untuk: `Super Admin`, `Admin OPD`, `Kepala OPD`, `Kepala Sekretariat`, `Kepala Bidang`.

## 2.3 Matriks permission per modul × role

Kolom: **A**=akses penuh CRUD, **C**=create/update/submit (maker), **X**=approve/review/sahkan (checker), **V**=view, **E**=export, **-**=tanpa akses.
`AdminUnit` = `Admin Sekretariat` / `Admin Bidang`; `KepalaUnit` = `Kepala Sekretariat` / `Kepala Bidang` (matriks sama, cakupan data berbeda sesuai unit).

| Modul (resource) | SuperAdmin | AdminOPD | KepalaOPD | AdminUnit | KepalaUnit |
|---|---|---|---|---|---|
| `user`,`role`,`permission` | A | A (cakupan OPD) | V | - | - |
| `organization`,`organization_unit` | A | A | V | V | V |
| `planning_period`,`measurement_period`,`unit`,`reference` | A | A | V | V | V |
| `import`,`migration` | A | A | - | - | - |
| `indicator` (master) | A | A | V | V | V |
| `iku` (master + workflow) | A | A | X (sahkan final) + E | C (create/update/submit) + E | X (review/sahkan unit) |
| `goal`,`objective`,`target`,`performance_node` | A | A | V | C | X |
| `planning` (dokumen: submit/review/approve) | A | A | X (approve) | C (submit) | X (review) |
| `agreement` (Perjanjian Kinerja) | A | A | X (approve) | C | X (unit) |
| `action_plan`,`risk` | A | A | V | C | X |
| `realization`,`evidence` | A | A | V | C + submit + upload evidence | X (approve/reject/revision) |
| `report` (LKIP per unit) | A | A | V + E | C (generate) + V + E | V + E |
| `dashboard` | A | A | V | V | V |
| `evaluation` (SAKIP/PKO per unit) | A | A | X (sahkan hasil) | C (input/score) | X (review unit) |
| `recommendation`,`followup` | A | A | V + manage | C (tindak lanjut) | X (verify) + manage |
| `alert`,`alert_rule` (EWS) | A | A | V + ack | V + ack | V + ack |
| `notification` | A | A | V | V + send | V |
| `knowledge` | A | A | V | A (kelola) | V |
| `ai` | A | A | A | V | V |
| `audit_log` | A | A | V | - | - |
| `config`,`integration` | A | A | V | - | - |

Implementasi: daftar permission tetap `resource:action` (katalog lama dipakai ulang, minus yang eksklusif pemda), pemetaan 7 role baru di `RolePermissionSeeder` baru.

## 2.4 Menu baru (AuthenticatedLayout)

| Grup | Item | Keterangan |
|---|---|---|
| Dashboard Eksekutif | Ringkasan Kinerja, Drilldown Unit | widget RPJMD/IKU-Pemda/SAKIP-Pemda/PKO-Pemda **dihapus**; chart: capaian per unit (OPD Inti/Sekretariat/Bidang) |
| Perencanaan Kinerja | Dokumen Perencanaan (Renstra/Renja/DPA OPD), Pohon Kinerja, Cascading, Crosscutting, Risiko, Perjanjian Kinerja, Rencana Aksi, Tujuan & Sasaran, Target Indikator, **IKU (OPD/Bidang)** | menu "Indikator Kinerja Utama" tetap (IKU OPD) |
| Pengukuran Kinerja | **Realisasi Kinerja** (per unit), Monitoring Fisik/Output, Monitoring Anggaran | "Realisasi RPJMD" & "Capaian IKU PEMDA" **dihapus** |
| Pelaporan Kinerja | LKIP OPD (tab: OPD Inti / Sekretariat / Bidang) | tab "LKIP Pemda" dihapus |
| Evaluasi Kinerja | SAKIP (per unit), PKO (per unit) | sub-tab "Pemda" dihapus |
| Dashboard Analitik | Analitik, Kelengkapan Data, Keterlambatan | chart RPJMD/IKU-Pemda/SAKIP-Pemda/PKO-Pemda dihapus |
| AI Performance Intelligence | AI Asisten, Executive Summary, Insight, Prediksi, Rekomendasi | copy "SAKIP Pemda / IKU Pemda" diganti "kinerja OPD, Sekretariat, dan Bidang" |
| Master Data | Organisasi (OPD/Sekretariat/Bidang), Periode, Satuan, Indikator, Import, Migrasi | |
| Lainnya | EWS, Notifikasi, Knowledge, Pengguna & Role, Audit Log, Integrasi, WhatsApp, Pengaturan | |

Label tombol AI di footer sidebar: "Tanya SAKIP & Kinerja" → **"Tanya Kinerja OPD"**.

---

# BAGIAN 3 — IMPLEMENTASI BERTAHAP (dengan gate verifikasi)

> Prinsip: setiap fase ditutup dengan **gate hijau** sebelum fase berikutnya. Tidak ada fase yang "setengah jadi".
> Perintah verifikasi yang dipakai: `vendor/bin/pint --test`, `composer test` (php artisan test), `npm run build` (tsc + vite), `php artisan route:list`, `php artisan migrate:fresh --seed`.

## FASE 0 — Baseline & pengamanan (wajib)
1. Buat branch git baru (`restructure/rumah-besar-opd`); commit kondisi awal.
2. Backup database + `storage/`.
3. Jalankan `composer test` dan `npm run build` untuk mencatat kondisi awal (baseline hijau/merah).
4. Simpan inventaris referensi terhapus sebagai patokan sweep (daftar token di Bagian 5).
5. Buat `database/sql/` script reset organisasi (untuk lingkungan dev).

**Gate Fase 0**: baseline tercatat, backup tersedia.

## FASE 1 — Hapus total modul provinsi (backend + frontend + blade)
Urutan aman: **route → controller method → service → model → view/page → test yang memakai**.

1. `routes/web.php`: hapus grup route `measurement.realization.rpjmd*`, `measurement.realization.iku*` (dan export PDF terkait).
2. `PerformanceMeasurementController.php`: hapus method `rpjmd*` (7 method) dan `iku*` (6 method) + helper yang hanya dipakai keduanya (`buildCalculations`/`enrichIndicators` dipakai juga ekspor OPD → **refactor**, jangan hapus).
3. Hapus file: `app/Models/RealizationRpjmdItem.php`, `app/Models/RealizationIkuItem.php`, `app/Services/RpjmdAnalyticsService.php`.
4. `EvaluationController.php`: hapus cabang SAKIP Pemda & PKO Pemda + blok sync ke `RealizationIkuItem`.
5. `ReportController.php` + `SakipDocumentService.php`: hapus LKIP Pemda (`getCanonicalPemdaDefinitions`, `getSakipPemdaMatrix`, guard upload/hapus Pemda).
6. `DashboardController.php`, `OpdAnalyticsService.php`, `EarlyWarningAnalyticsService.php`, `EvaluateAlertRules.php`: buang query ke tabel/hal terhapus.
7. Hapus `app/Console/Commands/ResetDemoData.php`.
8. Frontend: hapus `Pages/Measurement/RealizationRpjmd.tsx`, `Pages/Measurement/RealizationIku.tsx`; hapus entry menu terkait di `AuthenticatedLayout.tsx`.
9. Blade: hapus `pdf/measurement-rpjmd.blade.php`, `pdf/measurement-iku.blade.php`, `pdf/iku-detail.blade.php`, `pdf/dashboard/rpjmd.blade.php`, `pdf/dashboard/sakip-pemda.blade.php`, `pdf/analytics/rpjmd.blade.php`, `pdf/analytics/sakip-pemda.blade.php`, `pdf/analytics/sakip-docs-pemda.blade.php`, `pdf/analytics/pko-pemda.blade.php`.
10. Hapus test yang hanya menguji modul terhapus (lihat Bagian 4).

**Gate Fase 1**: `composer test` hijau (test tersisa), `npm run build` hijau, `php artisan route:list` tidak memuat route terhapus, tidak ada error referensi kelas terhapus (`php artisan about` / autoload check).

## FASE 2 — Migrasi database
Buat migrasi baru (jangan edit migrasi yang sudah pernah jalan di DB nyata):

1. `2026_xx_xx_000001_drop_province_modules.php`
   - `Schema::dropIfExists('realization_rpjmd_items')`
   - `Schema::dropIfExists('realization_iku_items')`
   - `Schema::dropColumns('organizations', ['is_bappeda','is_pilot_project'])`
   - Hapus baris `organizations.type='province'` + baris turunannya (data provinsi) — dengan guard `Schema::hasTable` agar aman di DB lama.
2. `2026_xx_xx_000002_restructure_org_hierarchy_opd.php`
   - Set `type` lama → nilai baru (`opd`/`sekretariat`/`bidang`) untuk data existing; buat 1 root OPD + template Sekretariat/Bidang bila DB kosong.
   - Tambah index `(type, parent_id)`.
3. `2026_xx_xx_000003_cleanup_iku_scope.php`
   - Hapus baris `indicators.level='pemda'`; ganti nilai `level` → `opd`|`unit`; rapikan unique `iku_duplicate_prevention` (tanpa kolom nullable).
4. `2026_xx_xx_000004_unify_period_columns.php` (opsional tapi direkomendasikan)
   - Konsolidasi kolom alias (`planning_period_id` vs `performance_period_id`, `title` vs `activity`, `indicator_id` vs `indicator_version_id`) ke satu sumber + FK yang benar.
   - Rapikan MFA (`mfa_enabled` vs `google2fa_enabled`) dan tambah FK `audit_logs.organization_id`.

> Keputusan: **squash seluruh migrasi lama** hanya bila database dianggap dapat dibuang ulang (`migrate:fresh`). Untuk DB dengan data nyata, gunakan jalur aditif di atas. Default rencana ini = **jalur aditif** (aman untuk data), dan menambahkan migrasi drop untuk tabel modul terhapus.

**Gate Fase 2**: `php artisan migrate:fresh` sukses di DB kosong; `php artisan migrate` sukses di DB lama (tanpa error); skema hasil dicek dengan `php artisan db:show` / schema dump.

## FASE 3 — RBAC baru (inti perombakan)
1. `app/Enums/Role.php` → **7 role baru** (lihat 2.2): `Super Admin`, `Admin OPD`, `Kepala OPD`, `Admin Sekretariat`, `Kepala Sekretariat`, `Admin Bidang`, `Kepala Bidang`. Tambah helper `Role::unitScopedRoles()`, `Role::leadershipRoles()`, `Role::adminRoles()`.
2. `app/Models/User.php`: hapus `isProvincialAdmin()`/`isProvincialLevel()`; ganti dengan `isOpdAdmin()`, `isLeadership()` (role Kepala), `isUnitScoped()`, `unitOrganization()` (org tipe `sekretariat`/`bidang` milik user), `scopeOrganizationIds()`.
3. `app/Services/AuthorizationService.php`:
   - `accessibleOrganizationIds()`: `Super Admin`/`Admin OPD`/`Kepala OPD` → semua unit; `Admin/Kepala Sekretariat` & `Admin/Kepala Bidang` → hanya org unit-nya (dan subtree bila kelak ada).
   - Hapus semua hard-code `'Admin Provinsi'`, `'Evaluator Provinsi'`, `'Pimpinan Provinsi'`, `'Inspektorat'`, `is_bappeda`.
   - `Gate::define` disesuaikan matriks 2.3 (buang gate yang hanya untuk modul terhapus); gate approve hanya untuk role Kepala, gate input hanya untuk role Admin.
4. `app/Policies/IkuPolicy.php`: scope ke unit (IKU OPD/Bidang), hapus guard pemda.
5. `app/Http/Middleware/EnsureOrganizationScope.php`: dukung scoping subtree (OPD Inti boleh semua unit; unit hanya org-nya).
6. `app/Http/Middleware/RequireMfa.php`: daftar role baru.
7. `app/Console/Commands/IssueIntegrationToken.php`: role default baru (`Admin OPD`).
8. `app/Services/IkuImportService.php`, `Planning/IkuController.php`, `IkuImportController.php`: hapus cabang `level='pemda'` & `isProvincialAdmin` → ganti guard `unit scope`.
9. `HandleInertiaRequests.php`: share `auth.user` tetap, tambah `organization_type`/`scope` bila perlu untuk UI.

**Gate Fase 3**: `composer test` hijau; skenario manual: login sebagai tiap role → menu sesuai matriks; user Sekretariat tidak bisa membaca data Bidang (403/empty).

## FASE 4 — Rescope modul yang bertahan
1. **Dashboard** (`DashboardController` + `Pages/Dashboard.tsx` + `pdf/dashboard/executive.blade.php`): KPI per unit — capaian realisasi, PKO per unit, SAKIP per unit, distribusi OPD Inti/Sekretariat/Bidang.
2. **Analytics** (`AnalyticsController` + `OpdAnalyticsService` + `Pages/Analytics/Index.tsx` + `pdf/analytics/*`): chart `Rpjmd*`, `Iku*`(pemda), `SakipPemda*`, `PkoPemda*` dihapus; chart `OpdPerformanceTrendChart`, `ActionPlansQuarterChart`, `ActionPlansOpdRankingBarChart` di-rescope per unit; tabel "Keterangan Penilaian SAKIP/PKO" tetap (konteks OPD).
3. **Reporting/LKIP** (`ReportController`, `Pages/Reports/Index.tsx`): tab per unit (OPD Inti/Sekretariat/Bidang) menggantikan Pemda/OPD.
4. **Evaluation** (`EvaluationController`, `Pages/Evaluations/Index.tsx`, `pdf/measurement-sakip.blade.php`, `pdf/measurement-pko.blade.php`, `pdf/reports/evaluation-pdf.blade.php`): penilaian SAKIP 4 komponen & PKO (capaian PK → normalisasi → koreksi → nilai akhir) per unit; upload LHE per unit.
5. **Measurement** (`PerformanceMeasurementController`, `Pages/Measurement/RealizationOpd.tsx`, `MonitoringOutput/Budget.tsx`): judul/selector berbasis OPD Inti/Sekretariat/Bidang; hapus `MeasurementNav` item terhapus.
6. **Planning/IKU** (`Planning/Iku/*`): pilihan level `pemda` dihapus dari wizard/import; IKU hanya `opd`/`unit` (ter-scoping `owner_organization_id`).
7. **Master Organization** (`OrganizationController`, `Pages/Organizations/*`): CRUD OPD Inti/Sekretariat/Bidang + validasi parent-child.

**Gate Fase 4**: `composer test` + `npm run build` hijau; QA manual per layar (Dashboard, Analytics, LKIP, Evaluasi, Realisasi, IKU) untuk 3 tipe unit.

## FASE 5 — Lapis AI
1. `app/Services/Ai/AiContextBuilder.php`: hapus sumber `RealizationIkuItem`, `PkoEvaluation` Pemda, ringkasan IKU Pemda; konteks baru = data per unit (realisasi, capaian IKU OPD/unit, SAKIP/PKO per unit, EWS).
2. `app/Http/Controllers/Ai/AiController.php` + `AiService.php`: fitur `opd_status` → `unit_status` (ringkasan per unit); `executive_summary`, `insight`, `prediction`, `recommendation`, `chat` tetap dengan konteks baru.
3. Migrasi data `ai_prompt_templates` baru (versi 3): prompt anti-halusinasi merujuk "OPD, Sekretariat, Bidang" — bukan "Pemda/Provinsi/RPJMD".
4. `Pages/Ai/Index.tsx`, `Pages/Ai/Chatbot.tsx`, `Components/Ai/FloatingChatWidget.tsx`, `pdf/ai-report.blade.php`: perbaiki copy (hapus rujukan SAKIP/IKU Pemda & "4 pilar penguatan akuntabilitas" provinsi).
5. `ai-service/` (FastAPI) **tidak diubah** (proxy generik).
6. `PredictionController`/`TrendPredictor`: scope per unit, hapus referensi `is_iku` pemda.

**Gate Fase 5**: chatbot & executive summary berjalan dengan data unit; tidak ada istilah "Pemda/RPJMD/Provinsi" pada output.

## FASE 6 — Seeder & test baru (menggantikan yang lama)
**Seeder lama DIHAPUS SEMUA** (11 file: `RolePermissionSeeder`, `LocalUserSeeder`, `KamarOpdSeeder`, `MasterOpdPapuaBaratSeeder`, `SyncAllOpdUsersSeeder`, `IkuSeeder`, `DemoDataSeeder`, `SakipComprehensiveSeeder`, `EvaluasiKinerjaVisualSeeder`, `PerformanceMeasurementSampleSeeder`, `AppConfigSeeder`, `MasterPeriodSeeder`).

Seeder baru (minimal & idempoten):
1. `RolePermissionSeeder` — **7 role** (Super Admin, Admin OPD, Kepala OPD, Admin Sekretariat, Kepala Sekretariat, Admin Bidang, Kepala Bidang) + permission matrix 2.3.
2. `OrganizationSeeder` — root OPD + 1 Sekretariat + n Bidang (konfigurasi dari `config/ekasuari.php` atau array di seeder).
3. `AdminUserSeeder` — akun `Super Admin` + `Admin OPD` + contoh pasangan `Kepala/Admin Sekretariat` dan `Kepala/Admin Bidang` (password dev, `must_change_password`).
4. `MasterDataSeeder` — periode, satuan, indikator contoh level OPD/unit.
5. `AppConfigSeeder` — tetap (tema/app config), disesuaikan nama aplikasi.

`DatabaseSeeder` memanggil 1–5. Tidak ada data demo modul terhapus.

**Test lama DIHAPUS SEMUA**, diganti suite baru:
1. `tests/Feature/Authorization/RoleMatrixTest.php` — verifikasi matriks 2.3 per role per modul.
2. `tests/Feature/Authorization/UnitDataIsolationTest.php` — isolasi Sekretariat vs Bidang vs OPD Inti (realisasi, LKIP, evaluasi).
3. `tests/Feature/OrganizationHierarchyTest.php` — validasi parent-child OPD→Sekretariat/Bidang.
4. `tests/Feature/PlanningModuleTest.php`, `MeasurementModuleTest.php`, `ReportingModuleTest.php`, `EvaluationModuleTest.php`, `IkuModuleTest.php` (IKU OPD/unit).
5. `tests/Feature/Auth/*` (login/logout/MFA role baru), `tests/Feature/SecurityTest.php`, `ProfileTest.php`, `HealthCheckTest.php`.
6. `tests/Unit/` — calculator & helper yang masih berlaku.

**Gate Fase 6**: `php artisan migrate:fresh --seed` sukses; `composer test` 100% hijau.

## FASE 7 — Pembersihan residual & verifikasi final
1. **Sweep referensi** (harus 0 hasil): `Rpjmd`, `realization_rpjmd`, `RealizationRpjmdItem`, `RealizationIkuItem`, `realization_iku_items`, `Pemda`, `pemda`, `Provinsi`, `province`, `is_bappeda`, `is_pilot_project`, `Admin Provinsi`, `Evaluator Provinsi`, `Pimpinan Provinsi`, `Inspektorat`, `LKIP Pemda`, `SAKIP Pemda`, `PKO Pemda`, `Capaian IKU`, `isProvincialAdmin`, `isProvincialLevel`, `getSakipPemdaMatrix` (kecuali dokumen rencana ini).
2. Bersihkan: `lang/id/validation.php` (`is_iku` label), copy landing `Components/Landing/*` (rujukan RPJMD/SAKIP Papua Barat), `config/ekasuari.php`.
3. `resources/js/types`, `hooks`, `lib` — pastikan tanpa tipe modul terhapus.
4. Cache key dashboard/analytics yang memuat payload Pemda di-invalidate.
5. Perintah final: `vendor/bin/pint` (fix style), `vendor/bin/pint --test`, `composer test`, `npm run build`, `php artisan route:list`, `php artisan migrate:fresh --seed`, `php artisan config:clear && php artisan cache:clear`.
6. QA manual per role (7 role × menu inti) mengikuti checklist Bagian 5.

**Gate Fase 7**: seluruh gate hijau + checklist DoD 100% centang.

---

# BAGIAN 4 — INVENTARIS AKSI FILE

## 4.1 Dihapus (file utuh)
```
app/Models/RealizationRpjmdItem.php
app/Models/RealizationIkuItem.php
app/Services/RpjmdAnalyticsService.php
app/Console/Commands/ResetDemoData.php
resources/js/Pages/Measurement/RealizationRpjmd.tsx
resources/js/Pages/Measurement/RealizationIku.tsx
resources/views/pdf/measurement-rpjmd.blade.php
resources/views/pdf/measurement-iku.blade.php
resources/views/pdf/iku-detail.blade.php
resources/views/pdf/dashboard/rpjmd.blade.php
resources/views/pdf/dashboard/sakip-pemda.blade.php
resources/views/pdf/analytics/rpjmd.blade.php
resources/views/pdf/analytics/sakip-pemda.blade.php
resources/views/pdf/analytics/sakip-docs-pemda.blade.php
resources/views/pdf/analytics/pko-pemda.blade.php
database/seeders/* (11 file, diganti baru)
tests/** (seluruh suite lama, diganti baru)
```

## 4.2 Diedit besar (rewrite bagian)
```
routes/web.php                                  (hapus route modul terhapus)
app/Http/Controllers/Measurement/PerformanceMeasurementController.php  (hapus method rpjmd*/iku*)
app/Http/Controllers/Evaluation/EvaluationController.php               (hapus cabang Pemda)
app/Http/Controllers/Reporting/ReportController.php                    (hapus LKIP Pemda)
app/Http/Controllers/Dashboard/DashboardController.php                 (hapus widget Pemda)
app/Services/SakipDocumentService.php                                  (hapus definisi/matriks Pemda)
app/Services/OpdAnalyticsService.php                                   (rescope per unit)
app/Services/EarlyWarningAnalyticsService.php                          (rescope)
app/Services/Ai/AiContextBuilder.php                                   (rewrite konteks)
app/Services/IkuImportService.php + Planning/IkuController.php + IkuImportController.php (hapus guard pemda)
app/Services/AuthorizationService.php, app/Models/User.php, app/Enums/Role.php, app/Policies/IkuPolicy.php
app/Http/Middleware/EnsureOrganizationScope.php, RequireMfa.php, HandleInertiaRequests.php
app/Console/Commands/EvaluateAlertRules.php, IssueIntegrationToken.php
resources/js/Layouts/AuthenticatedLayout.tsx                           (menu baru)
resources/js/Pages/Dashboard.tsx, Analytics/Index.tsx, Evaluations/*.tsx, Reports/Index.tsx,
  Measurement/{RealizationOpd,MonitoringOutput,MonitoringBudget,MeasurementNav}.tsx, Planning/Iku/*.tsx, Ai/*.tsx
resources/js/Components/Ai/FloatingChatWidget.tsx, Components/Landing/*.tsx
resources/views/pdf/measurement-{sakip,pko,opd,output,budget}.blade.php (rescope per unit)
resources/views/pdf/dashboard/{executive,drilldown,sakip-opd}.blade.php
resources/views/pdf/analytics/{opd,trend,deviation,action-plans*,risk-map,sakip-eval,sakip-document-sheet,sakip-docs-opd,pko-opd,opd-ranking}.blade.php
resources/views/reports/evaluation-pdf.blade.php, pdf/ai-report.blade.php
database/seeders/DatabaseSeeder.php, config/ekasuari.php
```

## 4.3 Dibuat baru
```
database/migrations/2026_xx_000001_drop_province_modules.php
database/migrations/2026_xx_000002_restructure_org_hierarchy_opd.php
database/migrations/2026_xx_000003_cleanup_iku_scope.php
database/migrations/2026_xx_000004_unify_period_columns.php        (opsional)
database/seeders/{RolePermissionSeeder,OrganizationSeeder,AdminUserSeeder,MasterDataSeeder,AppConfigSeeder}.php
tests/Feature/Authorization/{RoleMatrixTest,UnitDataIsolationTest}.php
tests/Feature/{OrganizationHierarchyTest,PlanningModuleTest,MeasurementModuleTest,ReportingModuleTest,EvaluationModuleTest,IkuModuleTest}.php
database/migrations/2026_xx_000005_update_ai_prompt_templates_v3.php
```

---

# BAGIAN 5 — DEFINISI SELESAI (DoD) — 100%

**Fungsional**
- [ ] Menu tidak memuat: Realisasi RPJMD, Capaian IKU PEMDA, LKIP Pemda, SAKIP Pemda, PKO Pemda (dan tidak bisa diakses via URL langsung → 404/403).
- [ ] Struktur organisasi: 1 OPD + Sekretariat + Bidang; CRUD organisasi memvalidasi parent-child.
- [ ] 7 role bekerja sesuai matriks 2.3 (uji tiap role × modul): Admin = maker (tanpa approve), Kepala = checker (tanpa input teknis).
- [ ] Isolasi data: user Bidang A tidak melihat/mengubah data Bidang B & Sekretariat; OPD Inti melihat semua.
- [ ] LKIP/SAKIP/PKO tampil per OPD Inti/Sekretariat/Bidang.
- [ ] IKU hanya level OPD/unit (tidak ada opsi Pemda di wizard/import/ekspor).
- [ ] AI Asisten & Executive Summary hanya membahas kinerja OPD/Sekretariat/Bidang.

**Teknis**
- [ ] `vendor/bin/pint --test` lulus.
- [ ] `composer test` 100% lulus.
- [ ] `npm run build` (tsc + vite) lulus tanpa error TypeScript.
- [ ] `php artisan migrate:fresh --seed` lulus; `php artisan migrate` di DB lama lulus.
- [ ] `php artisan route:list` tanpa route modul terhapus.
- [ ] Sweep grep token (Bagian 7.1) = 0 hasil di `app/`, `routes/`, `resources/`, `database/`, `tests/`.
- [ ] Tidak ada error referensi kelas/tabel terhapus di log (login → semua menu → export PDF → AI chat).

**Dokumentasi**
- [ ] README diperbarui: struktur OPD → Sekretariat → Bidang, daftar role, cara seed & test.
- [ ] Catatan migrasi data (untuk DB lama) tersedia.

---

# BAGIAN 6 — RISIKO & MITIGASI

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Cross-dependency terlewat (kompilasi lulus tapi runtime error) | Tinggi | Ikuti urutan Fase 1 (route→controller→service→model→view) + gate `composer test` + sweep grep |
| Kehilangan data saat drop tabel | Tinggi | Backup wajib Fase 0; migrasi drop dibuat idempoten + terproteksi (`hasTable`); jalur aditif untuk DB produksi |
| RBAC baru salah scope (kebocoran data antar unit) | Tinggi | `UnitDataIsolationTest` + QA manual per role; `EnsureOrganizationScope` subtree-aware |
| Route name berubah memutus Ziggy di frontend | Sedang | `php artisan route:list` dibandingkan sebelum/sesudah; build frontend menangkap `route()` tak dikenal saat QA |
| Migrasi duplikat/fix-up lama gagal di DB baru | Sedang | Uji `migrate:fresh` + `migrate` di DB lama pada Fase 2 |
| Cache dashboard menyimpan payload lama | Rendah | Invalidate cache key Fase 7; `php artisan cache:clear` di deploy |
| Test suite baru belum lengkap | Sedang | Prioritaskan RoleMatrixTest + UnitDataIsolationTest (RBAC = inti perombakan) |
| Copy UI/AI masih menyebut provinsi | Rendah | Sweep token Fase 7 + QA manual teks |

---

# LAMPIRAN A — Pemetaan role lama → baru

Target: hanya **Kepala** & **Admin** di tiap sisi (OPD / Sekretariat / Bidang) + `Super Admin`.

| Role lama | Nasib | Pengganti |
|---|---|---|
| Super Admin | tetap | `Super Admin` |
| Admin Provinsi | **hapus** | `Admin OPD` |
| Pimpinan Provinsi | **hapus** | `Kepala OPD` |
| Evaluator Provinsi | **hapus** | `Admin OPD` / `Admin Sekretariat` (input penilaian) + `Kepala OPD` (sahkan) |
| Inspektorat | **hapus** | tidak ada role khusus (fungsi pengawasan → `Kepala OPD`; pemeriksaan eksternal → permission read-only bila diperlukan) |
| Auditor | **hapus** | tidak ada role khusus (read-only via permission bila diperlukan) |
| Admin OPD | rescope | `Admin OPD` (cakupan seluruh unit: OPD Inti/Sekretariat/Bidang) |
| Kepala OPD | rescope | `Kepala OPD` |
| Operator OPD | **dipecah → dihapus** | `Admin Sekretariat` / `Admin Bidang` (sebagai maker) |
| Validator OPD | **dipecah → dihapus** | `Kepala Sekretariat` / `Kepala Bidang` (sebagai checker) |
| — | baru | `Admin Sekretariat`, `Kepala Sekretariat`, `Admin Bidang`, `Kepala Bidang` |

Total role baru = **7**: `Super Admin`, `Admin OPD`, `Kepala OPD`, `Admin Sekretariat`, `Kepala Sekretariat`, `Admin Bidang`, `Kepala Bidang`.

# LAMPIRAN B — Urutan eksekusi yang disarankan

```
Fase 0 (baseline/backup) → Fase 1 (hapus modul provinsi) → Fase 2 (migrasi DB)
→ Fase 3 (RBAC baru) → Fase 4 (rescope modul) → Fase 5 (AI) → Fase 6 (seeder+test baru)
→ Fase 7 (pembersihan + verifikasi final)
```

Estimasi urutan kerja per PR: **7 PR** (satu per fase) agar setiap perubahan dapat direview & diuji terpisah, dengan `composer test` + `npm run build` sebagai gate merge.
