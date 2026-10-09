import type { ThemeConfig } from '@/types';

// ─── Dark/Light Mode ─────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ekasuari-theme';

let cachedThemeConfig: ThemeConfig | null = null;

export function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): ThemePreference {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyTheme(preference: ThemePreference): void {
    if (typeof document === 'undefined') return;
    const dark =
        preference === 'dark' || (preference === 'system' && getSystemTheme() === 'dark');
    document.documentElement.classList.toggle('dark', dark);

    // Langsung perbarui HSL warna utama saat switch dark/light mode
    if (cachedThemeConfig) {
        const root = document.documentElement;
        const hsl = dark ? cachedThemeConfig.primaryHslDark : cachedThemeConfig.primaryHsl;
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--ring', hsl);
    }
}

export function storeTheme(preference: ThemePreference): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
        // abaikan (mis. mode privat)
    }
    applyTheme(preference);
}

// ─── Color, Radius, Font ─────────────────────────────────────────────────────

/**
 * Terapkan semua pengaturan tema dari server (via Inertia shared props)
 * ke CSS custom properties di :root secara instan.
 */
export function applyServerTheme(theme: ThemeConfig): void {
    if (typeof document === 'undefined') return;

    cachedThemeConfig = { ...theme };
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');

    // Warna primer
    const hsl = isDark ? theme.primaryHslDark : theme.primaryHsl;
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);

    // Border radius
    root.style.setProperty('--radius', `${theme.radius}rem`);

    // Font
    injectGoogleFont(theme.fontHeading);
    if (theme.fontBody !== theme.fontHeading) {
        injectGoogleFont(theme.fontBody);
    }
    root.style.setProperty('--font-heading', `"${theme.fontHeading}", sans-serif`);
    root.style.setProperty('--font-body', `"${theme.fontBody}", sans-serif`);
}

/**
 * Preview tema secara live (tanpa delay & tanpa reload DB).
 * Dipanggil dari ThemePanel saat user memilih warna/radius/font.
 */
export function previewTheme(partial: Partial<ThemeConfig>): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const isDark = root.classList.contains('dark');

    if (cachedThemeConfig) {
        cachedThemeConfig = { ...cachedThemeConfig, ...partial };
    }

    if (partial.primaryHsl !== undefined) {
        const hsl = isDark ? (partial.primaryHslDark ?? partial.primaryHsl) : partial.primaryHsl;
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--ring', hsl);
    }
    if (partial.radius !== undefined) {
        root.style.setProperty('--radius', `${partial.radius}rem`);
    }
    if (partial.fontHeading !== undefined) {
        injectGoogleFont(partial.fontHeading);
        root.style.setProperty('--font-heading', `"${partial.fontHeading}", sans-serif`);
    }
    if (partial.fontBody !== undefined) {
        injectGoogleFont(partial.fontBody);
        root.style.setProperty('--font-body', `"${partial.fontBody}", sans-serif`);
    }
}

/** Inject link Google Fonts jika belum ada. */
function injectGoogleFont(family: string): void {
    if (typeof document === 'undefined') return;
    const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    const encoded = encodeURIComponent(family);
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initTheme(): void {
    applyTheme(getStoredTheme());

    if (typeof window === 'undefined') return;
    window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
            if (getStoredTheme() === 'system') applyTheme('system');
        });
}