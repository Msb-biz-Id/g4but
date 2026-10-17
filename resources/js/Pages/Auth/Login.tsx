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
        id: 'kepala-opd',
        roleName: 'Kadis PUPR',
        userName: 'Kepala Dinas PUPR Mimika',
        email: 'kepala.opd@esakip.local',
        jobTitle: 'Pimpinan & Checker Utama',
        badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-[#FFB800] border-amber-500/30',
    },
    {
        id: 'admin-opd',
        roleName: 'Admin PUPR',
        userName: 'Admin Perangkat Daerah',
        email: 'admin.opd@esakip.local',
        jobTitle: 'Maker Kinerja Dinas',
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    {
        id: 'kepala-sekretariat',
        roleName: 'Sekretaris',
        userName: 'Sekretaris Dinas PUPR',
        email: 'kepala.sekretariat@esakip.local',
        jobTitle: 'Checker Sekretariat',
        badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    },
    {
        id: 'kabid-bm',
        roleName: 'Kabid Bina Marga',
        userName: 'Kabid Bina Marga',
        email: 'kabid.binamarga@esakip.local',
        jobTitle: 'Checker Jalan & Jembatan',
        badgeColor: 'bg-[#FFB800]/10 text-amber-700 dark:text-[#FFB800] border-[#FFB800]/30',
    },
    {
        id: 'kasi-bm',
        roleName: 'Kasi Jalan',
        userName: 'Kasi Pembangunan Jalan & Jembatan',
        email: 'seksi.pembangunanjalan@esakip.local',
        jobTitle: 'Pelaksana Teknis Seksi',
        badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    },
    {
        id: 'kabid-ck',
        roleName: 'Kabid Cipta Karya',
        userName: 'Kabid Cipta Karya',
        email: 'kabid.ciptakarya@esakip.local',
        jobTitle: 'Checker Gedung & SPAM',
        badgeColor: 'bg-[#FFB800]/10 text-amber-700 dark:text-[#FFB800] border-[#FFB800]/30',
    },
    {
        id: 'kasi-ck',
        roleName: 'Kasi Gedung',
        userName: 'Kasi Bangunan Gedung & Lingkungan',
        email: 'seksi.gedung@esakip.local',
        jobTitle: 'Pelaksana Teknis Seksi',
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    },
    {
        id: 'kabid-sda',
        roleName: 'Kabid SDA',
        userName: 'Kabid Sumber Daya Air',
        email: 'kabid.sda@esakip.local',
        jobTitle: 'Checker Pengendali Banjir',
        badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    },
    {
        id: 'kabid-tr',
        roleName: 'Kabid Tata Ruang',
        userName: 'Kabid Penataan Ruang',
        email: 'kabid.penataanruang@esakip.local',
        jobTitle: 'Checker Tata Ruang',
        badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
    },
    {
        id: 'kepala-uptd',
        roleName: 'Kepala UPTD',
        userName: 'Kepala UPTD Dinas PUPR',
        email: 'kepala.uptd@esakip.local',
        jobTitle: 'Unit Pelaksana Teknis',
        badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    },
    {
        id: 'super-admin',
        roleName: 'Super Admin',
        userName: 'Administrator Sistem',
        email: 'superadmin@esakip.local',
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
    const appName = appConfig?.appName || 'e-SAKIP';
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
                            {/* Emblem & Department Title */}
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-[#FFB800] to-amber-600 p-2 sm:p-2.5 flex items-center justify-center shadow-lg border border-amber-300/40 shrink-0">
                                    <PuprEmblemSvg className="w-8 h-8 sm:w-9 sm:h-9" color="#002B49" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#FFB800] uppercase block truncate">
                                        {instansiName}
                                    </span>
                                    <h2 className="text-lg sm:text-2xl font-black font-serif tracking-tight text-white leading-tight">
                                        {orgName}
                                    </h2>
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
                                    Konsol resmi sistem <strong>{appName}</strong> untuk pemantauan target indikator kinerja utama (IKU), verifikasi dokumen bukti fisik (evidence), dan evaluasi SAKIP berkala pada seluruh bidang teknis Dinas PUPR Kabupaten Mimika.
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
                                <div>
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
                                        placeholder="nama.pegawai@mimikakab.go.id"
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
