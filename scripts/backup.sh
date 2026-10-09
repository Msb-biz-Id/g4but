#!/usr/bin/env bash
# =============================================================
#  e-KASUARI — Script Backup Otomatis (FR-OPS-BAK)
#  Mengacu: docs/BACKUP_RESTORE_ROLLBACK.md, BRD §31
#
#  Penggunaan (crontab -e):
#    # Backup DB jam 02:00 setiap hari
#    0 2 * * * /var/www/ekasuari/scripts/backup.sh db  >> /var/log/ekasuari-backup.log 2>&1
#    # Backup storage jam 03:00 setiap hari
#    0 3 * * * /var/www/ekasuari/scripts/backup.sh storage >> /var/log/ekasuari-backup.log 2>&1
#    # Hapus backup lebih dari 30 hari jam 04:00
#    0 4 * * * /var/www/ekasuari/scripts/backup.sh cleanup >> /var/log/ekasuari-backup.log 2>&1
#
#  Prasyarat:
#    - File .env sudah dikonfigurasi di /var/www/ekasuari/.env
#    - pg_dump tersedia (postgresql-client)
#    - Direktori /backup sudah dibuat dan writable
#    - BACKUP_DIR bisa diarahkan ke mount NFS / S3 Fuse / rclone mount
# =============================================================

set -euo pipefail

# ── Konfigurasi ──────────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/var/www/ekasuari}"
BACKUP_DIR="${BACKUP_DIR:-/backup/ekasuari}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [backup.sh]"

# Baca variabel dari .env aplikasi
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "$LOG_PREFIX ERROR: File .env tidak ditemukan di $ENV_FILE"
    exit 1
fi

DB_CONNECTION=$(grep "^DB_CONNECTION=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \r')
DB_HOST=$(grep "^DB_HOST=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \r')
DB_PORT=$(grep "^DB_PORT=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \r')
DB_DATABASE=$(grep "^DB_DATABASE=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \r')
DB_USERNAME=$(grep "^DB_USERNAME=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \r')
DB_PASSWORD=$(grep "^DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' \r')

MODE="${1:-db}"

# ── Pastikan direktori backup ada ────────────────────────────────────────────
mkdir -p "$BACKUP_DIR/database"
mkdir -p "$BACKUP_DIR/storage"

# =============================================================================
# MODE: db — Backup database PostgreSQL
# =============================================================================
backup_database() {
    if [ "$DB_CONNECTION" != "pgsql" ]; then
        echo "$LOG_PREFIX WARN: DB_CONNECTION bukan pgsql ($DB_CONNECTION). Skip backup DB."
        return 0
    fi

    BACKUP_FILE="$BACKUP_DIR/database/ekasuari_${TIMESTAMP}.dump"

    echo "$LOG_PREFIX INFO: Memulai backup database $DB_DATABASE → $BACKUP_FILE"

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -Fc \
        -h "$DB_HOST" \
        -p "${DB_PORT:-5432}" \
        -U "$DB_USERNAME" \
        "$DB_DATABASE" \
        -f "$BACKUP_FILE"

    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

    if [ ! -s "$BACKUP_FILE" ]; then
        echo "$LOG_PREFIX ERROR: Backup file kosong! Backup gagal."
        rm -f "$BACKUP_FILE"
        exit 1
    fi

    echo "$LOG_PREFIX OK: Backup database selesai. Ukuran: $BACKUP_SIZE → $BACKUP_FILE"

    # Verifikasi file backup dapat dibuka
    if PGPASSWORD="$DB_PASSWORD" pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
        echo "$LOG_PREFIX OK: Verifikasi backup berhasil (pg_restore --list)"
    else
        echo "$LOG_PREFIX WARN: Verifikasi backup gagal — periksa file secara manual"
    fi
}

# =============================================================================
# MODE: storage — Backup file storage (evidence, dokumen)
# =============================================================================
backup_storage() {
    STORAGE_SOURCE="$APP_DIR/storage/app/private"

    if [ ! -d "$STORAGE_SOURCE" ]; then
        echo "$LOG_PREFIX WARN: Direktori storage tidak ada: $STORAGE_SOURCE. Skip."
        return 0
    fi

    BACKUP_FILE="$BACKUP_DIR/storage/ekasuari_storage_${TIMESTAMP}.tar.gz"

    echo "$LOG_PREFIX INFO: Memulai backup storage → $BACKUP_FILE"

    tar -czf "$BACKUP_FILE" -C "$APP_DIR/storage" app/private

    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

    if [ ! -s "$BACKUP_FILE" ]; then
        echo "$LOG_PREFIX ERROR: Archive storage kosong! Backup gagal."
        rm -f "$BACKUP_FILE"
        exit 1
    fi

    echo "$LOG_PREFIX OK: Backup storage selesai. Ukuran: $BACKUP_SIZE → $BACKUP_FILE"
}

# =============================================================================
# MODE: cleanup — Hapus backup lama (lebih dari RETENTION_DAYS hari)
# =============================================================================
cleanup_old_backups() {
    echo "$LOG_PREFIX INFO: Menghapus backup lebih dari $RETENTION_DAYS hari..."

    DB_DELETED=$(find "$BACKUP_DIR/database" -name "*.dump" -mtime +$RETENTION_DAYS -print -delete 2>/dev/null | wc -l)
    STG_DELETED=$(find "$BACKUP_DIR/storage" -name "*.tar.gz" -mtime +$RETENTION_DAYS -print -delete 2>/dev/null | wc -l)

    echo "$LOG_PREFIX OK: Dihapus $DB_DELETED file database backup, $STG_DELETED file storage backup."

    # Tampilkan sisa backup
    DB_COUNT=$(find "$BACKUP_DIR/database" -name "*.dump" 2>/dev/null | wc -l)
    STG_COUNT=$(find "$BACKUP_DIR/storage" -name "*.tar.gz" 2>/dev/null | wc -l)
    echo "$LOG_PREFIX INFO: Sisa: $DB_COUNT backup database, $STG_COUNT backup storage."
}

# =============================================================================
# MODE: status — Tampilkan ringkasan backup terbaru
# =============================================================================
backup_status() {
    echo "$LOG_PREFIX === Status Backup e-KASUARI ==="

    LATEST_DB=$(find "$BACKUP_DIR/database" -name "*.dump" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')
    if [ -n "$LATEST_DB" ]; then
        LATEST_DB_SIZE=$(du -sh "$LATEST_DB" | cut -f1)
        LATEST_DB_DATE=$(stat -c '%y' "$LATEST_DB" | cut -d'.' -f1)
        echo "$LOG_PREFIX DB terbaru: $LATEST_DB ($LATEST_DB_SIZE) — $LATEST_DB_DATE"
    else
        echo "$LOG_PREFIX DB terbaru: TIDAK ADA"
    fi

    LATEST_STG=$(find "$BACKUP_DIR/storage" -name "*.tar.gz" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')
    if [ -n "$LATEST_STG" ]; then
        LATEST_STG_SIZE=$(du -sh "$LATEST_STG" | cut -f1)
        LATEST_STG_DATE=$(stat -c '%y' "$LATEST_STG" | cut -d'.' -f1)
        echo "$LOG_PREFIX Storage terbaru: $LATEST_STG ($LATEST_STG_SIZE) — $LATEST_STG_DATE"
    else
        echo "$LOG_PREFIX Storage terbaru: TIDAK ADA"
    fi
}

# ── Dispatcher ───────────────────────────────────────────────────────────────
case "$MODE" in
    db)       backup_database ;;
    storage)  backup_storage ;;
    cleanup)  cleanup_old_backups ;;
    status)   backup_status ;;
    all)
        backup_database
        backup_storage
        cleanup_old_backups
        backup_status
        ;;
    *)
        echo "Penggunaan: $0 {db|storage|cleanup|status|all}"
        exit 1
        ;;
esac
