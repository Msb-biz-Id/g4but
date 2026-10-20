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
    FileBarChart2,
    Lock,
    X,
    BookOpen,
    Network,
    LogIn,
    LayoutDashboard,
    Clock,
    Compass,
    MapPin,
    Sparkles,
    HardHat,
    Building2,
} from 'lucide-react';
import { PuprEmblemSvg, BIDANG_PUPR_MIMIKA, DISTRIK_MIMIKA } from '@/Components/Landing/PuprOrnaments';
import { PuprCitySkylinePattern, PuprBlueprintGrid } from '@/Components/Landing/PuprCityPattern';

interface NavItem {
    id: string;
    label: string;
    href: string;
    requiresLogin?: boolean;
    icon?: React.ElementType;
}

export default function PublicLayout({
    children,
    active = 'home',
    hideFooter = false,
}: PropsWithChildren<{ active?: 'home' | 'info' | 'laporan' | 'pohon'; hideFooter?: boolean }>) {
    const { auth, theme, appConfig } = usePage<PageProps>().props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [witTime, setWitTime] = useState<string>('');

    useEffect(() => {
        if (theme) applyServerTheme(theme);
    }, [theme]);

    useEffect(() => {
        const updateWit = () => {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('id-ID', {
                timeZone: 'Asia/Jayapura',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            setWitTime(formatter.format(now) + ' WIT');
        };
        updateWit();
        const t = setInterval(updateWit, 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const homeUrl = route('home');
    const infoUrl = route('knowledge.public.index');

    const appName = appConfig?.appName || 'SIPERFORMA PUPR';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';
    const currentYear = appConfig?.currentYear || new Date().getFullYear();

    const navSections: NavItem[] = [
        { id: 'beranda', label: 'Beranda', href: homeUrl },
        {
            id: 'pohon',
            label: 'Pohon Kinerja',
            href: route('laporan.publik.pohon-kinerja'),
            requiresLogin: false,
            icon: Network,
        },
        {
            id: 'laporan',
            label: 'Laporan SAKIP',
            href: route('laporan.publik.index'),
            requiresLogin: false,
            icon: FileBarChart2,
        },
        {
            id: 'regulasi',
            label: 'Pusat Regulasi',
            href: infoUrl,
            requiresLogin: false,
            icon: BookOpen,
        },
    ];

    const isActive = (item: NavItem) => {
        if (item.id === 'beranda' && active === 'home') return true;
        if (item.id === 'pohon' && active === 'pohon') return true;
        if (item.id === 'laporan' && active === 'laporan') return true;
        if (item.id === 'regulasi' && active === 'info') return true;
        return false;
    };

    return (
        <div className="relative min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#070E17] text-slate-900 dark:text-slate-100 selection:bg-[#FFB800] selection:text-slate-950 font-sans transition-colors duration-300">
            <ScrollToTop />
            <FlashToaster />

            {/* ── Top Official PUPR Accent Stripe ────────────────────────────── */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#FFB800] via-[#002B49] to-[#FFB800] shadow-sm" />

            {/* ── Sticky Navigation Header ───────────────────────────────────── */}
            <header
                className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
                    scrolled
                        ? 'bg-[#002B49]/95 dark:bg-[#041320]/95 backdrop-blur-md shadow-lg border-[#FFB800]/20 text-white'
                        : 'bg-[#002B49] dark:bg-[#041320] border-amber-500/20 text-white'
                }`}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
                    {/* Brand & PUPR Mimika Identity */}
                    <Link
                        href={homeUrl}
                        className="group flex min-w-0 shrink items-center gap-2.5 sm:gap-3"
                    >
                        <ApplicationLogo className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300" />
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-sm sm:text-base font-black tracking-tight font-serif text-white leading-none">
                                    {appName.replace(/\s*PUPR$/i, '')}
                                </span>
                                <span className="rounded-md bg-[#FFB800] px-1.5 py-0.5 text-[9px] font-mono font-black text-slate-950">
                                    PUPR
                                </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-amber-300 font-semibold tracking-tight mt-0.5 leading-none truncate max-w-[130px] sm:max-w-xs md:max-w-none">
                                {orgName} • Mimika
                            </span>
                        </div>
                    </Link>

                    {/* Nav Desktop with PUPR styling */}
                    <nav className="hidden items-center gap-1 lg:flex bg-[#07243c] p-1 rounded-xl border border-white/10">
                        {navSections.map((item) => {
                            const isCurrent = isActive(item);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isCurrent
                                            ? 'bg-[#FFB800] text-slate-950 shadow-md'
                                            : 'text-slate-200 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {Icon && <Icon className="h-3.5 w-3.5 opacity-80" />}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Controls: WIT Timika Clock, Theme, Auth */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                        {witTime && (
                            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#07243c] border border-amber-400/30 text-xs font-mono text-amber-300">
                                <Clock className="w-3.5 h-3.5 text-[#FFB800]" />
                                <span>{witTime}</span>
                            </div>
                        )}

                        <ThemeToggle />

                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFB800] to-amber-500 hover:from-amber-400 hover:to-[#FFB800] text-slate-950 px-3 sm:px-4 py-2 text-xs font-black shadow-md transition-transform active:scale-95 min-h-[38px]"
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Dashboard</span>
                            </Link>
                        ) : (
                            <Link
                                href={route('login')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFB800] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3 sm:px-4 py-2 text-xs font-black shadow-md transition-all active:scale-95 min-h-[38px]"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Masuk</span>
                            </Link>
                        )}

                        {/* Mobile Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen((o) => !o)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white lg:hidden min-h-[44px] min-w-[44px]"
                            aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer */}
                {mobileOpen && (
                    <div className="border-t border-white/10 bg-[#002B49] p-4 sm:p-5 lg:hidden animate-fade-in shadow-2xl text-white">
                        <div className="mb-3 flex items-center justify-between pb-3 border-b border-white/10">
                            <span className="text-xs font-mono font-bold text-[#FFB800] flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{witTime} (Timika)</span>
                            </span>
                            <span className="text-[10px] uppercase font-mono text-slate-300">
                                PUPR MIMIKA
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {navSections.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold min-h-[44px] transition-colors ${
                                        isActive(item)
                                            ? 'bg-[#FFB800] text-slate-950 shadow-md'
                                            : 'text-slate-200 hover:bg-white/10 active:bg-white/15'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {item.icon && <item.icon className="h-4 w-4" />}
                                        <span>{item.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* ── Main Page Content ──────────────────────────────────────── */}
            <main className="flex-1">
                {children}
            </main>

            {/* ── Rich PUPR Mimika Civic Footer ──────────────────────────── */}
            {!hideFooter && (
                <footer className="relative border-t border-amber-500/30 bg-gradient-to-b from-[#002B49] via-[#051c2f] to-[#020e17] text-white pt-14 pb-8 overflow-hidden">
                    {/* Blueprint Grid & City Skyline PUPR Pattern */}
                    <PuprBlueprintGrid className="opacity-[0.06]" />
                    <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.22" />

                    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {/* 5 Matra Pembangunan PUPR Mimika */}
                        <div className="mb-10 pb-8 border-b border-white/10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <HardHat className="w-4 h-4 text-[#FFB800]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                                        5 Matra Penyelenggaraan Infrastruktur • Dinas PUPR Kabupaten Mimika
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-300 font-mono">
                                    Konektivitas Bumi Amungme &amp; Kamoro
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {BIDANG_PUPR_MIMIKA.map((b) => (
                                    <div
                                        key={b.code}
                                        className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFB800]/50 transition-colors"
                                    >
                                        <div className="text-[10px] font-mono font-bold text-[#FFB800]">
                                            BIDANG {b.code}
                                        </div>
                                        <div className="text-xs font-bold text-white mt-0.5">
                                            {b.name}
                                        </div>
                                        <div className="text-[11px] text-slate-300 leading-snug mt-1 opacity-80">
                                            {b.scope}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Footer Grid */}
                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 pb-10 border-b border-white/10">
                            {/* Brand & Slogan */}
                            <div className="lg:col-span-2 space-y-3.5">
                                <div className="flex items-center gap-3">
                                    <ApplicationLogo className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 object-contain drop-shadow-xl" />
                                    <div>
                                        <div className="text-lg font-black font-serif text-white">
                                            {orgName}
                                        </div>
                                        <div className="text-xs text-[#FFB800] font-bold">
                                            {instansiName}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-light">
                                    <strong>{appName}</strong> merupakan platform digital terintegrasi yang dikembangkan untuk memperkuat implementasi Sistem Akuntabilitas Kinerja Instansi Pemerintah di lingkungan Dinas PUPR Kabupaten Mimika. Sistem ini menghubungkan proses perencanaan, penganggaran, pelaksanaan, monitoring, evaluasi, hingga pelaporan kinerja dalam satu portal terpadu yang dapat diakses secara real time. Melalui dashboard terpadu, Kepala Dinas, Sekretaris, Kepala Bidang, dan pengguna teknis dapat memantau capaian pembangunan infrastruktur secara cepat, akurat, terukur, dan berbasis data.
                                </p>

                                <div className="flex items-center gap-2 text-xs font-mono text-amber-300 pt-1">
                                    <MapPin className="w-4 h-4 text-[#FFB800]" />
                                    <span>Kantor: Jalan Poros Timika - Kuala Kencana, Mimika, Papua Tengah</span>
                                </div>
                            </div>

                            {/* Tautan Layanan */}
                            <div>
                                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#FFB800] mb-3 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Akses Kinerja Publik</span>
                                </h4>
                                <ul className="space-y-2 text-xs text-slate-300">
                                    <li>
                                        <Link href={homeUrl} className="hover:text-[#FFB800] transition-colors">
                                            Beranda Utama
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('laporan.publik.pohon-kinerja')} className="hover:text-[#FFB800] transition-colors">
                                            Pohon Kinerja Cascading PUPR
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('laporan.publik.index')} className="hover:text-[#FFB800] transition-colors">
                                            Laporan SAKIP &amp; LHE
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={infoUrl} className="hover:text-[#FFB800] transition-colors">
                                            Bank Regulasi &amp; SOP Teknis
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Konsol Aparatur */}
                            <div>
                                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#FFB800] mb-3">
                                    Internal Dinas PUPR
                                </h4>
                                <ul className="space-y-2 text-xs text-slate-300">
                                    <li>
                                        <Link href={route('login')} className="hover:text-[#FFB800] transition-colors font-bold text-amber-300">
                                            Masuk Portal Aparatur →
                                        </Link>
                                    </li>
                                    <li>
                                        <span className="opacity-75">Verifikasi Maker-Checker</span>
                                    </li>
                                    <li>
                                        <span className="opacity-75">Evidence Fisik &amp; Keuangan</span>
                                    </li>
                                    <li>
                                        <span className="opacity-75">Audit Trail Permanen</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom Copyright */}
                        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
                            <p>© {currentYear} {orgName} • {instansiName}. Hak Cipta Dilindungi.</p>
                            <p>PermenPAN-RB No. 88/2021 • Perpres No. 29/2014</p>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
