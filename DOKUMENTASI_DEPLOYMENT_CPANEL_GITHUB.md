# PANDUAN RUNNING & DEPLOYMENT E-SAKIP DI CPANEL
## Domain: `https://pupr.msb.biz.id`
### Repositori: `https://github.com/Msb-biz-Id/g4but.git`

Dokumen ini adalah panduan komprehensif langkah demi langkah untuk melakukan instalasi, konfigurasi, migrasi database, dan pemeliharaan sistem **e-SAKIP Dinas PUPR** pada server hosting cPanel dengan domain **`pupr.msb.biz.id`**.

---

## 1. SPESIFIKASI & PRASYARAT SERVER CPANEL

| Komponen | Spesifikasi & Pengaturan |
|---|---|
| **Domain Aplikasi** | `https://pupr.msb.biz.id` |
| **Repositori GitHub** | `https://github.com/Msb-biz-Id/g4but.git` |
| **Versi PHP** | **PHP 8.2** atau **PHP 8.3** (Aktifkan via menu **MultiPHP Manager** di cPanel) |
| **Ekstensi PHP Wajib** | `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `intl`, `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip` |
| **PHP Settings** | `memory_limit = 256M` (atau 512M), `upload_max_filesize = 50M`, `post_max_size = 50M`, `max_execution_time = 300` |
| **Database Engine** | MySQL 8.0+ / MariaDB 10.4+ (Default Engine: `InnoDB`, Collation: `utf8mb4_unicode_ci`) |
| **Akses Fitur cPanel** | - **Terminal (SSH)**<br>- **Git™ Version Control**<br>- **Domains / Subdomains**<br>- **MySQL® Database Wizard**<br>- **SSL/TLS Status (AutoSSL)**<br>- **Cron Jobs** |
| **Build Frontend** | Bundel Vite (`public/build`) sudah ter-compile dan tersedia langsung di repositori GitHub `main`. |

---

## 2. ARSITEKTUR STRUKTUR DIREKTORI DI CPANEL

Karena Anda menggunakan subdomain **`pupr.msb.biz.id`**, cPanel memungkinkan Anda menentukan **Document Root** langsung ke folder `public/` Laravel tanpa perlu symlink manual atau memindahkan file.

Struktur folder yang direkomendasikan di cPanel (`/home/USERNAME/`):

```text
/home/USERNAME/
│
├── ekasuarirepack/                <-- [DI LUAR public_html] Repositori Git Laravel (Aman & Terlindungi)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/                    <-- DOCUMENT ROOT SUBDOMAIN: pupr.msb.biz.id
│   │   ├── build/                 <-- Aset Vite JavaScript & CSS
│   │   ├── index.php              <-- Entry point Laravel
│   │   ├── .htaccess              <-- Routing Apache & security headers
│   │   └── storage -> ../storage/app/public
│   ├── resources/
│   ├── routes/
│   ├── storage/                   <-- File upload evidence & logs
│   ├── vendor/                    <-- Dependency Composer
│   ├── .cpanel.yml                <-- Skrip deployment otomatis cPanel Git
│   ├── .env                       <-- Konfigurasi rahasia produksi (Terproteksi dari web)
│   └── artisan
│
└── public_html/                   <-- Folder domain utama (tidak terganggu)
```

---

## 3. LANGKAH 1: MEMBUAT SUBDOMAIN DI CPANEL

1. Masuk ke **cPanel** akun Anda (`msb.biz.id`).
2. Masuk ke menu **Domains** (atau **Subdomains** pada cPanel versi klasik).
3. Klik tombol **Create A New Domain**:
   - **Domain:** `pupr.msb.biz.id`
   - **Share document root with "msb.biz.id":** Pastikan **TIDAK DICENTANG (Uncheck)**.
   - **Document Root:** Isi tepat ke arah folder public Laravel:
     ```text
     /home/USERNAME/ekasuarirepack/public
     ```
     *(Ganti `USERNAME` dengan username login cPanel Anda, misalnya: `msb` atau `msbbiz`)*.
4. Klik **Submit**.

> **Catatan SSL:** Masuk ke menu **SSL/TLS Status** di cPanel ➔ centang `pupr.msb.biz.id` ➔ klik **Run AutoSSL** agar subdomain langsung mendapatkan sertifikat HTTPS gratis (Let's Encrypt / cPanel Sectigo).

---

## 4. LANGKAH 2: SETUP DATABASE MYSQL DI CPANEL

1. Buka menu **MySQL® Database Wizard** di cPanel:
   - **Langkah 1 (Buat Database):** Masukkan nama, misalnya: `sakip_pupr`
     *(Hasil nama database lengkap menjadi: `USERNAME_sakip_pupr`)*.
   - **Langkah 2 (Buat User Database):** Masukkan username, misalnya: `sakip_user`
     - Generate password yang kuat (contoh: `P@ssw0rdPUPR2026!#`)
     *(Hasil username lengkap menjadi: `USERNAME_sakip_user`)*.
   - **Langkah 3 (Hak Akses):** Centang **ALL PRIVILEGES** ➔ klik **Make Changes**.
2. Simpan ketiga informasi tersebut untuk dimasukkan ke file `.env`:
   - **DB_DATABASE:** `USERNAME_sakip_pupr`
   - **DB_USERNAME:** `USERNAME_sakip_user`
   - **DB_PASSWORD:** `[Password yang dibuat tadi]`

---

## 5. LANGKAH 3: CLONE REPOSITORI GITHUB KE CPANEL

### Opsi A: Menggunakan Terminal SSH (Paling Cepat)
1. Buka menu **Terminal** di cPanel.
2. Jalankan perintah untuk meng-clone repositori langsung dari GitHub:

```bash
cd ~
git clone https://github.com/Msb-biz-Id/g4but.git ekasuarirepack
cd ekasuarirepack
```

*(Jika repositori bersifat **Private**, gunakan SSH Key cPanel yang dipasang ke Deploy Keys GitHub, atau gunakan Personal Access Token GitHub saat diminta).*

### Opsi B: Menggunakan Fitur Git™ Version Control di cPanel
1. Masuk ke cPanel ➔ menu **Git™ Version Control**.
2. Klik tombol **Create**:
   - **Clone URL:** `https://github.com/Msb-biz-Id/g4but.git`
   - **Repository Path:** `ekasuarirepack`
   - **Repository Name:** `ekasuarirepack`
3. Klik **Create**.

---

## 6. LANGKAH 4: KONFIGURASI FILE `.env` DI CPANEL

Di dalam Terminal cPanel, masuk ke folder proyek dan buat file `.env`:

```bash
cd ~/ekasuarirepack
cp .env.example .env
nano .env
```

Sesuaikan nilai-nilai kunci berikut di file `.env`:

```ini
APP_NAME="e-SAKIP Dinas PUPR"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://pupr.msb.biz.id

APP_LOCALE=id
APP_FALLBACK_LOCALE=id
APP_TIMEZONE=Asia/Jayapura
DB_TIMEZONE=+09:00

LOG_CHANNEL=daily
LOG_LEVEL=warning
LOG_DAILY_DAYS=30

# ── Konfigurasi Database MySQL cPanel ──
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=USERNAME_sakip_pupr
DB_USERNAME=USERNAME_sakip_user
DB_PASSWORD=P@ssw0rdPUPR2026!#

# ── Konfigurasi Driver & Storage ──
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
CACHE_STORE=file
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false

# ── Email Notifikasi (Email Domain cPanel) ──
MAIL_MAILER=smtp
MAIL_HOST=mail.msb.biz.id
MAIL_PORT=465
MAIL_USERNAME=pupr@msb.biz.id
MAIL_PASSWORD=PasswordEmailAkunAnda
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="pupr@msb.biz.id"
MAIL_FROM_NAME="e-SAKIP Dinas PUPR"
```

Simpan file dengan menekan `Ctrl + O` ➔ `Enter` ➔ lalu keluar dengan `Ctrl + X`.

---

## 7. LANGKAH 5: EKSEKUSI DEPENDENSI, KUNCI, & MIGRASI DATA

Jalankan rangkaian perintah berikut di Terminal cPanel:

```bash
cd ~/ekasuarirepack

# 1. Pasang dependensi PHP produksi (tanpa package dev)
composer install --no-dev --optimize-autoloader

# 2. Buat App Encryption Key
php artisan key:generate --force

# 3. Jalankan Migrasi Database MySQL (Semua 74 tabel InnoDB)
php artisan migrate --force

# 4. Jalankan Seeder Komprehensif (Multi-tahun 2024-2026, Akun Dinas PUPR, Cascading, IKU)
php artisan db:seed --force

# 5. Hubungkan direktori storage file upload ke public
php artisan storage:link

# 6. Optimasi Cache Laravel untuk Kecepatan Maksimal
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 8. LANGKAH 6: SETTING PERMISSION DIREKTORI STORAGE & CACHE

Pastikan server web Apache cPanel memiliki izin menulis pada folder penyimpanan file dan cache:

```bash
cd ~/ekasuarirepack
chmod -R 775 storage bootstrap/cache
chmod -R 775 storage/framework
chmod -R 775 storage/logs
```

---

## 9. LANGKAH 7: SETUP CRON JOB DI CPANEL (PENTING)

Fitur Early Warning System (EWS), pengingat deadline pelaporan triwulan, dan rekalkulasi kinerja otomatis memerlukan scheduler Laravel yang aktif setiap menit.

1. Buka menu **Cron Jobs** di cPanel.
2. Pada **Common Settings**, pilih: `* * * * * (Once Per Minute)`.
3. Di kolom **Command**, masukkan:
   ```bash
   /usr/local/bin/php /home/USERNAME/ekasuarirepack/artisan schedule:run >> /dev/null 2>&1
   ```
   *(Ganti `USERNAME` dengan nama akun cPanel Anda. Sesuaikan path binary PHP jika menggunakan PHP versi khusus, misalnya `/usr/local/bin/ea-php82`)*.
4. Klik **Add New Cron Job**.

---

## 10. CARA PEMBARUAN (UPDATE KODE DARI GITHUB DI MASA DEPAN)

Ketika Anda melakukan update kode di lokal dan telah melakukan `git push origin main`, Anda cukup memperbarui server cPanel dengan salah satu cara berikut:

### Cara 1: Sekali Perintah di Terminal cPanel
```bash
cd ~/ekasuarirepack
git pull origin main
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Cara 2: 1-Klik Melalui Menu cPanel Git™ Version Control
File `.cpanel.yml` telah disediakan di repositori ini. Di antarmuka cPanel:
1. Buka menu **Git™ Version Control**.
2. Klik **Manage** pada `ekasuarirepack`.
3. Masuk ke tab **Pull or Deploy**.
4. Klik **Update from Remote**, lalu klik **Deploy Head Commit**.

---

## 11. AKUN OPERASIONAL STANDAR UNTUK PENGUJIAN

Setelah seeder dijalankan, sistem langsung siap digunakan dengan akun dinas:

- **URL Login:** `https://pupr.msb.biz.id/login`
- **Password Default Seluruh Akun:** `Password@123`

| Peran (Role) | Akun Email | Keterangan / Wewenang |
|---|---|---|
| **Super Admin** | `superadmin@esakip.local` | Akses teknis penuh, konfigurasi aplikasi & audit log |
| **Kepala Dinas PUPR** | `kepala.opd@esakip.local` | Pimpinan OPD, pengesahan dokumen perencanaan & PK |
| **Admin Dinas PUPR** | `admin.opd@esakip.local` | Penginputan master data, pohon kinerja, & target IKU |
| **Sekretaris Dinas** | `sekretaris@esakip.local` | Verifikator administrasi, SAKIP sekretariat |
| **Kabid Bina Marga** | `kabid.binamarga@esakip.local` | Pengampu program jalan & jembatan |
| **Kabid Cipta Karya** | `kabid.ciptakarya@esakip.local` | Pengampu program gedung & air minum |
| **Kabid Sumber Daya Air** | `kabid.sda@esakip.local` | Pengampu program irigasi & drainase |
| **Kabid Penataan Ruang** | `kabid.penataanruang@esakip.local` | Pengampu tata ruang & jasa konstruksi |

> 🔒 **Keamanan:** Segera ubah password default melalui menu **Profil Akun** setelah pertama kali login di server live.
