import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Network, FileBarChart2, BookOpen, ArrowRight, CheckCircle2, HardHat, Compass } from 'lucide-react';
import Reveal from './Reveal';

export default function CivicPortals() {
    const { appConfig } = usePage<PageProps>().props;
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    const portals = [
        {
            title: 'Pohon Kinerja Cascading PUPR',
            category: 'CASCADING STRATEGIS',
            badgeText: 'RENSTRA PUPR',
            badgeColor: 'border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50',
            description:
                'Telusuri hierarki sasaran strategis dari Renstra Dinas PUPR Mimika ke sekretariat, bidang teknis (Bina Marga, Cipta Karya, SDA, Penataan Ruang), hingga pengawasan proyek lapangan.',
            href: route('laporan.publik.pohon-kinerja'),
            icon: Network,
            ctaText: 'Buka Pohon Kinerja',
            highlights: ['Hierarki sasaran infrastruktur', 'Integrasi IKU bidang teknis', 'Penyelarasan pagu APBD'],
        },
        {
            title: 'Laporan SAKIP & Arsip LHE',
            category: 'DOKUMEN & EVALUASI',
            badgeText: 'ARSIP TERBUKA',
            badgeColor: 'border-blue-400 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50',
            description:
                'Akses dokumen Renstra Dinas PUPR Mimika, Perjanjian Kinerja (PK), Lembar Hasil Evaluasi (LHE) Inspektorat, dan LKjIP tahunan secara transparan.',
            href: route('laporan.publik.index'),
            icon: FileBarChart2,
            ctaText: 'Akses Dokumen Kinerja',
            highlights: ['Unduh berkas resmi PDF/Excel', 'Pencarian per bidang teknis', 'Transparansi hasil evaluasi'],
        },
        {
            title: 'Bank Regulasi & Standar PUPR',
            category: 'PEDOMAN HUKUM & SOP',
            badgeText: 'STANDAR TEKNIS',
            badgeColor: 'border-amber-400/60 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50',
            description:
                'Repositori peraturan perundang-undangan, PermenPUPR, PermenPAN-RB No. 88/2021, petunjuk teknis penilaian IKU, serta SOP verifikasi bukti fisik lapangan.',
            href: route('knowledge.public.index'),
            icon: BookOpen,
            ctaText: 'Jelajahi Bank Regulasi',
            highlights: ['PermenPUPR & PermenPAN-RB', 'SOP verifikasi fisik & keuangan', 'Panduan teknis aparatur'],
        },
    ];

    return (
        <section className="relative bg-[#F8FAFC] dark:bg-[#070E17] py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Reveal className="mb-12 text-center max-w-2xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#002B49] border border-amber-400/40 text-amber-300 text-xs font-mono uppercase tracking-wider mb-3">
                        <HardHat className="w-3.5 h-3.5 text-[#FFB800]" />
                        <span>KETERBUKAAN KINERJA INFRASTRUKTUR</span>
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-slate-900 dark:text-white tracking-tight">
                        Portal Layanan Informasi Publik {orgName}
                    </h2>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Masyarakat Kabupaten Mimika dapat meninjau capaian kinerja, dokumen perencanaan, dan standar mutu infrastruktur secara langsung tanpa perantara.
                    </p>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {portals.map((portal) => {
                        const Icon = portal.icon;
                        return (
                            <Link
                                key={portal.title}
                                href={portal.href}
                                className="group relative rounded-3xl bg-white dark:bg-[#0B1522] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FFB800]/10 to-transparent rounded-bl-full pointer-events-none" />

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#002B49] text-[#FFB800] shadow-md group-hover:scale-110 transition-transform border border-amber-400/30">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${portal.badgeColor}`}>
                                            {portal.badgeText}
                                        </span>
                                    </div>

                                    <div className="text-[10px] font-mono font-bold text-[#D97706] dark:text-amber-400 tracking-wider uppercase mb-1">
                                        {portal.category}
                                    </div>

                                    <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white group-hover:text-[#D97706] dark:group-hover:text-amber-400 transition-colors">
                                        {portal.title}
                                    </h3>

                                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                                        {portal.description}
                                    </p>

                                    {/* Highlights list */}
                                    <ul className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                                        {portal.highlights.map((h) => (
                                            <li key={h} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFB800] shrink-0" />
                                                <span>{h}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#002B49] dark:text-[#FFB800] group-hover:translate-x-1 transition-transform">
                                    <span>{portal.ctaText}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
