import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import ThemeToggle from '@/Components/ThemeToggle';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ScrollToTop from '@/Components/ScrollToTop';
import { FlashToaster } from '@/Components/FlashToaster';
import { applyServerTheme } from '@/lib/theme';
import {
    AlertTriangle,
    BrainCircuit,
    FileBarChart2,
    Lock,
    X,
    BookOpen,
} from 'lucide-react';

// ─── Tipe item nav ────────────────────────────────────────────────────────────
interface NavItem {
    id: string;
    label: string;
    href: string;
    /** true = menu sensitif, publik harus login untuk akses */
    requiresLogin?: boolean;
    /** ikon kecil di samping label (hanya untuk menu sensitif) */
    icon?: React.ElementType;
    /** tooltip badge kecil (misal "Live", "AI") */
    badge?: string;
}

// ─── Dialog "Perlu Login" ─────────────────────────────────────────────────────
function LoginRequiredModal({
    open,
    feature,
    icon: Icon,
    onClose,
}: {
    open: boolean;
    feature: string;
    icon?: React.ElementType;
    onClose: () => void;
}) {
    // Tutup dengan ESC
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Tombol tutup */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-muted dark:hover:text-foreground transition"
                    aria-label="Tutup"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-6">
                    {/* Ikon fitur */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20">
                        {Icon ? (
                            <Icon className="h-7 w-7 text-primary" />
                        ) : (
                            <Lock className="h-7 w-7 text-primary" />
                        )}
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-foreground">
                        Akses Khusus Internal
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
                        Fitur <span className="font-semibold text-gray-900 dark:text-foreground">{feature}</span> hanya
                        tersedia untuk pengguna internal Pemerintah Provinsi Papua Barat yang telah terautentikasi.
                    </p>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Link
                            href={route('login')}
                            className="flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                        >
                            Masuk ke Sistem
                        </Link>
                        <button
                            onClick={onClose}
                            className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-slate-50 transition dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                        >
                            Kembali
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Layout Utama ─────────────────────────────────────────────────────────────
export default function PublicLayout({
    children,
    active = 'home',
    hideFooter = false,
}: PropsWithChildren<{ active?: 'home' | 'info' | 'laporan'; hideFooter?: boolean }>) {
    const { auth, theme } = usePage<PageProps>().props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [spy, setSpy] = useState('beranda');

    // State modal "Perlu Login"
    const [loginModal, setLoginModal] = useState<{
        open: boolean;
        feature: string;
        icon?: React.ElementType;
    }>({ open: false, feature: '' });

    // Apply server theme
    useEffect(() => {
        if (theme) applyServerTheme(theme);
    }, [theme]);

    const homeUrl = route('home');
    const infoUrl = route('knowledge.public.index');

    // ─── Navigasi Publik Inti (Sesuai Baseline DEC-003, MOD-001..MOD-003, AC-004) ───
    const navSections: NavItem[] = [
        { id: 'beranda', label: 'Beranda', href: homeUrl },
        // { id: 'modul',   label: 'Modul',   href: `${homeUrl}#modul` }, // Hidden sesuai permintaan
        {
            id: 'laporan',
            label: 'Laporan Publik',
            href: route('laporan.publik.index'),
            requiresLogin: false,
            icon: FileBarChart2,
            badge: 'Publik',
        },
        {
            id: 'info',
            label: 'Informasi Publik',
            href: infoUrl,
            requiresLogin: false,
            icon: BookOpen,
            badge: 'Publik',
        },
        {
            id: 'ews',
            label: 'EWS',
            href: auth.user ? route('alerts.index') : '#',
            requiresLogin: true,
            icon: AlertTriangle,
            badge: 'Live',
        },
        {
            id: 'ai',
            label: 'AI Performance',
            href: auth.user ? route('ai.index') : '#',
            requiresLogin: true,
            icon: BrainCircuit,
            badge: 'AI',
        },
    ];

    // ─── Navigasi Sekunder (Untuk Footer & Drawer Mobile) ─────────────────────────
    const secondarySections = [
        // { id: 'sistem', label: 'Alur Kerja SAKIP', href: `${homeUrl}#sistem` }, // Hidden sesuai permintaan
        { id: 'faq',    label: 'Tanya Jawab (FAQ)', href: `${homeUrl}#faq` },
        { id: 'info',   label: 'Pusat Informasi & Regulasi', href: infoUrl },
    ];

    // ─── Handler klik nav ─────────────────────────────────────────────────────
    const handleNavClick = (
        e: React.MouseEvent,
        item: NavItem | { id: string; label: string; href: string; requiresLogin?: boolean; icon?: React.ElementType },
    ) => {
        // Menu sensitif & belum login → tampilkan modal
        if (item.requiresLogin && !auth.user) {
            e.preventDefault();
            setMobileOpen(false);
            setLoginModal({ open: true, feature: item.label, icon: item.icon });
            return;
        }

        // Navigasi publik (scroll ke section) — hanya di halaman home
        if (active === 'home' && !item.requiresLogin && item.id !== 'laporan' && item.id !== 'info') {
            if (item.id === 'beranda') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                history.pushState(null, '', homeUrl);
                setMobileOpen(false);
            } else if (item.href.includes('#')) {
                const hash = item.href.split('#')[1];
                const el = document.getElementById(hash);
                if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth' });
                    history.pushState(null, '', `#${hash}`);
                    setMobileOpen(false);
                }
            }
        } else {
            setMobileOpen(false);
        }
    };

    // Auto scroll ke hash saat pertama load
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash) {
            const hash = window.location.hash.replace('#', '');
            const targetEl = document.getElementById(hash);
            if (targetEl) {
                setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth' }), 200);
            }
        }
    }, []);

    // Scroll spy — header sticky
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Scroll spy — section aktif
    useEffect(() => {
        if (active !== 'home') return;
        const ids: string[] = [];
        const onScroll = () => {
            const marker = window.scrollY + window.innerHeight * 0.35;
            let current = 'beranda';
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY;
                    if (top <= marker) current = id;
                }
            }
            setSpy(current);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [active]);

    // ─── Class helpers ────────────────────────────────────────────────────────
    const isActive = (item: NavItem) => {
        if (item.id === 'laporan') {
            return (
                active === 'laporan' ||
                (typeof window !== 'undefined' && window.location.pathname.startsWith('/laporan'))
            );
        }
        if (item.id === 'info') {
            return (
                active === 'info' ||
                (typeof window !== 'undefined' && window.location.pathname.startsWith('/informasi'))
            );
        }
        if (item.requiresLogin) return false;
        if (active === 'home') {
            if (typeof window !== 'undefined' && window.location.pathname.startsWith('/laporan')) {
                return false;
            }
            return spy === item.id;
        }
        return false;
    };

    const linkClass = (item: NavItem) => {
        const base =
            'group relative inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-all duration-300 px-3 py-1.5 rounded-lg';
        if (item.requiresLogin) {
            return `${base} text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted/50`;
        }
        return `${base} ${
            isActive(item)
                ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/20 dark:text-primary'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted/50'
        }`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">

            {/* ── Modal "Perlu Login" (AC-005) ───────────────────────────── */}
            <LoginRequiredModal
                open={loginModal.open}
                feature={loginModal.feature}
                icon={loginModal.icon}
                onClose={() => setLoginModal({ open: false, feature: '' })}
            />

            {/* ── Header / Navbar ─────────────────────────────────────────── */}
            <header
                className={`fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-border dark:bg-background/95 transition-all duration-300 ${
                    scrolled ? 'shadow-sm' : 'shadow-xs'
                }`}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
                    {/* Logo */}
                    <Link
                        href={route('home')}
                        onClick={(e) => {
                            if (active === 'home') {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                history.pushState(null, '', homeUrl);
                            }
                        }}
                        className="flex shrink-0 items-center gap-2.5"
                    >
                        <ApplicationLogo className="h-9 w-9 shrink-0 drop-shadow-sm transition-transform hover:scale-105" />
                        <div className="flex flex-col">
                            <span className="text-lg font-extrabold tracking-tight leading-none text-gray-900 dark:text-foreground">
                                e-KASUARI
                            </span>
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">
                                Pemprov Papua Barat
                            </span>
                        </div>
                    </Link>

                    {/* Nav Desktop */}
                    <nav className="hidden items-center gap-1.5 lg:flex">
                        {navSections.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={(e) => handleNavClick(e, item)}
                                className={linkClass(item)}
                            >
                                {item.icon && (
                                    <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                                )}
                                <span className="whitespace-nowrap">{item.label}</span>
                                {item.requiresLogin && !auth.user ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700/60 leading-none select-none">
                                        {item.badge && <span>{item.badge}</span>}
                                        <Lock className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                    </span>
                                ) : item.badge ? (
                                    <span
                                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none select-none ${
                                            item.badge === 'Live'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                : item.badge === 'AI'
                                                ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        }`}
                                    >
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        ))}

                        {/* Nav Desktop Selesai */}
                    </nav>

                    {/* Right Controls: Auth Button + Theme Toggle + Mobile Hamburger */}
                    <div className="flex items-center gap-2 sm:gap-2.5">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95 whitespace-nowrap"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                href={route('login')}
                                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-primary/40 hover:bg-slate-50 hover:text-primary dark:border-border dark:bg-card dark:text-slate-200 transition-all whitespace-nowrap"
                            >
                                <Lock className="h-3 w-3 text-slate-400" />
                                <span>Masuk</span>
                            </Link>
                        )}

                        <ThemeToggle />

                        <button
                            onClick={() => setMobileOpen((o) => !o)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg transition text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-accent lg:hidden"
                            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Nav Mobile */}
                {mobileOpen && (
                    <nav className="border-t border-gray-100 bg-white px-4 py-3 dark:border-border dark:bg-background lg:hidden">
                        <div className="flex flex-col gap-1">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                                Menu Utama
                            </div>
                            {navSections.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={(e) => handleNavClick(e, item)}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                                        isActive(item)
                                            ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/20 dark:text-primary'
                                            : item.requiresLogin
                                            ? 'text-gray-700 hover:bg-slate-50 hover:text-primary dark:text-gray-200 dark:hover:bg-muted/50'
                                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-accent'
                                    }`}
                                >
                                    {item.icon && (
                                        <item.icon className="h-4 w-4 shrink-0 text-primary/70" />
                                    )}
                                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                                    {item.requiresLogin && !auth.user ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400">
                                            {item.badge && <span>{item.badge}</span>}
                                            <Lock className="h-2.5 w-2.5" />
                                        </span>
                                    ) : item.badge ? (
                                        <span
                                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                                                item.badge === 'Live'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                    : item.badge === 'AI'
                                                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                            }`}
                                        >
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </Link>
                            ))}

                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-border">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                                    Informasi Tambahan
                                </div>
                                {secondarySections.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={(e) => handleNavClick(e, item)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-accent whitespace-nowrap"
                                    >
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>

                            {/* Auth Action */}
                            {auth.user ? (
                                <div className="mt-3 border-t border-gray-100 pt-2 dark:border-border">
                                    <Link
                                        href={route('dashboard')}
                                        className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                                    >
                                        Buka Dashboard
                                    </Link>
                                </div>
                            ) : (
                                <div className="mt-3 border-t border-slate-100 pt-2 dark:border-border">
                                    <Link
                                        href={route('login')}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-100 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted transition"
                                    >
                                        <Lock className="h-4 w-4 text-slate-500" />
                                        <span>Masuk ke Sistem</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </nav>
                )}
            </header>

            {/* ── Konten Halaman ─────────────────────────────────────────── */}
            <main className="pt-16">
                {children}
            </main>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            {!hideFooter && (
                <footer className="border-t border-slate-200/80 bg-slate-50/70 dark:border-border dark:bg-card">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                    <div className="grid gap-10 md:grid-cols-12">
                        {/* Kolom 1: Logo & Deskripsi (5 cols) */}
                        <div className="space-y-4 md:col-span-5">
                            <div className="flex items-center gap-3">
                                <ApplicationLogo className="h-10 w-10 shrink-0 drop-shadow-xs" />
                                <div>
                                    <div className="text-base font-extrabold tracking-tight text-gray-900 dark:text-foreground">
                                        e-KASUARI
                                    </div>
                                    <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                                        Pemerintah Provinsi Papua Barat
                                    </div>
                                </div>
                            </div>
                            <p className="max-w-sm text-xs leading-relaxed text-gray-600 dark:text-muted-foreground">
                                Sistem Informasi Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Terpadu untuk percepatan integrasi perencanaan, pengukuran capaian, evaluasi berkala, dan pelaporan kinerja daerah menuju Papua Barat Bangkit, Mandiri, dan Sejahtera.
                            </p>
                            <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-500 dark:text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Biro Organisasi Setda Provinsi Papua Barat</span>
                            </div>
                        </div>

                        {/* Kolom 2: Navigasi Sistem SAKIP (4 cols) */}
                        <div className="space-y-3 md:col-span-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-foreground">
                                Navigasi Sistem SAKIP
                            </div>
                            <ul className="space-y-2.5 text-xs text-gray-600 dark:text-muted-foreground">
                                <li>
                                    <Link
                                        href={homeUrl}
                                        onClick={(e) => handleNavClick(e, { id: 'beranda', label: 'Beranda', href: homeUrl })}
                                        className="transition-colors hover:text-primary"
                                    >
                                        Beranda Utama
                                    </Link>
                                </li>
                                {/* Hidden sesuai permintaan:
                                <li>
                                    <Link
                                        href={`${homeUrl}#modul`}
                                        onClick={(e) => handleNavClick(e, { id: 'modul', label: 'Modul', href: `${homeUrl}#modul` })}
                                        className="transition-colors hover:text-primary"
                                    >
                                        Modul Fungsional SAKIP
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href={`${homeUrl}#sistem`}
                                        onClick={(e) => handleNavClick(e, { id: 'sistem', label: 'Alur Kerja SAKIP', href: `${homeUrl}#sistem` })}
                                        className="transition-colors hover:text-primary"
                                    >
                                        Alur Kerja 4 Tahap SAKIP
                                    </Link>
                                </li>
                                */}
                                <li>
                                    <Link
                                        href={route('laporan.publik.index')}
                                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                                    >
                                        <span>Laporan Kinerja Publik</span>
                                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary dark:bg-primary/20">
                                            Publik
                                        </span>
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Kolom 3: Layanan & Regulasi (3 cols) */}
                        <div className="space-y-3 md:col-span-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-foreground">
                                Informasi & Layanan
                            </div>
                            <ul className="space-y-2.5 text-xs text-gray-600 dark:text-muted-foreground">
                                <li>
                                    <Link
                                        href={infoUrl}
                                        className="transition-colors hover:text-primary"
                                    >
                                        Pusat Regulasi & Pedoman
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href={`${homeUrl}#faq`}
                                        onClick={(e) => handleNavClick(e, { id: 'faq', label: 'Tanya Jawab (FAQ)', href: `${homeUrl}#faq` })}
                                        className="transition-colors hover:text-primary"
                                    >
                                        Tanya Jawab (FAQ)
                                    </Link>
                                </li>
                                <li>
                                    <button
                                        onClick={(e) => {
                                            const item = navSections.find((n) => n.id === 'ews');
                                            if (item) handleNavClick(e, item);
                                        }}
                                        className="flex items-center gap-1.5 transition-colors hover:text-primary text-left"
                                    >
                                        <span>Early Warning System (EWS)</span>
                                        <Lock className="h-3 w-3 text-slate-400" />
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={(e) => {
                                            const item = navSections.find((n) => n.id === 'ai');
                                            if (item) handleNavClick(e, item);
                                        }}
                                        className="flex items-center gap-1.5 transition-colors hover:text-primary text-left"
                                    >
                                        <span>AI Performance Analytics</span>
                                        <Lock className="h-3 w-3 text-slate-400" />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200/60 pt-6 text-xs text-muted-foreground sm:flex-row dark:border-border/60">
                        <p>© {new Date().getFullYear()} Biro Organisasi Sekretariat Daerah Provinsi Papua Barat. Hak Cipta Dilindungi.</p>
                        <div className="flex items-center gap-4 text-[11px]">
                            <span>e-KASUARI Lite v1.0</span>
                            {auth.user && (
                                <Link
                                    href={route('dashboard')}
                                    className="font-semibold text-primary hover:underline"
                                >
                                    Dashboard Internal →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
            )}

            <ScrollToTop />
            <FlashToaster />
        </div>
    );
}
