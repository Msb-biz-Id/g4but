import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/Components/ui/dialog';
import ThemeToggle from '@/Components/ThemeToggle';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useMemo, useEffect } from 'react';
import { applyServerTheme } from '@/lib/theme';
import type { PageProps } from '@/types';
import {
    Eye,
    EyeOff,
    LogIn,
    ArrowLeft,
    Globe,
    Zap,
    Search,
    HelpCircle,
    Copy,
    Check,
    Sparkles,
    Crown,
    Building2,
    Award,
    Users,
    Activity,
    CheckCircle2,
    ClipboardCheck,
    ShieldAlert,
    FileSearch,
    Shield,
} from 'lucide-react';

interface DemoAccount {
    id: string;
    roleName: string;
    userName: string;
    email: string;
    category: 'provinsi' | 'opd' | 'pengawas';
    orgName: string;
    jobTitle: string;
    description: string;
    keyPermissions: string[];
    badgeClass: string;
    icon: typeof Shield;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
    {
        id: 'super-admin',
        roleName: 'Super Admin',
        userName: 'Super Administrator',
        email: 'admin@ekasuari.test',
        category: 'provinsi',
        orgName: 'Pemerintah Provinsi Papua Barat',
        jobTitle: 'Administrator Sistem & Keamanan',
        description: 'Akses tak terbatas ke seluruh modul, konfigurasi sistem, AI engine, manajemen user, role & audit log.',
        keyPermissions: ['Semua Modul', 'Konfigurasi Sistem', 'Role & Permission', 'Audit Log & AI'],
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        icon: Crown,
    },
    {
        id: 'admin-provinsi',
        roleName: 'Admin Provinsi',
        userName: 'Admin Provinsi Papua Barat',
        email: 'admin.provinsi@ekasuari.test',
        category: 'provinsi',
        orgName: 'Pemerintah Provinsi Papua Barat',
        jobTitle: 'Admin Master Data & RPJMD',
        description: 'Kelola master data provinsi, RPJMD (Tujuan & Sasaran), pohon kinerja, cascading level makro, dan integrasi.',
        keyPermissions: ['RPJMD (Tujuan & Sasaran)', 'Pohon Kinerja', 'Cascading Provinsi', 'Master Organisasi'],
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        icon: Building2,
    },
    {
        id: 'pimpinan-provinsi',
        roleName: 'Pimpinan Provinsi',
        userName: 'Sekretaris Daerah / Gubernur',
        email: 'pimpinan@ekasuari.test',
        category: 'provinsi',
        orgName: 'Pemerintah Provinsi Papua Barat',
        jobTitle: 'Pimpinan Daerah Eksekutif',
        description: 'Dashboard eksekutif makro capaian SAKIP, insight AI prediktif, early warning system, dan notifikasi strategis.',
        keyPermissions: ['Executive Dashboard', 'AI Insights & Brief', 'Early Warning Alert', 'Laporan Kinerja'],
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        icon: Award,
    },
    // OPD Roles (Pilot / Standar)
    {
        id: 'admin-opd',
        roleName: 'Admin OPD (Pilot)',
        userName: 'Admin Dinas Pendidikan',
        email: 'admin.opd@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Pendidikan Papua Barat',
        jobTitle: 'Admin OPD / Pengelola Data',
        description: 'Kelola struktur unit kerja internal OPD, cascading tujuan OPD, akun operator internal, dan target indikator.',
        keyPermissions: ['Struktur Unit OPD', 'Cascading OPD', 'Manajemen User OPD', 'Target Indikator'],
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: Users,
    },
    {
        id: 'operator-opd',
        roleName: 'Operator OPD',
        userName: 'Operator Dinas Pendidikan',
        email: 'operator.opd@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Pendidikan Papua Barat',
        jobTitle: 'Operator Teknis Penginput Kinerja',
        description: 'Entri capaian realisasi bulanan/triwulanan, upload dokumen bukti dukung (evidens), dan susun rencana aksi.',
        keyPermissions: ['Entri Realisasi', 'Unggah Evidens/Bukti', 'Rencana Aksi', 'Capaian Triwulan'],
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: Activity,
    },
    {
        id: 'validator-opd',
        roleName: 'Validator OPD',
        userName: 'Validator Dinas Pendidikan',
        email: 'validator.opd@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Pendidikan Papua Barat',
        jobTitle: 'Validator & Verifikator Kinerja',
        description: 'Verifikasi dan validasi data capaian realisasi serta memeriksa kelengkapan bukti dukung sebelum diajukan.',
        keyPermissions: ['Validasi Capaian', 'Verifikasi Bukti', 'Log Validasi', 'Koreksi Data'],
        badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        icon: CheckCircle2,
    },
    {
        id: 'kepala-opd',
        roleName: 'Kepala OPD',
        userName: 'Dr. Barnabas Mandacan',
        email: 'kepala.opd@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Pendidikan Papua Barat',
        jobTitle: 'Kepala Dinas Pendidikan',
        description: 'Persetujuan Perjanjian Kinerja (PK), monitoring berkala capaian OPD, dan menindaklanjuti rekomendasi evaluasi.',
        keyPermissions: ['Persetujuan PK', 'Monitoring OPD', 'Tindak Lanjut Evaluasi', 'Dashboard OPD'],
        badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        icon: ClipboardCheck,
    },
    // Akun Semua 12 OPD di Papua Barat
    {
        id: 'opd-disdik',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas Pendidikan',
        email: 'admin.disdik@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Pendidikan Papua Barat',
        jobTitle: 'Admin Unit Dinas Pendidikan',
        description: 'Pengelolaan data kinerja, cascading indikator pendidikan, dan pelaporan SAKIP Dinas Pendidikan.',
        keyPermissions: ['Cascading Disdik', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: Building2,
    },
    {
        id: 'opd-dinkes',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas Kesehatan',
        email: 'admin.dinkes@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Kesehatan Papua Barat',
        jobTitle: 'Admin Unit Dinas Kesehatan',
        description: 'Pengelolaan data kinerja, cascading indikator kesehatan masyarakat, dan SAKIP Dinas Kesehatan.',
        keyPermissions: ['Cascading Dinkes', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: Building2,
    },
    {
        id: 'opd-bappeda',
        roleName: 'Admin OPD',
        userName: 'Admin Bappeda',
        email: 'admin.bappeda@ekasuari.test',
        category: 'opd',
        orgName: 'Badan Perencanaan Pembangunan Daerah',
        jobTitle: 'Admin Unit Bappeda',
        description: 'Pengelolaan data kinerja internal perencanaan pembangunan daerah Bappeda Papua Barat.',
        keyPermissions: ['Cascading Bappeda', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        icon: Building2,
    },
    {
        id: 'opd-pupr',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas PUPR',
        email: 'admin.pupr@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Pekerjaan Umum dan Penataan Ruang',
        jobTitle: 'Admin Unit Dinas PUPR',
        description: 'Pengelolaan data kinerja infrastruktur, tata ruang, dan pelaporan SAKIP Dinas PUPR.',
        keyPermissions: ['Cascading PUPR', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: Building2,
    },
    {
        id: 'opd-kominfo',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas Kominfo',
        email: 'admin.kominfo@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Komunikasi, Informatika, Persandian dan Statistik',
        jobTitle: 'Admin Unit Dinas Kominfo',
        description: 'Pengelolaan data kinerja SPBE, infrastruktur digital, persandian, dan statistik Papua Barat.',
        keyPermissions: ['Cascading Kominfo', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        icon: Building2,
    },
    {
        id: 'opd-dishub',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas Perhubungan',
        email: 'admin.dishub@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Perhubungan Papua Barat',
        jobTitle: 'Admin Unit Dinas Perhubungan',
        description: 'Pengelolaan data kinerja transportasi darat, laut, udara, dan konektivitas wilayah.',
        keyPermissions: ['Cascading Dishub', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: Building2,
    },
    {
        id: 'opd-koperasi',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas Koperasi & UKM',
        email: 'admin.koperasi@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Koperasi dan Usaha Kecil Menengah',
        jobTitle: 'Admin Unit Dinas Koperasi',
        description: 'Pengelolaan data kinerja pemberdayaan UMKM, kelembagaan koperasi, dan kewirausahaan daerah.',
        keyPermissions: ['Cascading Koperasi', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        icon: Building2,
    },
    {
        id: 'opd-dinsos',
        roleName: 'Admin OPD',
        userName: 'Admin Dinas Sosial',
        email: 'admin.dinsos@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Sosial Papua Barat',
        jobTitle: 'Admin Unit Dinas Sosial',
        description: 'Pengelolaan data kinerja penanganan kemiskinan, rehabilitasi sosial, dan perlindungan sosial.',
        keyPermissions: ['Cascading Dinsos', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
        icon: Building2,
    },
    {
        id: 'opd-dpmptsp',
        roleName: 'Admin OPD',
        userName: 'Admin DPMPTSP',
        email: 'admin.dpmptsp@ekasuari.test',
        category: 'opd',
        orgName: 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',
        jobTitle: 'Admin Unit DPMPTSP',
        description: 'Pengelolaan data kinerja realisasi investasi, perizinan berusaha, dan PTSP.',
        keyPermissions: ['Cascading DPMPTSP', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800',
        icon: Building2,
    },
    {
        id: 'opd-satpol',
        roleName: 'Admin OPD',
        userName: 'Admin Satpol PP',
        email: 'admin.satpol@ekasuari.test',
        category: 'opd',
        orgName: 'Satuan Polisi Pamong Praja Papua Barat',
        jobTitle: 'Admin Unit Satpol PP',
        description: 'Pengelolaan data kinerja ketertiban umum, penegakan Perda, dan linmas daerah.',
        keyPermissions: ['Cascading Satpol PP', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
        icon: Building2,
    },
    {
        id: 'opd-biro-org',
        roleName: 'Admin OPD',
        userName: 'Admin Biro Organisasi',
        email: 'admin.biro-org@ekasuari.test',
        category: 'opd',
        orgName: 'Biro Organisasi Sekretariat Daerah',
        jobTitle: 'Admin Unit Biro Organisasi',
        description: 'Pengelolaan data kinerja tatalaksana, kelembagaan perangkat daerah, dan reformasi birokrasi.',
        keyPermissions: ['Cascading Biro Org', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
        icon: Building2,
    },
    {
        id: 'opd-biro-pem',
        roleName: 'Admin OPD',
        userName: 'Admin Biro Pemerintahan',
        email: 'admin.biro-pem@ekasuari.test',
        category: 'opd',
        orgName: 'Biro Pemerintahan dan Otonomi Daerah',
        jobTitle: 'Admin Unit Biro Pemerintahan',
        description: 'Pengelolaan data kinerja otonomi daerah, kerja sama antardaerah, dan administrasi pemerintahan.',
        keyPermissions: ['Cascading Biro Pem', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        icon: Building2,
    },
    {
        id: 'opd-inspektorat',
        roleName: 'Admin OPD',
        userName: 'Admin Inspektorat Daerah',
        email: 'admin.inspektorat@ekasuari.test',
        category: 'opd',
        orgName: 'Inspektorat Daerah Papua Barat',
        jobTitle: 'Admin Unit Inspektorat',
        description: 'Pengelolaan data kinerja internal pengawasan dan penjaminan mutu Inspektorat Papua Barat.',
        keyPermissions: ['Cascading Inspektorat', 'Entri & Validasi', 'Pohon Kinerja OPD', 'Laporan Kinerja'],
        badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        icon: Building2,
    },
    // Pengawas & Audit
    {
        id: 'evaluator-provinsi',
        roleName: 'Evaluator Provinsi',
        userName: 'Tim Evaluator SAKIP Bappeda',
        email: 'evaluator@ekasuari.test',
        category: 'pengawas',
        orgName: 'Bappeda Papua Barat',
        jobTitle: 'Tim Evaluasi SAKIP Provinsi',
        description: 'Penilaian komponen SAKIP seluruh OPD, penerbitan Lembar Hasil Evaluasi (LHE), serta pemberian rekomendasi.',
        keyPermissions: ['Evaluasi SAKIP OPD', 'Penilaian LHE', 'Pemberian Rekomendasi', 'Monitoring Tindak Lanjut'],
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: Sparkles,
    },
    {
        id: 'inspektorat',
        roleName: 'Inspektorat',
        userName: 'Auditor Pengawas Internal',
        email: 'inspektorat@ekasuari.test',
        category: 'pengawas',
        orgName: 'Inspektorat Papua Barat',
        jobTitle: 'Inspektur Wilayah Pengawasan',
        description: 'Pengawasan berkala, review hasil evaluasi SAKIP, audit internal kepatuhan, serta verifikasi tindak lanjut.',
        keyPermissions: ['Pengawasan Internal', 'Review Evaluasi', 'Verifikasi Tindak Lanjut', 'Audit Log Akses'],
        badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        icon: ShieldAlert,
    },
    {
        id: 'auditor',
        roleName: 'Auditor',
        userName: 'Auditor Eksternal / BPKP',
        email: 'auditor@ekasuari.test',
        category: 'pengawas',
        orgName: 'Pemerintah Provinsi Papua Barat',
        jobTitle: 'Auditor Pemeriksa Kinerja',
        description: 'Akses read-only laporan kinerja terintegrasi, penelusuran audit log aktivitas sistem, dan pembuktian evidens.',
        keyPermissions: ['Audit Trail Lengkap', 'Laporan Kinerja Konsolidasi', 'Verifikasi Evidens', 'Log Histori Data'],
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        icon: FileSearch,
    },
];

export default function Login({
    status,
    canResetPassword,
    showDemoHelper = false,
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
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'provinsi' | 'opd' | 'pengawas'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [activeRoleName, setActiveRoleName] = useState<string | null>(null);

    const { appConfig, theme } = usePage<PageProps>().props;
    const loginBgSrc = appConfig?.loginImageUrl || '/images/login-bg.webp';

    useEffect(() => {
        if (theme) {
            applyServerTheme(theme);
        }
    }, [theme]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const filteredAccounts = useMemo(() => {
        return DEMO_ACCOUNTS.filter((acc) => {
            const matchesCategory = selectedCategory === 'all' || acc.category === selectedCategory;
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !query ||
                acc.roleName.toLowerCase().includes(query) ||
                acc.userName.toLowerCase().includes(query) ||
                acc.email.toLowerCase().includes(query) ||
                acc.orgName.toLowerCase().includes(query) ||
                acc.description.toLowerCase().includes(query) ||
                acc.keyPermissions.some((p) => p.toLowerCase().includes(query));

            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    const categoryCounts = useMemo(() => {
        return {
            all: DEMO_ACCOUNTS.length,
            provinsi: DEMO_ACCOUNTS.filter((a) => a.category === 'provinsi').length,
            opd: DEMO_ACCOUNTS.filter((a) => a.category === 'opd').length,
            pengawas: DEMO_ACCOUNTS.filter((a) => a.category === 'pengawas').length,
        };
    }, []);

    const handleSelectAccount = (acc: DemoAccount, autoSubmit = false) => {
        setData((prev) => ({
            ...prev,
            email: acc.email,
            password: 'password',
        }));
        setActiveRoleName(acc.roleName);
        setShowDemoModal(false);

        if (autoSubmit) {
            router.post(
                route('login'),
                {
                    email: acc.email,
                    password: 'password',
                    remember: data.remember,
                },
                {
                    onFinish: () => reset('password'),
                },
            );
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 1500);
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-slate-900 selection:bg-primary selection:text-white">
            <Head title="Masuk ke Sistem • e-KASUARI Papua Barat" />

            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src={loginBgSrc}
                    alt="e-KASUARI Papua Barat"
                    className="w-full h-full object-cover object-left"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 lg:bg-gradient-to-r lg:from-black/5 lg:via-transparent lg:to-black/35 pointer-events-none" />
            </div>

            <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4">
                <Link
                    href={route('home')}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-md hover:bg-white dark:hover:bg-slate-900 transition-all active:scale-95 border border-white/40 dark:border-slate-700/60"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali ke Beranda</span>
                </Link>

                <div className="flex items-center gap-2.5">
                    {showDemoHelper && (
                        <Button
                            type="button"
                            onClick={() => setShowDemoModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 text-xs shadow-lg transition-all active:scale-95 border border-amber-300/60"
                        >
                            <Zap className="h-3.5 w-3.5 fill-current" />
                            <span>Pilih Akun Demo</span>
                        </Button>
                    )}

                    <div className="rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-1 shadow-md border border-white/40 dark:border-slate-700/60">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex items-center justify-center lg:justify-end px-4 sm:px-8 lg:px-14 xl:px-20 py-6">
                <div className="w-full max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/40 border border-white/70 dark:border-slate-800/90 transition-all duration-300 animate-in fade-in zoom-in-95">

                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary mb-3 shadow-inner ring-1 ring-primary/20">
                            <ApplicationLogo className="h-9 w-9 drop-shadow-sm" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                            Masuk ke e-KASUARI
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                            Sistem Akuntabilitas Kinerja Instansi Pemerintah<br />
                            <span className="font-bold text-primary">Pemerintah Provinsi Papua Barat</span>
                        </p>
                    </div>

                    {status && (
                        <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {status}
                        </div>
                    )}

                    {activeRoleName && (
                        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 dark:bg-primary/20 p-3 text-xs text-primary border border-primary/25 animate-in fade-in">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 shrink-0" />
                                <span>Profil Demo: <strong>{activeRoleName}</strong></span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setData('email', '');
                                    setData('password', '');
                                    setActiveRoleName(null);
                                }}
                                className="font-bold text-primary hover:underline"
                            >
                                Reset
                            </button>
                        </div>
                    )}

                    <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Email / Nama Pengguna
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="nama@papua-barat.go.id"
                                value={data.email}
                                autoComplete="username"
                                autoFocus
                                onChange={(e) => {
                                    setData('email', e.target.value);
                                    setActiveRoleName(null);
                                }}
                                className={`rounded-xl bg-slate-50/90 dark:bg-slate-800/80 text-sm ${
                                    errors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                                }`}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive font-medium">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Kata Sandi
                                </Label>
                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-xs font-medium text-primary hover:underline"
                                    >
                                        Lupa kata sandi?
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
                                    className={`pr-10 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 text-sm ${
                                        errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive font-medium">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                            <Checkbox
                                id="remember"
                                checked={data.remember}
                                onCheckedChange={(v) => setData('remember', !!v as false)}
                                className="rounded-md"
                            />
                            <Label htmlFor="remember" className="cursor-pointer font-normal text-xs text-slate-600 dark:text-slate-400 select-none">
                                Ingat saya di perangkat ini
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-sm shadow-md transition-all active:scale-[0.99]"
                        >
                            {processing ? (
                                'Memverifikasi Kredensial…'
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" />
                                    Masuk ke Sistem
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
                        <Link
                            href={route('laporan.publik.index')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800/60 transition"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Buka Portal Kinerja Publik (Tanpa Login)</span>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 px-4 sm:px-8 py-3 text-center lg:text-left text-[11px] text-white/80 font-medium drop-shadow-md">
                © 2026 Biro Organisasi Sekretariat Daerah Provinsi Papua Barat. Hak Cipta Dilindungi.
            </footer>

            {showDemoHelper && (
                <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-2xl bg-card border-border">
                        <DialogHeader className="pb-3 border-b border-border/80">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Zap className="h-4 w-4" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-foreground">
                                        Pilih Akun Demo Pengujian
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        Tersedia akun untuk semua 12 OPD dan peran provinsi / pengawas ({DEMO_ACCOUNTS.length} akun). Pilih untuk langsung masuk atau salin kredensial.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="py-3 space-y-2.5">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Cari OPD (contoh: kesehatan, bappeda, pupr), peran, atau email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                        selectedCategory === 'all'
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Semua ({categoryCounts.all})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('provinsi')}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                        selectedCategory === 'provinsi'
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Provinsi ({categoryCounts.provinsi})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('opd')}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                        selectedCategory === 'opd'
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    OPD ({categoryCounts.opd})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('pengawas')}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                        selectedCategory === 'pengawas'
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Pengawas & Audit ({categoryCounts.pengawas})
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[380px]">
                            {filteredAccounts.length === 0 ? (
                                <div className="p-8 text-center border border-dashed rounded-xl">
                                    <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/60 mb-1" />
                                    <p className="text-xs text-muted-foreground">Tidak ada akun yang cocok dengan kata kunci.</p>
                                </div>
                            ) : (
                                filteredAccounts.map((acc) => {
                                    const IconComp = acc.icon;
                                    return (
                                        <div
                                            key={acc.id}
                                            className="group rounded-xl border border-border/80 bg-background/50 p-3.5 hover:border-primary/40 hover:bg-muted/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
                                                    <IconComp className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-foreground">{acc.roleName}</span>
                                                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${acc.badgeClass}`}>
                                                            {acc.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                        {acc.userName} • <span className="font-mono text-[11px] text-foreground/80">{acc.email}</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                                                        {acc.description}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCopy(acc.email, acc.id)}
                                                    className="h-8 text-xs px-2.5"
                                                >
                                                    {copiedField === acc.id ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleSelectAccount(acc, false)}
                                                    className="h-8 text-xs font-bold px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                                                >
                                                    Gunakan
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleSelectAccount(acc, true)}
                                                    className="h-8 text-xs px-2.5"
                                                    title="Gunakan dan Langsung Masuk"
                                                >
                                                    <LogIn className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="pt-3 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Kata sandi default: <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold text-foreground">password</code></span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDemoModal(false)}
                                className="h-7 text-xs"
                            >
                                Tutup
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
