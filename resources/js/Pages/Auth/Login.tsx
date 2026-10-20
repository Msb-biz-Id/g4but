import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import ThemeToggle from '@/Components/ThemeToggle';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect } from 'react';
import { applyServerTheme } from '@/lib/theme';
import type { PageProps } from '@/types';
import {
    Eye,
    EyeOff,
    LogIn,
    ArrowLeft,
    Globe,
    Zap,
    ShieldCheck,
    Clock,
    Sparkles,
    Check,
    HardHat,
    Building2,
    Activity,
} from 'lucide-react';
import { PuprEmblemSvg, BIDANG_PUPR_MIMIKA } from '@/Components/Landing/PuprOrnaments';
import { PuprCitySkylinePattern, PuprBlueprintGrid } from '@/Components/Landing/PuprCityPattern';

interface DemoAccount {
    id: string;
    roleName: string;
    userName: string;
    email: string;
    jobTitle: string;
    badgeColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
    {
        id: 'kepala-dinas',
        roleName: 'Kadis PUPR',
        userName: 'Kepala Dinas PUPR Kabupaten Mimika',
        email: 'kepala.dinas@siperforma.local',
        jobTitle: 'Pimpinan & Checker Utama',
        badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-[#FFB800] border-amber-500/30',
    },
    {
        id: 'admin-pupr',
        roleName: 'Admin PUPR',
        userName: 'Admin Dinas PUPR Mimika',
        email: 'admin.pupr@siperforma.local',
        jobTitle: 'Maker Kinerja Dinas',
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    {
        id: 'kepala-sekretariat',
        roleName: 'Sekretaris PUPR',
        userName: 'Sekretaris Dinas PUPR Mimika',
        email: 'kepala.sekretariat@siperforma.local',
        jobTitle: 'Checker Sekretariat',
        badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    },
    {
        id: 'kabid-bm',
        roleName: 'Kabid Bina Marga',
        userName: 'Kepala Bidang Bina Marga',
        email: 'kabid.binamarga@siperforma.local',
        jobTitle: 'Checker Jalan & Jembatan',
        badgeColor: 'bg-[#FFB800]/10 text-amber-700 dark:text-[#FFB800] border-[#FFB800]/30',
    },
    {
        id: 'kasi-bm',
        roleName: 'Kasi Jalan & Jembatan',
        userName: 'Kasi Pembangunan & Peningkatan Jalan',
        email: 'seksi.pembangunanjalan@siperforma.local',
        jobTitle: 'Pelaksana Teknis Jalan',
        badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    },
    {
        id: 'kabid-ck',
        roleName: 'Kabid Cipta Karya',
        userName: 'Kepala Bidang Cipta Karya',
        email: 'kabid.ciptakarya@siperforma.local',
        jobTitle: 'Checker Gedung & SPAM',
        badgeColor: 'bg-[#FFB800]/10 text-amber-700 dark:text-[#FFB800] border-[#FFB800]/30',
    },
    {
        id: 'kasi-ck',
        roleName: 'Kasi Gedung & Lingkungan',
        userName: 'Kasi Bangunan Gedung & Penataan Lingkungan',
        email: 'seksi.gedung@siperforma.local',
        jobTitle: 'Pelaksana Teknis Gedung',
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    },
    {
        id: 'kabid-sda',
        roleName: 'Kabid SDA',
        userName: 'Kepala Bidang Sumber Daya Air',
        email: 'kabid.sda@siperforma.local',
        jobTitle: 'Checker Pengendali Banjir',
        badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    },
    {
        id: 'kabid-tr',
        roleName: 'Kabid Penataan Ruang',
        userName: 'Kepala Bidang Penataan Ruang',
        email: 'kabid.penataanruang@siperforma.local',
        jobTitle: 'Checker Tata Ruang',
        badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
    },
    {
        id: 'kepala-uptd',
        roleName: 'Kepala UPTD',
        userName: 'Kepala UPTD Dinas PUPR',
        email: 'kepala.uptd@siperforma.local',
        jobTitle: 'Unit Pelaksana Teknis',
        badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    },
    {
        id: 'super-admin',
        roleName: 'Super Admin',
        userName: 'Super Administrator Sistem',
        email: 'superadmin@siperforma.local',
        jobTitle: 'Admin Utama Sistem',
        badgeColor: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
    },
];

export default function Login({
    status,
    canResetPassword,
    showDemoHelper = true,
}: {
    status?: string;
    canResetPassword: boolean;
    showDemoHelper?: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [selectedDemoId, setSelectedDemoId] = useState<string>('');
    const [witTime, setWitTime] = useState<string>('');

    const { appConfig, theme } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'SIPERFORMA PUPR';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';
    const currentYear = appConfig?.currentYear || new Date().getFullYear();

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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const handleSelectAccount = (acc: DemoAccount) => {
        if (selectedDemoId === acc.id) {
            setSelectedDemoId('');
            setData({ ...data, email: '', password: '' });
        } else {
            setSelectedDemoId(acc.id);
            setData({ ...data, email: acc.email, password: 'Password@123' });
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col justify-between bg-[#0B1522] text-zinc-100 font-sans selection:bg-[#FFB800] selection:text-zinc-950 overflow-x-hidden">
            <Head title={`Masuk Portal • ${orgName} ${instansiName}`} />

            {/* Top Brand Stripe: PUPR Gold & Royal Navy */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#FFB800] via-[#002B49] to-[#FFB800] shadow-sm" />

            {/* Top Navbar */}
            <header className="w-full max-w-7xl mx-auto px-4 py-3.5 sm:px-6 sm:py-5 flex items-center justify-between gap-2">
                <Link
                    href={route('home')}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors min-h-[44px]"
                >
                    <ArrowLeft className="w-4 h-4 text-[#FFB800] shrink-0" />
                    <span>Kembali <span className="hidden sm:inline">ke Portal Publik</span></span>
                </Link>

                <div className="flex items-center gap-2.5 shrink-0">
                    {witTime && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#002B49]/80 border border-amber-400/30 text-xs font-mono text-amber-300">
                            <Clock className="w-3.5 h-3.5 text-[#FFB800]" />
                            <span>{witTime} (Timika)</span>
                        </div>
                    )}
                    <ThemeToggle />
                </div>
            </header>

            {/* ── Main Dual-Column PUPR Mimika Console ───────────────────── */}
            <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 my-auto">
                <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0e1d2e] via-[#0b1827] to-[#07111d] border border-amber-500/30 shadow-2xl overflow-hidden">

                    {/* ══ KOLOM KIRI: Identitas & Pilar Pembangunan PUPR Mimika ══ */}
                    <div className="lg:col-span-6 p-5 sm:p-8 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-[#002B49] via-[#07243c] to-[#051829] border-b lg:border-b-0 lg:border-r border-amber-500/20 text-white relative overflow-hidden">
                        {/* Background architectural grid and city skyline pattern */}
                        <PuprBlueprintGrid className="opacity-[0.07]" />
                        <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.22" />

                        <div className="relative z-10 space-y-4 sm:space-y-6">
                            {/* Emblem & Official PUPR Mimika Branding Lockup */}
                            <div className="flex items-center gap-3.5">
                                <ApplicationLogo
                                    alt="Logo SIPERFORMA PUPR Kabupaten Mimika"
                                    className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 object-contain drop-shadow-xl"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white leading-tight">
                                            {appName}
                                        </h1>
                                        <span className="rounded-md bg-[#FFB800] text-slate-950 px-1.5 py-0.5 text-[10px] font-mono font-black shadow-xs shrink-0">
                                            MIMIKA
                                        </span>
                                    </div>
                                    <div className="text-[11px] font-mono font-bold tracking-wider text-[#FFB800] uppercase mt-0.5">
                                        Kabupaten Mimika
                                    </div>
                                    <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                                        {orgName}
                                    </p>
                                </div>
                            </div>

                            {/* PUPR Official Slogan Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#FFB800]/40 text-[#FFB800] text-[11px] sm:text-xs font-mono font-bold tracking-wider max-w-full">
                                <HardHat className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Bekerja Keras • Bergerak Cepat • Bertindak Tepat</span>
                            </div>

                            {/* Headline */}
                            <div>
                                <h3 className="text-xl sm:text-3xl font-extrabold font-serif text-white tracking-tight leading-snug">
                                    Akuntabilitas Kinerja Pembangunan Infrastruktur Mimika
                                </h3>
                                <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                                    <strong>{appName}</strong> merupakan platform digital terintegrasi yang dikembangkan untuk memperkuat implementasi Sistem Akuntabilitas Kinerja Instansi Pemerintah di lingkungan Dinas PUPR Kabupaten Mimika. Sistem ini menghubungkan proses perencanaan, penganggaran, pelaksanaan, monitoring, evaluasi, hingga pelaporan kinerja dalam satu portal terpadu yang dapat diakses secara real time. Melalui dashboard terpadu, Kepala Dinas, Sekretaris, Kepala Bidang, dan pengguna teknis dapat memantau capaian pembangunan infrastruktur secara cepat, akurat, terukur, dan berbasis data.
                                </p>
                            </div>

                            {/* 5 Bidang Teknis PUPR Mimika Chips */}
                            <div className="pt-1 sm:pt-2">
                                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-2">
                                    5 MATRA PEMBANGUNAN KINERJA:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-[#FFB800] shrink-0" />
                                        <span className="font-semibold truncate">Bina Marga (Jalan &amp; Jembatan)</span>
                                    </div>
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-[#FFB800] shrink-0" />
                                        <span className="font-semibold truncate">Cipta Karya (Gedung &amp; SPAM)</span>
                                    </div>
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-[#FFB800] shrink-0" />
                                        <span className="font-semibold truncate">Sumber Daya Air (SDA)</span>
                                    </div>
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-[#FFB800] shrink-0" />
                                        <span className="font-semibold truncate">Tata Ruang &amp; Konstruksi</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Territorial Footprint (Bumi Amungme & Kamoro) */}
                        <div className="relative z-10 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-mono">
                            <span>Bumi Amungme &amp; Kamoro</span>
                            <span className="text-[#FFB800] font-bold">Timika, Papua Tengah</span>
                        </div>
                    </div>

                    {/* ══ KOLOM KANAN: Form Konsol Masuk Aparatur ═════════════════ */}
                    <div className="lg:col-span-6 p-5 sm:p-8 lg:p-12 flex flex-col justify-between bg-zinc-950/80">
                        <div>
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <div className="min-w-0">
                                    {/* Mobile-only logo & agency lockup */}
                                    <div className="lg:hidden flex items-center gap-2.5 mb-3.5 pb-3 border-b border-zinc-800">
                                        <ApplicationLogo
                                            alt="Logo SIPERFORMA PUPR Kabupaten Mimika"
                                            className="h-10 w-10 shrink-0 object-contain drop-shadow-md"
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black font-serif text-white leading-tight flex items-center gap-1.5">
                                                <span>{appName}</span>
                                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#FFB800] text-slate-950 font-bold">MIMIKA</span>
                                            </div>
                                            <div className="text-[10px] font-mono text-[#FFB800] font-bold uppercase">
                                                Kabupaten Mimika
                                            </div>
                                            <div className="text-[10px] text-zinc-400 truncate">
                                                {orgName}
                                            </div>
                                        </div>
                                    </div>

                                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
                                        Konsol Masuk Aparatur
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Gunakan kredensial resmi akun dinas yang terdaftar.
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#FFB800] shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Status Alert */}
                            {status && (
                                <div className="mb-4 sm:mb-5 p-3 rounded-xl bg-[#002B49]/80 border border-[#FFB800]/40 text-xs font-medium text-[#FFB800] text-center">
                                    {status}
                                </div>
                            )}

                            {/* 1-Click Role Chips (Pengujian Cepat Aparatur PUPR) */}
                            {showDemoHelper && (
                                <div className="mb-5 sm:mb-6 p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <span className="text-[11px] font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-[#FFB800] fill-[#FFB800]" />
                                            <span>Pilih Profil Pegawai (1-Klik):</span>
                                        </span>
                                        {selectedDemoId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDemoId('');
                                                    setData('email', '');
                                                    setData('password', '');
                                                }}
                                                className="text-[10px] text-[#FFB800] font-bold underline"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 max-h-36 sm:max-h-none overflow-y-auto pr-1 scrollbar-thin">
                                        {DEMO_ACCOUNTS.map((acc) => {
                                            const isSelected = selectedDemoId === acc.id;
                                            return (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    onClick={() => handleSelectAccount(acc)}
                                                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-gradient-to-r from-[#FFB800] to-amber-500 text-zinc-950 font-bold border-amber-300 shadow-md'
                                                            : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-[#FFB800]/50'
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />}
                                                    <span>{acc.roleName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selectedDemoId && (() => {
                                        const acc = DEMO_ACCOUNTS.find((a) => a.id === selectedDemoId);
                                        if (!acc) return null;
                                        return (
                                            <div className="mt-2.5 p-2.5 rounded-xl bg-[#002B49]/80 border border-[#FFB800]/40 flex items-center justify-between text-xs animate-in fade-in duration-200">
                                                <div className="min-w-0 pr-2">
                                                    <div className="text-white font-bold truncate">
                                                        {acc.userName}
                                                    </div>
                                                    <div className="text-[11px] text-[#FFB800] truncate font-mono">
                                                        {acc.jobTitle} • {acc.email}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-amber-300 font-bold shrink-0 border border-amber-400/20">
                                                    Terisi Otomatis
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Form Input */}
                            <form onSubmit={submit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-semibold text-zinc-300">
                                        Email / NIP Aparatur PUPR
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        placeholder="contoh: kepala.dinas@siperforma.local"
                                        value={data.email}
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(e) => {
                                            setData('email', e.target.value);
                                            setSelectedDemoId('');
                                        }}
                                        className={`h-11 rounded-xl text-sm bg-zinc-900 border-zinc-800 focus:border-[#FFB800] focus:ring-[#FFB800] text-white placeholder-zinc-500 ${
                                            errors.email ? 'border-red-500' : ''
                                        }`}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-400 font-medium mt-1">{errors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">
                                            Kata Sandi
                                        </Label>
                                        {canResetPassword && (
                                            <Link
                                                href={route('password.request')}
                                                className="text-xs text-[#FFB800] hover:underline font-medium"
                                            >
                                                Lupa sandi?
                                            </Link>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            placeholder="••••••••"
                                            value={data.password}
                                            autoComplete="current-password"
                                            onChange={(e) => setData('password', e.target.value)}
                                            className={`h-11 pr-11 rounded-xl text-sm bg-zinc-900 border-zinc-800 focus:border-[#FFB800] focus:ring-[#FFB800] text-white ${
                                                errors.password ? 'border-red-500' : ''
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition-colors"
                                            tabIndex={-1}
                                            aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-xs text-red-400 font-medium mt-1">{errors.password}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <Checkbox
                                        id="remember"
                                        checked={data.remember}
                                        onCheckedChange={(v) => setData('remember', !!v as false)}
                                        className="rounded-md border-zinc-700 data-[state=checked]:bg-[#FFB800] data-[state=checked]:border-[#FFB800] data-[state=checked]:text-zinc-950"
                                    />
                                    <Label htmlFor="remember" className="cursor-pointer text-xs text-zinc-400 font-medium">
                                        Ingat sesi login di perangkat kerja ini
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#FFB800] via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-xl transition-transform active:scale-95 mt-2"
                                >
                                    {processing ? 'Memverifikasi Data…' : 'Masuk ke Konsol PUPR Mimika'}
                                </Button>
                            </form>
                        </div>

                        {/* Bottom Public Access Link */}
                        <div className="mt-8 pt-5 border-t border-zinc-900 text-center">
                            <Link
                                href={route('laporan.publik.index')}
                                className="inline-flex items-center gap-2 text-xs font-bold text-[#FFB800] hover:underline"
                            >
                                <Globe className="w-4 h-4" />
                                <span>Akses Portal Kinerja Publik (Tanpa Login)</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Copyright */}
            <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-zinc-500 font-mono">
                © {currentYear} {orgName} • {instansiName}. Hak Cipta Dilindungi.
            </footer>
        </div>
    );
}
