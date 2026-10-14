import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    Layers,
    CheckCircle2,
    AlertTriangle,
    BrainCircuit,
    BarChart3,
    ShieldCheck,
    Check,
    LayoutDashboard,
    Database,
    Building2,
    CalendarRange,
    FileText,
    TreePine,
    Goal,
    TrendingUp,
    Share2,
    Network,
    ShieldAlert,
    Gauge,
    NotebookPen,
    Bell,
    Bot,
    MessageCircle,
    Users,
    Shield,
    Settings,
    ScrollText,
    Plug,
    Upload,
    Target,
    LucideIcon,
} from 'lucide-react';
import Reveal from './Reveal';

type SubModule = {
    icon: LucideIcon;
    label: string;
    desc: string;
};

type Module = {
    id: string;
    label: string;
    icon: LucideIcon;
    gradient: string;
    title: string;
    subtitle: string;
    description: string;
    subModules: SubModule[];
    badge?: string;
};

const modules: Module[] = [
    {
        id: 'planning',
        label: 'Perencanaan',
        icon: Layers,
        gradient: 'from-amber-500 to-amber-600',
        title: 'Modul Perencanaan Kinerja Terpadu',
        subtitle: 'Fungsi Tata Kelola SAKIP Berkelanjutan',
        description:
            'Pengelolaan cascading sasaran strategis dari Renstra & Renja OPD, penetapan Indikator Kinerja Utama (IKU), target tahunan, serta pohon kinerja daerah.',
        subModules: [
            {
                icon: FileText,
                label: 'Dokumen Perencanaan',
                desc: 'Kelola 12 jenis dokumen: Renstra & Renja, Renstra, Renja, RKPD, DPA, Rencana Aksi & PK',
            },
            {
                icon: TreePine,
                label: 'Pohon Kinerja',
                desc: 'Visualisasi hierarki tujuan → sasaran → program → kegiatan OPD secara dinamis',
            },
            {
                icon: Goal,
                label: 'Perjanjian Kinerja',
                desc: 'Manajemen PK pimpinan, Kepala OPD, dan pejabat unit kerja di lingkungan organisasi',
            },
            {
                icon: BarChart3,
                label: 'Monitoring OPD',
                desc: 'Matriks status unggahan dokumen seluruh OPD dalam satu dashboard terintegrasi',
            },
            {
                icon: Share2,
                label: 'Cascading Kinerja',
                desc: 'Relasi vertikal & horizontal antar pohon kinerja lintas level pemerintahan',
            },
            {
                icon: Network,
                label: 'Crosscutting',
                desc: 'Pengelolaan indikator lintas OPD dan ketergantungan program bersama',
            },
            {
                icon: ShieldAlert,
                label: 'Manajemen Risiko',
                desc: 'Identifikasi, mitigasi, dan pemantauan risiko program kinerja OPD',
            },
            {
                icon: TrendingUp,
                label: 'Rencana Aksi',
                desc: 'Penjabaran rencana tindak lanjut capaian kinerja per triwulan',
            },
        ],
    },
    {
        id: 'realization',
        label: 'Pengukuran',
        icon: CheckCircle2,
        gradient: 'from-emerald-500 to-teal-600',
        title: 'Modul Pengukuran & Realisasi OPD',
        subtitle: 'Pencatatan Capaian Kinerja Terverifikasi',
        description:
            'Pencatatan realisasi capaian kinerja dan penyerapan anggaran OPD dengan verifikasi data dukung (evidence) berjenjang dan mekanisme jejak audit permanen.',
        subModules: [
            {
                icon: Gauge,
                label: 'Realisasi Kinerja',
                desc: 'Input capaian kinerja per indikator & kegiatan OPD dengan verifikasi berlapis',
            },
            {
                icon: Target,
                label: 'Target Indikator',
                desc: 'Penetapan dan pengelolaan target triwulanan & tahunan per indikator kinerja',
            },
            {
                icon: Upload,
                label: 'Import Data',
                desc: 'Dukungan import realisasi massal via template Excel resmi yang telah distandarisasi',
            },
            {
                icon: CheckCircle2,
                label: 'Verifikasi Evidence',
                desc: 'Alur pengunggahan dan persetujuan bukti dukung bertingkat (Pelaksana → Kabid → Kepala)',
            },
            {
                icon: Database,
                label: 'Migrasi Data',
                desc: 'Fasilitas migrasi data historis kinerja dari sistem lama ke e-SAKIP secara terstruktur',
            },
        ],
    },
    {
        id: 'evaluation',
        label: 'Evaluasi & EWS',
        icon: AlertTriangle,
        gradient: 'from-amber-600 to-rose-600',
        title: 'Modul Evaluasi & Early Warning System',
        subtitle: 'Deteksi Dini & Penjaminan Akuntabilitas',
        description:
            'Evaluasi mandiri OPD, reviu oleh Tim Evaluasi Internal, penerbitan rekomendasi LHE SAKIP, dan deteksi dini indikator yang meleset dari target.',
        subModules: [
            {
                icon: NotebookPen,
                label: 'Evaluasi SAKIP',
                desc: 'Penilaian mandiri & evaluasi akuntabilitas kinerja OPD oleh Tim Evaluasi Internal',
            },
            {
                icon: AlertTriangle,
                label: 'Peringatan Kinerja (EWS)',
                desc: 'Deteksi otomatis indikator berisiko gagal target dengan notifikasi ke penanggung jawab',
            },
            {
                icon: Bell,
                label: 'Notifikasi',
                desc: 'Sistem pemberitahuan batas waktu pelaporan, persetujuan, dan tindak lanjut rekomendasi',
            },
            {
                icon: BarChart3,
                label: 'Aturan Peringatan',
                desc: 'Konfigurasi fleksibel ambang batas toleransi capaian dan jadwal pengiriman alert',
            },
        ],
    },
    {
        id: 'ai',
        label: 'AI & Analitik',
        icon: BrainCircuit,
        gradient: 'from-primary to-primary/80',
        title: 'Modul AI & Analitik Prediktif',
        subtitle: 'Kecerdasan Buatan untuk Pimpinan Daerah',
        description:
            'Asisten cerdas pimpinan daerah untuk penyusunan ringkasan eksekutif, identifikasi anomali data, dan proyeksi pencapaian target berbasis model statistik terverifikasi.',
        subModules: [
            {
                icon: Bot,
                label: 'AI Assistant',
                desc: 'Ringkasan eksekutif instan, rekomendasi kebijakan, dan analisis capaian untuk Gubernur & Kepala OPD',
            },
            {
                icon: TrendingUp,
                label: 'AI Prediction',
                desc: 'Proyeksi ketercapaian target akhir tahun berbasis tren historis dan model statistik',
            },
            {
                icon: BarChart3,
                label: 'Dashboard Analitik',
                desc: 'Visualisasi matriks kinerja antar OPD, heatmap realisasi, dan tren deviasi target',
            },
            {
                icon: MessageCircle,
                label: 'WhatsApp AI Chatbot',
                desc: 'Chatbot WhatsApp untuk pimpinan OPD: tanya capaian kinerja langsung via pesan singkat',
            },
            {
                icon: FileText,
                label: 'Template Prompt',
                desc: 'Pustaka template prompt AI yang dapat dikustomisasi untuk berbagai kebutuhan analitik',
            },
        ],
    },
    {
        id: 'reporting',
        label: 'Pelaporan LKjIP',
        icon: BarChart3,
        gradient: 'from-sky-500 to-blue-600',
        title: 'Modul Pelaporan & Executive Dashboard',
        subtitle: 'Laporan Kinerja Instansi Pemerintah Otomatis',
        description:
            'Visualisasi matriks kinerja antar OPD, perbandingan target vs realisasi, analitik deviasi, serta ekspor Laporan Kinerja Instansi Pemerintah (LKjIP).',
        subModules: [
            {
                icon: FileText,
                label: 'Laporan Kinerja (LKjIP)',
                desc: 'Penyusunan draft LKjIP resmi secara otomatis berdasarkan data realisasi yang telah diverifikasi',
            },
            {
                icon: BarChart3,
                label: 'Dashboard Eksekutif',
                desc: 'Ringkasan kinerja pimpinan: capaian, deviasi, dan status per OPD dalam satu layar',
            },
            {
                icon: FileText,
                label: 'Laporan Publik',
                desc: 'Portal publik dokumen perencanaan dan laporan kinerja OPD yang dapat diakses tanpa login',
            },
            {
                icon: ScrollText,
                label: 'Audit Trail',
                desc: 'Log aktivitas lengkap seluruh transaksi sistem - dari input data hingga persetujuan laporan',
            },
        ],
    },
    {
        id: 'integration',
        label: 'Integrasi API',
        icon: ShieldCheck,
        gradient: 'from-slate-700 to-slate-900',
        title: 'Modul Integrasi & Satu Data Kinerja',
        subtitle: 'Interoperabilitas & Tata Kelola Akses',
        description:
            'Interoperabilitas data dengan SIPD dan portal Satu Data melalui RESTful API terstandar, didukung kontrol akses berbasis peran (RBAC).',
        subModules: [
            {
                icon: Plug,
                label: 'Integrasi Sistem',
                desc: 'REST API bearer-token untuk koneksi SIPD, Satu Data, dan sistem eksternal lainnya',
            },
            {
                icon: Users,
                label: 'Manajemen Pengguna',
                desc: 'Registrasi akun ASN OPD, whitelist WhatsApp, dan penugasan peran pengguna',
            },
            {
                icon: Shield,
                label: 'Hak Akses & Peran (RBAC)',
                desc: 'Kontrol akses granular berbasis peran: Super Admin, Perangkat Daerah, Kepala OPD, Pelaksana, Publik',
            },
            {
                icon: Building2,
                label: 'Manajemen Organisasi',
                desc: 'Kelola data OPD, unit kerja, dan struktur organisasi perangkat daerah',
            },
            {
                icon: CalendarRange,
                label: 'Manajemen Periode',
                desc: 'Setup periode perencanaan 5 tahunan, tahunan, dan triwulanan secara terpusat',
            },
            {
                icon: Settings,
                label: 'Pengaturan Sistem',
                desc: 'Konfigurasi dasar sistem: tema, notifikasi, parameter aplikasi, dan kunci integrasi',
            },
        ],
    },
];

export default function Modules() {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';

    const [active, setActive] = useState(0);
    const mod = modules[active];
    const ModIcon = mod.icon;

    return (
        <section id="modul" className="scroll-mt-20 bg-white py-20 dark:bg-background border-b border-slate-200/80 dark:border-border">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <Reveal className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs dark:border-border dark:bg-muted dark:text-foreground">
                        <Layers className="h-3.5 w-3.5 stroke-[2.5] text-primary" />
                        <span>Arsitektur Sistem Tata Kelola</span>
                    </span>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-foreground">
                        Modul Fungsional {appName}
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-gray-600 dark:text-muted-foreground">
                        Enam modul inti yang saling terintegrasi untuk mendukung siklus tata kelola akuntabilitas kinerja {instansiName}.
                    </p>
                </Reveal>

                {/* ── Tab Navigasi Modul ─────────────────────────────────────── */}
                <Reveal delay={1}>
                    <div className="mt-10 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3 lg:grid-cols-6 dark:border-border dark:bg-muted/30">
                        {modules.map((m, i) => {
                            const Icon = m.icon;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setActive(i)}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
                                        active === i
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground'
                                    }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span>{m.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </Reveal>

                {/* ── Detail Card Modul ──────────────────────────────────────── */}
                <div
                    key={mod.id}
                    className="mt-8 animate-fade-in rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-border dark:bg-card"
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-7 dark:border-border">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                            <ModIcon className="h-6 w-6 stroke-[2]" />
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold leading-snug text-gray-900 dark:text-foreground sm:text-xl">
                                {mod.title}
                            </h3>
                            <p className="text-xs font-semibold text-primary">{mod.subtitle}</p>
                        </div>
                        <div className="ml-auto hidden shrink-0 items-center gap-1.5 sm:flex">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Aktif & Terintegrasi
                            </span>
                        </div>
                    </div>

                    <div className="p-5 sm:p-7">
                        {/* Deskripsi */}
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-muted-foreground sm:text-base">
                            {mod.description}
                        </p>

                        {/* Sub-Modul Grid */}
                        <div className="mt-6">
                            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-muted-foreground">
                                Sub-Modul & Kapabilitas ({mod.subModules.length} fitur)
                            </div>
                            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {mod.subModules.map((sm) => {
                                    const SmIcon = sm.icon;
                                    return (
                                        <li
                                            key={sm.label}
                                            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-colors hover:border-primary/20 hover:bg-primary/5 dark:border-border dark:bg-muted/20 dark:hover:border-primary/30 dark:hover:bg-primary/10"
                                        >
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs ring-1 ring-slate-200/80 dark:bg-muted dark:ring-border">
                                                <SmIcon className="h-4 w-4 text-primary" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-gray-800 dark:text-foreground">
                                                    {sm.label}
                                                </div>
                                                <div className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-muted-foreground">
                                                    {sm.desc}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Footer Info Bar */}
                        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5 text-xs text-gray-500 dark:border-border dark:text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Interoperabilitas: <strong className="text-gray-800 dark:text-foreground">Satu Data Papua API</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Jejak Audit: <strong className="text-gray-800 dark:text-foreground">Terekam Otomatis</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Otorisasi: <strong className="text-gray-800 dark:text-foreground">RBAC ASN Papua</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
