<p align="center">
  <img src="https://img.shields.io/badge/e--KASUARI-v1.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/PHP-8.4-purple?style=flat-square" alt="PHP" />
  <img src="https://img.shields.io/badge/Laravel-13-red?style=flat-square" alt="Laravel" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square" alt="React" />
  <img src="https://img.shields.io/github/actions/workflow/status/your-org/e-kasuari/ci.yml?style=flat-square&label=CI" alt="CI" />
</p>

# e-KASUARI
**Sistem Akuntabilitas Kinerja Instansi Pemerintah — Provinsi Papua Barat**

Aplikasi web terpadu untuk perencanaan, pengukuran, evaluasi, dan pelaporan kinerja OPD (Organisasi Perangkat Daerah) berbasis SAKIP. Dibangun di atas Laravel 13 + React/TypeScript (Inertia.js).

---

## ✨ Fitur Utama

| Modul | Keterangan |
|---|---|
| 📊 **Dashboard** | Ringkasan kinerja real-time dengan chart dan indikator EWS |
| 📋 **Perencanaan** | Manajemen indikator, target tahunan, dan dokumen perencanaan |
| 📏 **Pengukuran** | Input realisasi, upload evidence, workflow persetujuan |
| 📈 **Evaluasi & Pelaporan** | Laporan PDF/Excel, evaluasi EWS, perbandingan antar-OPD |
| 🤖 **AI Analytics** | Prediksi tren (regresi linier), insight capaian, early warning |
| 🔔 **Notifikasi** | In-app + WhatsApp untuk reminder dan alert kritis |
| 📚 **Basis Pengetahuan** | Dokumen panduan, peraturan, dan referensi SAKIP |
| 🔗 **Integrasi** | Koneksi ke sistem eksternal via REST API |
| 👥 **RBAC** | Role-based access control dengan MFA untuk role kritis |

---

## 🏗️ Stack Teknologi

- **Backend:** PHP 8.4 · Laravel 13 · Inertia.js
- **Frontend:** React 18 · TypeScript · Tailwind CSS · Vite
- **Database:** PostgreSQL 16 (production) · SQLite (development/testing)
- **Queue:** Database driver (production: Redis)
- **AI Service:** FastAPI (Python) / OpenAI API — via `EKASUARI_AI_PROVIDER`
- **Auth:** Session-based · Google 2FA (MFA untuk admin)

---

## ⚙️ Requirements

| Komponen | Versi Minimum |
|---|---|
| PHP | 8.2+ (production: 8.4) |
| Composer | 2.x |
| Node.js | 20+ |
| PostgreSQL | 16 (production) |
| SQLite | 3.x (development) |

---

## 🚀 Instalasi Lokal (Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/e-kasuari.git
cd e-kasuari

# 2. Install PHP dependencies
composer install

# 3. Install Node dependencies
npm install

# 4. Konfigurasi environment
cp .env.example .env
php artisan key:generate

# 5. Buat database SQLite dan jalankan migrasi
touch database/database.sqlite
php artisan migrate
php artisan db:seed

# 6. Build frontend
npm run dev   # development (hot reload)
# atau
npm run build # production build

# 7. Jalankan server
php artisan serve --port=4040
```

Aplikasi tersedia di: **http://localhost:4040**

### Akun Default (Seeder)
| Role | Email | Password |
|---|---|---|
| Super Admin | admin@ekasuari.test | password |
| Admin Provinsi | adminprov@ekasuari.test | password |
| Operator OPD | operator@ekasuari.test | password |

> ⚠️ Akun default **hanya untuk development**. Jangan gunakan di production.

---

## 🧪 Testing

```bash
# Jalankan seluruh test suite
php artisan test

# Test dengan output verbose
php artisan test --testdox

# Test paralel (lebih cepat)
php artisan test --parallel

# Test spesifik
php artisan test tests/Feature/SecurityTest.php
php artisan test tests/Unit/AchievementCalculatorTest.php
```

Target: **0 failed, 0 errors** sebelum merge ke `main`.

---

## 📁 Struktur Direktori

```
e-kasuari/
├── app/
│   ├── Contracts/         # Interface (AiProvider, dll.)
│   ├── Http/
│   │   ├── Controllers/   # Controller per modul
│   │   └── Middleware/    # SecurityHeaders, RequireMfa, dll.
│   ├── Models/            # 52 Eloquent model
│   └── Services/          # Business logic (AchievementCalculator, TrendPredictor, AiService)
├── database/
│   ├── migrations/        # 36 migration file
│   └── seeders/           # RolePermission, LocalUser, AppConfig
├── docs/                  # Dokumentasi teknis
│   ├── DEPLOYMENT.md      # Panduan deployment production
│   ├── ADMIN_GUIDE.md     # Panduan administrator
│   ├── USER_GUIDE.md      # Panduan pengguna
│   ├── RUNBOOK.md         # Prosedur operasional & insiden
│   └── HANDOVER.md        # Handover checklist
├── k6/                    # Load test scripts
├── resources/js/          # React/TypeScript frontend (Inertia)
├── routes/
│   ├── web.php            # 360+ route aplikasi
│   └── auth.php           # Route autentikasi
├── scripts/               # Script operasional
│   ├── deploy.sh          # Script deployment production
│   ├── backup.sh          # Script backup DB + storage
│   ├── nginx.conf         # Template konfigurasi Nginx
│   └── ekasuari-queue.conf # Template Supervisor queue worker
└── tests/
    ├── Feature/           # 18+ feature test files
    └── Unit/              # Unit tests (AchievementCalculator, TrendPredictor)
```

---

## 📖 Dokumentasi

| Dokumen | Keterangan |
|---|---|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Setup server production (Nginx, PHP-FPM, PostgreSQL) |
| [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Panduan administrator sistem |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | Panduan pengguna OPD |
| [RUNBOOK.md](docs/RUNBOOK.md) | Prosedur monitoring, backup, dan penanganan insiden |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Checklist persiapan go-live |

---

## 🔒 Keamanan

Untuk melaporkan celah keamanan, hubungi tim pengembang melalui jalur resmi (bukan public issue). Detail prosedur ada di [docs/HANDOVER.md](docs/HANDOVER.md).

---

## 📄 Lisensi

Sistem ini dikembangkan untuk keperluan internal **Pemerintah Provinsi Papua Barat**. Seluruh hak cipta dilindungi.
