# PANDUAN RUNNING & MIGRASI E-SAKIP DI CPANEL MENGGUNAKAN GITHUB

Panduan ini mendokumentasikan langkah demi langkah proses *deployment*, konfigurasi lingkungan produksi, migrasi basis data, dan otomatisasi sinkronisasi dari repositori GitHub ke server hosting cPanel (Shared Hosting / Cloud Hosting / VPS cPanel).

---

## 1. SPESIFIKASI & PRASYARAT SERVER CPANEL

Pastikan paket hosting cPanel memenuhi kriteria berikut:

| Komponen | Spesifikasi Minimum / Rekomendasi |
|---|---|
| **Versi PHP** | **PHP 8.2** atau **PHP 8.3** (Aktifkan via menu **MultiPHP Manager** di cPanel) |
| **Ekstensi PHP Wajib** | `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `intl`, `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip` |
| **Database Server** | MySQL 8.0+ atau MariaDB 10.4+ |
| **Akses Fitur cPanel** | - **Terminal (SSH)** (sangat direkomendasikan)<br>- **Git™ Version Control**<br>- **MySQL® Database Wizard**<br>- **Cron Jobs** |
| **Aset Frontend (Vite)** | Dibangun (*compiled*) di lokal/CI-CD (`npm run build`) sebelum dipush ke GitHub |

---

## 2. ARSITEKTUR STRUKTUR DIREKTORI DI CPANEL

Untuk keamanan tingkat instansi pemerintah, **JANGAN MENYIMPAN SOURCE CODE LANGSUNG DI DALAM `public_html`**. File sensitif seperti `.env`, berkas kode controller, dan vendor tidak boleh dapat diakses langsung oleh browser.

Gunakan struktur direktori terpisah:

```text
/home/cpanelusername/
│
├── ekasuarirepack/                <-- [DI LUAR public_html] Repositori Git Laravel (Aman)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/                    <-- Berkas publik Laravel (index.php, build/, favicon)
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   ├── .env                       <-- Konfigurasi rahasia produksi (Terlindung)
│   └── artisan
│
└── public_html/                   <-- Root web publik (dihubungkan via Symlink ke folder public)
```

---

## 3. LANGKAH 1: PERSIAPAN REPOSITORI GITHUB

### A. Pastikan Aset Frontend (Build) Tersedia
Karena kebanyakan shared hosting cPanel tidak memiliki Node.js versi terbaru, lakukan build aset frontend di lokal terlebih dahulu:

```bash
# Di komputer lokal Anda:
npm run build
```
Pastikan folder `public/build/` telah ter-generate (berisi file JavaScript, CSS, dan `manifest.json`).

### B. Push Kode ke Repositori GitHub
Pastikan branch `main` sudah terdorong ke GitHub:
```bash
git add .
git commit -m "chore: prepare production build for cpanel deployment"
git push origin main
```

---

## 4. LANGKAH 2: SETUP GIT VERSION CONTROL DI CPANEL

### A. Generate SSH Key di cPanel
1. Masuk ke **cPanel** ➔ pilih menu **SSH Access** (atau **Manage SSH Keys**).
2. Klik **Generate a New Key**:
   - **Key Name:** `id_rsa_github`
   - **Key Password:** Kosongkan (atau isi jika ingin mengamankan passphrase)
   - **Key Type:** RSA (Ukuran 4096)
3. Klik **Generate Key**.
4. Di bagian *Public Keys*, klik **Manage** pada key yang baru dibuat ➔ klik **Authorize**.
5. Klik **View/Download** pada Public Key, lalu **Salin (Copy)** seluruh teks kunci publik tersebut.

### B. Pasang Deploy Key di GitHub
1. Buka repositori proyek Anda di **GitHub**.
2. Masuk ke tab **Settings** ➔ pilih **Deploy Keys** di sidebar kiri.
3. Klik tombol **Add deploy key**:
   - **Title:** `cPanel Server e-SAKIP`
   - **Key:** Tempel (*Paste*) Public Key yang disalin dari cPanel tadi.
   - Centang *"Allow write access"* jika ingin cPanel dapat push ke repo (opsional, untuk deploy cukup read access).
4. Klik **Add Key**.

### C. Clone Repositori ke cPanel
Buka menu **Terminal** di cPanel (atau gunakan SSH client seperti PuTTY / Terminal macOS):

```bash
# Masuk ke direktori home
cd ~

# Uji koneksi SSH ke GitHub
ssh -T git@github.com
# Ketik 'yes' jika muncul prompt fingerprint host

# Clone repositori ke folder di luar public_html
git clone git@github.com:USERNAME/REPO_NAME.git ekasuarirepack

# Masuk ke direktori proyek
cd ekasuarirepack
```

> **Alternatif GUI:** Anda juga dapat menggunakan antarmuka **Git™ Version Control** di cPanel:
> - Klik **Create**
> - Masukkan Clone URL: `git@github.com:USERNAME/REPO_NAME.git`
> - Repository Path: `ekasuarirepack`
> - Klik **Create**.

---

## 5. LANGKAH 3: SETUP DATABASE MYSQL DI CPANEL

1. Buka menu **MySQL® Database Wizard** di cPanel:
   - **Step 1:** Buat Database baru, misalnya: `cpaneluser_esakip`
   - **Step 2:** Buat User Database, misalnya: `cpaneluser_sakipadm` dengan password yang kuat.
   - **Step 3:** Tambahkan User ke Database dan centang **ALL PRIVILEGES**.
   - Catat: **Nama Database**, **Username**, dan **Password**.

---

## 6. LANGKAH 4: KONFIGURASI FILE `.env` DI CPANEL

Salin template konfigurasi dan sesuaikan untuk environment produksi:

```bash
cd ~/ekasuarirepack
cp .env.example .env
nano .env
```

Sesuaikan baris-baris kunci berikut di dalam `.env`:

```ini
APP_NAME=e-SAKIP
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://sakip.mimikakab.go.id

LOG_CHANNEL=daily
LOG_LEVEL=error

# ── Konfigurasi Database MySQL cPanel ──
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cpaneluser_esakip
DB_USERNAME=cpaneluser_sakipadm
DB_PASSWORD=PasswordDatabaseKuatAnda123!

# ── Konfigurasi Sesi, Cache, & Antrian ──
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
CACHE_STORE=file
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false

# ── Pengaturan Mail Server (SMTP cPanel) ──
MAIL_MAILER=smtp
MAIL_HOST=mail.mimikakab.go.id
MAIL_PORT=465
MAIL_USERNAME=notifikasi@mimikakab.go.id
MAIL_PASSWORD=PasswordEmailAnda
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="notifikasi@mimikakab.go.id"
MAIL_FROM_NAME="e-SAKIP PUPR Mimika"
```

Simpan file (`Ctrl + O`, lalu `Enter`, kemudian `Ctrl + X` untuk nano).

---

## 7. LANGKAH 5: INSTALASI DEPENDENCY & MIGRASI DATA

Jalankan perintah-perintah berikut di Terminal cPanel:

```bash
cd ~/ekasuarirepack

# 1. Install dependensi PHP untuk produksi (tanpa dev package)
composer install --no-dev --optimize-autoloader

# 2. Generate Application Encryption Key
php artisan key:generate --force

# 3. Jalankan Migrasi Database MySQL
php artisan migrate --force

# 4. Jalankan Seeder Komprehensif (Multi-Tahun 2024-2026 & Master Data PUPR Mimika)
php artisan db:seed --force

# 5. Buat tautan simbolik direktori storage ke public
php artisan storage:link

# 6. Optimasi Cache Laravel untuk Kecepatan Produksi Maksimal
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 8. LANGKAH 6: MENGHUBUNGKAN KE `public_html`

Agar domain Anda menampilkan aplikasi Laravel yang berada di `~/ekasuarirepack/public`:

### Opsi A: Menggunakan Symlink (Sangat Direkomendasikan)
Di terminal cPanel:

```bash
cd ~

# Backup atau hapus public_html lama (pastikan isinya kosong/sudah dibackup)
mv public_html public_html_backup

# Buat symbolic link dari folder public proyek menjadi public_html
ln -s /home/cpanelusername/ekasuarirepack/public public_html
```

### Opsi B: Jika Menggunakan Subdomain / Addon Domain
1. Masuk ke cPanel ➔ **Domains** (atau **Subdomains**).
2. Ubah **Document Root** domain tersebut langsung mengarah ke:
   `/home/cpanelusername/ekasuarirepack/public`
3. Klik **Save**.

### Opsi C: Menggunakan `.htaccess` di dalam `public_html` (Jika Symlink Dilarang)
Jika penyedia hosting Anda menonaktifkan symlink, letakkan file `.htaccess` di dalam folder `public_html` dengan isi berikut:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^$ ../ekasuarirepack/public/ [L]
    RewriteRule (.*) ../ekasuarirepack/public/$1 [L]
</IfModule>
```

---

## 9. LANGKAH 7: ATUR PERMISSION DIREKTORI

Pastikan web server Apache dapat menulis ke folder cache dan upload:

```bash
cd ~/ekasuarirepack
chmod -R 775 storage bootstrap/cache
chmod -R 775 storage/framework
chmod -R 775 storage/logs
```

---

## 10. LANGKAH 8: SETUP CRON JOB OTOMATIS DI CPANEL

Laravel membutuhkan Scheduler untuk menjalankan Early Warning System (EWS), notifikasi batas waktu pelaporan, dan evaluasi otomatis.

1. Buka menu **Cron Jobs** di cPanel.
2. Di bagian **Common Settings**, pilih: `* * * * * (Once Per Minute)`.
3. Di kolom **Command**, masukkan baris berikut (sesuaikan path username cPanel Anda):

```bash
/usr/local/bin/php /home/cpanelusername/ekasuarirepack/artisan schedule:run >> /dev/null 2>&1
```
*(Ganti `/usr/local/bin/php` dengan path PHP 8.2/8.3 sesuai informasi di menu Server Information cPanel).*
4. Klik **Add New Cron Job**.

---

## 11. LANGKAH 9: OTOMATISASI UPDATE DARI GITHUB (CI/CD)

Saat ada pembaruan kode baru di masa mendatang, Anda dapat melakukan update dengan mudah:

### Metode 1: Pull Manual via Terminal cPanel
```bash
cd ~/ekasuarirepack
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Metode 2: Menggunakan `.cpanel.yml` (Deploy via cPanel Git UI)
Buat file bernama `.cpanel.yml` di root proyek repositori Anda:

```yaml
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/cpanelusername/ekasuarirepack
    - /bin/cp -R * $DEPLOYPATH
    - cd $DEPLOYPATH
    - php artisan migrate --force
    - php artisan config:cache
    - php artisan route:cache
    - php artisan view:cache
```
Setiap kali Anda menekan tombol **Update from Remote** lalu **Deploy Head Commit** di menu **Git Version Control** cPanel, proses di atas akan dieksekusi otomatis.

### Metode 3: GitHub Actions Auto Deploy via SSH (Paling Modern)
Buat file `.github/workflows/deploy.yml` di repositori GitHub Anda:

```yaml
name: Deploy to cPanel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.2'

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Build Frontend Assets
      run: |
        npm ci
        npm run build

    - name: Deploy via SSH to cPanel
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.CPANEL_HOST }}
        username: ${{ secrets.CPANEL_USERNAME }}
        key: ${{ secrets.CPANEL_SSH_KEY }}
        port: ${{ secrets.CPANEL_PORT || 22 }}
        script: |
          cd ~/ekasuarirepack
          git pull origin main
          composer install --no-dev --optimize-autoloader
          php artisan migrate --force
          php artisan optimize:clear
          php artisan config:cache
          php artisan route:cache
          php artisan view:cache
```

---

## 12. PANDUAN PENANGANAN MASALAH (TROUBLESHOOTING)

| Masalah / Error | Penyebab | Solusi |
|---|---|---|
| **Error 500 (Internal Server Error)** | Permission folder `storage` atau file `.env` salah | Jalankan: `chmod -R 775 storage bootstrap/cache` dan pastikan `.env` memiliki `APP_KEY`. |
| **Vite manifest not found at: .../manifest.json** | Folder `public/build` belum diunggah | Jalankan `npm run build` di lokal, pastikan folder `public/build` ter-commit dan ter-push ke GitHub, lalu pull di cPanel. |
| **Mixed Content / HTTP vs HTTPS** | Skema URL tidak sesuai sertifikat SSL | Buka `.env`, pastikan `APP_URL=https://domainanda.com` dan aktifkan `Force HTTPS Redirect` di menu **Domains** cPanel. |
| **Database Connection Refused** | Host, nama DB, atau password salah | Periksa `.env`. Di cPanel, host umumnya adalah `127.0.0.1` atau `localhost`. Pastikan user database sudah diberikan **ALL PRIVILEGES**. |
| **PDF Cetak Error / Font Tidak Muncul** | Folder temporary PDF belum ada | Pastikan direktori `storage/fonts` dan `storage/app` ada dan memiliki permission `775`. |

---

## 13. DAFTAR AKUN STANDAR SETELAH MIGRASI SEEDER

Setelah perintah `php artisan db:seed --force` selesai, sistem langsung memiliki akun operasional standar:

- **Password Default Seluruh Akun:** `Password@123`
- **Super Administrator Sistem:** `superadmin@esakip.local`
- **Kepala Dinas PUPR (Checker OPD):** `kepala.opd@esakip.local`
- **Admin Dinas PUPR (Maker OPD):** `admin.opd@esakip.local`
- **Sekretaris Dinas PUPR:** `sekretaris@esakip.local`
- **Kepala Bidang Bina Marga:** `kabid.binamarga@esakip.local`
- **Kepala Bidang Cipta Karya:** `kabid.ciptakarya@esakip.local`

*(Wajib mengganti password default melalui menu Profil Akun setelah pertama kali login di lingkungan produksi).*
