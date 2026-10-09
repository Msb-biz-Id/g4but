import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format string tanggal / objek Date menjadi format 'd-m-Y' (contoh: 06-09-2026).
 */
export function formatDate(date?: string | Date | null): string {
    if (!date) return '-';
    if (typeof date === 'string') {
        const trimmed = date.trim();
        // Jika sudah dalam format d-m-Y atau diawali d-m-Y
        const dmyMatch = trimmed.match(/^(\d{2}-\d{2}-\d{4})/);
        if (dmyMatch) {
            return dmyMatch[1];
        }
        // Jika format YYYY-MM-DD atau ISO 8601 YYYY-MM-DDTHH:mm:ss...
        const datePart = trimmed.split(/[T ]/)[0];
        const parts = datePart.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        }
    }
    const normalized = typeof date === 'string' && date.includes(' ') && !date.includes('T') ? date.replace(' ', 'T') : date;
    const d = typeof normalized === 'string' ? new Date(normalized) : normalized;
    if (isNaN(d.getTime())) {
        return String(date);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Format string tanggal & waktu menjadi format 'd-m-Y H:i' (contoh: 06-09-2026 14:30).
 */
export function formatDateTime(date?: string | Date | null): string {
    if (!date) return '-';
    if (typeof date === 'string') {
        const trimmed = date.trim();
        // Jika sudah dalam format d-m-Y H:i
        if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(trimmed)) {
            return trimmed;
        }
    }
    const normalized = typeof date === 'string' && date.includes(' ') && !date.includes('T') ? date.replace(' ', 'T') : date;
    const d = typeof normalized === 'string' ? new Date(normalized) : normalized;
    if (isNaN(d.getTime())) {
        return formatDate(date);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
}

/**
 * Format angka nominal Rupiah utuh (contoh: "Rp 5.000.000" atau "5.000.000").
 */
export function formatRupiah(
    value: number | string | null | undefined,
    withPrefix: boolean = true
): string {
    if (value === null || value === undefined || value === '') return withPrefix ? 'Rp 0' : '0';
    const num = Number(value);
    if (isNaN(num)) return withPrefix ? 'Rp 0' : '0';

    const formatted = Math.round(num).toLocaleString('id-ID');
    return withPrefix ? `Rp ${formatted}` : formatted;
}

/**
 * Format angka nominal Rupiah secara adaptif & ringkas (Smart Compact Currency).
 * Menyesuaikan skala:
 * - >= 1 Triliun (1e12):  "Rp X,XX T"
 * - >= 1 Miliar (1e9):   "Rp X,XX M"
 * - >= 1 Juta (1e6):     "Rp X,XX Jt"
 * - >= 1 Ribu (1e3):     "Rp X.XXX"
 * - < 1 Ribu:            "Rp X"
 *
 * @param value Nominal angka yang ingin diformat
 * @param withPrefix Apakah menyertakan 'Rp ' di depan (default: true)
 * @param decimals Jumlah angka desimal (default: 2)
 */
export function formatRupiahCompact(
    value: number | string | null | undefined,
    withPrefix: boolean = true,
    decimals: number = 2
): string {
    if (value === null || value === undefined || value === '') return withPrefix ? 'Rp 0' : '0';
    const num = Number(value);
    if (isNaN(num)) return withPrefix ? 'Rp 0' : '0';
    if (num === 0) return withPrefix ? 'Rp 0' : '0';

    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    const prefix = withPrefix ? (sign ? `${sign}Rp ` : 'Rp ') : sign;

    if (abs >= 1_000_000_000_000) {
        const scaled = abs / 1_000_000_000_000;
        return `${prefix}${scaled.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} T`;
    }
    if (abs >= 1_000_000_000) {
        const scaled = abs / 1_000_000_000;
        return `${prefix}${scaled.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} M`;
    }
    if (abs >= 1_000_000) {
        const scaled = abs / 1_000_000;
        return `${prefix}${scaled.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} Jt`;
    }
    if (abs >= 1_000) {
        return `${prefix}${Math.round(abs).toLocaleString('id-ID')}`;
    }
    return `${prefix}${abs.toLocaleString('id-ID')}`;
}