import { useCountUp } from '@/hooks/useCountUp';
import { Target, Building2, CheckCircle2, FileText, ArrowUpRight, Sparkles } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import Reveal from './Reveal';
import { LandingStats } from './types';

const formatId = (n: number) => n.toLocaleString('id-ID');

const BIDANG_TEKNIS_PUPR = [
    { code: 'BM', name: 'Bina Marga', role: 'Jalan & Jembatan' },
    { code: 'CK', name: 'Cipta Karya', role: 'Gedung & SPAM Air' },
    { code: 'SDA', name: 'Sumber Daya Air', role: 'Drainase & Banjir' },
    { code: 'TR', name: 'Tata Ruang', role: 'RTRW & Zonasi' },
    { code: 'BK', name: 'Bina Konstruksi', role: 'Mutu & K3 Proyek' },
];

export default function Stats({ stats }: { stats: LandingStats }) {
    const { appConfig } = usePage<PageProps>().props;
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';

    const indicators = useCountUp(stats.indicators);
    const organizations = useCountUp(stats.organizations);
    const realizations = useCountUp(stats.realizations);
    const documents = useCountUp(stats.public_documents);

    const rows = [
        {
            ref: indicators.ref,
            value: indicators.value,
            label: 'Indikator Kinerja Daerah',
            note: 'IKU & target terstandar',
            icon: Target,
            iconColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
            badge: 'Aktif',
            href: null,
        },
        {
            ref: organizations.ref,
            value: organizations.value,
            label: 'Perangkat Daerah Terdaftar',
            note: 'Dinas, Badan & Unit Kerja',
            icon: Building2,
            iconColor: 'text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary',
            badge: 'Terintegrasi',
            href: null,
        },
        {
            ref: realizations.ref,
            value: realizations.value,
            label: 'Realisasi Tervalidasi',
            note: 'Capaian fisik & data dukung',
            icon: CheckCircle2,
            iconColor: 'text-[#002B49] bg-amber-100 dark:bg-amber-950/60 dark:text-[#FFB800]',
            badge: 'Tervalidasi',
            href: null,
        },
        {
            ref: documents.ref,
            value: documents.value,
            label: 'Dokumen SAKIP Publik',
            note: 'Transparansi & regulasi daerah',
            icon: FileText,
            iconColor: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
            badge: 'Publik',
            href: null,
        },
    ];

    return (
        <section className="relative bg-white py-16 sm:py-20 dark:bg-background border-b border-slate-100 dark:border-border">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {rows.map((row, i) => {
                        const Icon = row.icon;
                        const cardContent = (
                            <div
                                ref={row.ref}
                                className={`group h-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-border dark:bg-card ${
                                    row.href ? 'ring-1 ring-primary/20 hover:border-primary/40' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${row.iconColor}`}>
                                        <Icon className="h-5 w-5 stroke-[2]" />
                                    </span>
                                    {row.href ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground dark:bg-primary/20">
                                            <span>{row.badge}</span>
                                            <ArrowUpRight className="h-3 w-3" />
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-muted dark:text-muted-foreground">
                                            {row.badge}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-foreground">
                                    {formatId(row.value)}
                                </div>
                                <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {row.label}
                                </div>
                                <div className="mt-0.5 text-xs text-gray-500 dark:text-muted-foreground">
                                    {row.note}
                                </div>
                            </div>
                        );

                        return (
                            <Reveal key={row.label} delay={(i + 1) as 1 | 2 | 3 | 4}>
                                {row.href ? (
                                    <Link href={row.href} className="block h-full">
                                        {cardContent}
                                    </Link>
                                ) : (
                                    cardContent
                                )}
                            </Reveal>
                        );
                    })}
                </div>

                {/* 5 Matra Bidang PUPR Mimika Showcase */}
                <Reveal delay={2} className="mt-8">
                    <div className="rounded-2xl border border-amber-500/30 bg-slate-50/90 dark:bg-card p-5 shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start sm:items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB800]/15 text-amber-700 dark:text-[#FFB800]">
                                    <Sparkles className="h-5 w-5 stroke-[2]" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900 dark:text-foreground">
                                            5 Matra Teknis Terpadu • Dinas PUPR Mimika
                                        </span>
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
                                            Bumi Amungme &amp; Kamoro
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-muted-foreground">
                                        Penyelarasan target IKU, pengawasan bukti fisik lapangan, dan serapan anggaran dinas
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {BIDANG_TEKNIS_PUPR.map((bidang) => (
                                    <div
                                        key={bidang.code}
                                        className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-left shadow-2xs dark:border-border dark:bg-muted/30 hover:border-[#FFB800]/50 transition-colors"
                                    >
                                        <div className="text-[11px] font-bold text-gray-900 dark:text-foreground truncate flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" />
                                            <span>{bidang.name}</span>
                                        </div>
                                        <div className="mt-0.5 text-[10px] text-gray-500 dark:text-muted-foreground truncate">
                                            {bidang.role}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
