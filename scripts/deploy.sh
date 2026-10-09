#!/usr/bin/env bash
# =============================================================
#  e-KASUARI — Deployment Script untuk Server Production
#  Jalankan di direktori root aplikasi di server production.
#
#  Penggunaan:
#    chmod +x scripts/deploy.sh
#    ./scripts/deploy.sh
#
#  Prasyarat:
#    - File .env sudah dikonfigurasi (salin dari .env.production)
#    - PHP 8.2+, Composer, Node.js 20+, PostgreSQL 16 sudah terpasang
#    - User menjalankan script ini punya akses write ke direktori aplikasi
# =============================================================

set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         e-KASUARI — Production Deployment Script          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 0. Validasi .env sudah ada ───────────────────────────────
if [ ! -f ".env" ]; then
    echo "❌  File .env tidak ditemukan!"
    echo "    Salin .env.production ke .env dan isi semua nilai <ISI_INI>."
    exit 1
fi

if grep -q "<ISI_INI>" .env; then
    echo "❌  File .env masih mengandung placeholder <ISI_INI>."
    echo "    Isi semua nilai yang diperlukan terlebih dahulu."
    exit 1
fi

# ── 1. Validasi APP_ENV dan APP_DEBUG ────────────────────────
APP_ENV_VAL=$(grep "^APP_ENV=" .env | cut -d '=' -f2)
APP_DEBUG_VAL=$(grep "^APP_DEBUG=" .env | cut -d '=' -f2)

if [ "$APP_ENV_VAL" != "production" ]; then
    echo "❌  APP_ENV bukan 'production' (nilai: $APP_ENV_VAL). Batalkan."
    exit 1
fi

if [ "$APP_DEBUG_VAL" = "true" ]; then
    echo "❌  APP_DEBUG=true di production! Batalkan."
    exit 1
fi

echo "✅  .env tervalidasi: APP_ENV=production, APP_DEBUG=false"

# ── 2. Backup database sebelum deploy ───────────────────────
echo ""
echo "🗄️  Membuat backup database sebelum deploy..."
DB_NAME=$(grep "^DB_DATABASE=" .env | cut -d '=' -f2)
DB_USER=$(grep "^DB_USERNAME=" .env | cut -d '=' -f2)
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d ' ')
BACKUP_FILE="/backup/ekasuari_pre_deploy_$(date +%Y%m%d_%H%M%S).dump"

mkdir -p /backup

if pg_dump -Fc -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" -f "$BACKUP_FILE" 2>/dev/null; then
    echo "✅  Backup tersimpan: $BACKUP_FILE"
else
    echo "⚠️  Backup database gagal — lanjut? (y/N)"
    read -r confirm
    if [ "$confirm" != "y" ]; then
        echo "    Deployment dibatalkan."
        exit 1
    fi
fi

# ── 3. Aktifkan maintenance mode ─────────────────────────────
echo ""
echo "🔧  Mengaktifkan maintenance mode..."
php artisan down --retry=60 --secret="ekasuari-bypass-$(date +%s)"

# ── 4. Pull kode terbaru ──────────────────────────────────────
echo ""
echo "📥  Mengambil kode terbaru dari repository..."
git pull origin main

# ── 5. Install dependencies PHP ──────────────────────────────
echo ""
echo "📦  Menginstall PHP dependencies (no-dev)..."
composer install --no-dev --optimize-autoloader --no-interaction --no-ansi

# ── 6. Build frontend ─────────────────────────────────────────
echo ""
echo "⚛️   Membangun frontend (React/TypeScript)..."
npm ci --silent
npm run build

# ── 7. Jalankan migrasi ───────────────────────────────────────
echo ""
echo "🗄️  Menjalankan migrasi database..."
php artisan migrate --force

# ── 8. Cache semua artefak ───────────────────────────────────
echo ""
echo "⚡  Mem-cache konfigurasi, route, view, dan event..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# ── 9. Restart queue workers ─────────────────────────────────
echo ""
echo "🔄  Merestart queue worker..."
php artisan queue:restart

# ── 10. Set permission storage ───────────────────────────────
echo ""
echo "📁  Mengatur permission storage..."
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# ── 11. Matikan maintenance mode ─────────────────────────────
echo ""
echo "✅  Mematikan maintenance mode..."
php artisan up

# ── 12. Smoke test ───────────────────────────────────────────
echo ""
echo "🔍  Menjalankan smoke test..."
APP_URL_VAL=$(grep "^APP_URL=" .env | cut -d '=' -f2)

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL_VAL" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "✅  Halaman utama merespons: HTTP $HTTP_STATUS"
else
    echo "⚠️  Halaman utama merespons HTTP $HTTP_STATUS — periksa log!"
fi

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL_VAL/health" 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅  Health endpoint OK: HTTP $HEALTH_STATUS"
else
    echo "⚠️  Health endpoint: HTTP $HEALTH_STATUS"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║             Deployment selesai! ✅                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Langkah berikutnya:"
echo "  1. Cek log: tail -f storage/logs/laravel.log"
echo "  2. Verifikasi login admin di $APP_URL_VAL/login"
echo "  3. Verifikasi halaman dashboard"
echo "  4. Pastikan queue worker berjalan: supervisorctl status"
echo ""
