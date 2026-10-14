import { useState } from 'react';
import { Check, ChevronRight, FileText, CheckCircle2, Award, AlertCircle, ArrowUpRight } from 'lucide-react';
import Reveal from './Reveal';

const phases = [
    {
        id: 'plan',
        step: '01',
        title: 'Perencanaan Strategis',
        subtitle: 'Cascading Sasaran RPJMD → Renstra OPD → IKU',
        headline: 'Perumusan Sasaran Strategis, IKU, dan Perjanjian Kinerja (PK)',
        description:
            'Penyusunan sasaran pembangunan daerah yang diturunkan secara hierarkis ke dinas, badan, dan biro teknis. Menetapkan indikator kinerja utama (IKU) beserta target triwulanan dan formula perhitungan matematis terstandar.',
        badge: 'Tahap 1: Perencanaan',
        outputDoc: 'Dokumen Perjanjian Kinerja & Pohon Kinerja OPD',
        items: [
            'Cascading indikator dari pimpinan daerah hingga kepala seksi/sub-kegiatan',
            'Penetapan formula perhitungan & satuan ukur target resmi',
            'Sinkronisasi target dengan ketersediaan pagu anggaran APBD',
            'Penyusunan pohon kinerja lintas sektor (cross-cutting)',
        ],
    },
    {
        id: 'measure',
        step: '02',
        title: 'Pengukuran & Realisasi',
        subtitle: 'Input Capaian Fisik & Keuangan + Evidence Sah',
        headline: 'Pencatatan Realisasi Berkala dengan Verifikasi Dokumen Bukti',
        description:
            'Pencatatan realisasi kinerja fisik dan serapan anggaran oleh setiap unit kerja secara berkala per triwulan. Dilengkapi unggahan bukti dukung (evidence) digital dan alur persetujuan bertingkat (maker-checker).',
        badge: 'Tahap 2: Pengukuran',
        outputDoc: 'Lembar Pengukuran Kinerja Triwulanan Terverifikasi',
        items: [
            'Input realisasi berkala per indikator & sub-kegiatan OPD',
            'Unggah bukti dukung sah (dokumen laporan, foto lapangan, faktur)',
            'Alur persetujuan berjenjang: Analis (Maker) → Kabid → Kepala OPD (Checker)',
            'Jejak audit permanen mencatat setiap perubahan data',
        ],
    },
    {
        id: 'evaluate',
        step: '03',
        title: 'Evaluasi AKIP Mandiri',
        subtitle: 'Penilaian Mandiri + Rekomendasi LHE SAKIP',
        headline: 'Penilaian Akuntabilitas & Penerbitan Tindak Lanjut Rekomendasi',
        description:
            'Perhitungan nilai akuntabilitas kinerja berdasarkan formula resmi PermenPAN-RB No. 88/2021. Tim Evaluator Internal menerbitkan Lembar Hasil Evaluasi (LHE) dan memantau realisasi tindak lanjut rekomendasi perbaikan.',
        badge: 'Tahap 3: Evaluasi',
        outputDoc: 'Lembar Hasil Evaluasi (LHE) & Matriks Rekomendasi',
        items: [
            'Perhitungan skor capaian otomatis berbasis formula resmi',
            'Penerbitan rekomendasi perbaikan dengan penanggung jawab (PIC) definitif',
            'Pelacakan status tindak lanjut rekomendasi secara real-time',
            'Matriks perbandingan kinerja antar-bidang dan seksi di lingkungan Dinas',
        ],
    },
    {
        id: 'report',
        step: '04',
        title: 'Pelaporan LKjIP & EWS',
        subtitle: 'Deteksi Dini Deviasi + Penyusunan LKjIP Otomatis',
        headline: 'Early Warning System (EWS) & Penyusunan Laporan Terintegrasi',
        description:
            'Deteksi dini indikator yang berada di bawah ambang batas kinerja untuk intervensi pimpinan, disertai pembuatan Laporan Kinerja Instansi Pemerintah (LKjIP) dan ringkasan eksekutif instan.',
        badge: 'Tahap 4: Pelaporan',
        outputDoc: 'Laporan Kinerja Instansi Pemerintah (LKjIP) Resmi',
        items: [
            'Early Warning System (EWS) dengan notifikasi deviasi kinerja',
            'Penyusunan laporan LKjIP & ringkasan eksekutif instan',
            'Analitik tren, deviasi, dan visualisasi capaian historis',
            'Proyeksi ketercapaian target berbasis model statistik deterministik',
        ],
    },
];

export default function Workflow() {
    const [active, setActive] = useState(0);

    return (
        <section id="sistem" className="relative scroll-mt-14 bg-white dark:bg-[#090d11] py-16 sm:py-24 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Reveal className="mb-14 text-center max-w-2xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#002B49] border border-amber-400/40 text-[#FFB800] text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-md">
                        <Award className="w-3.5 h-3.5 text-[#FFB800]" />
                        <span>STANDAR SAKIP PUPR • PERMENPAN-RB NO. 88/2021</span>
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-slate-900 dark:text-white tracking-tight">
                        Empat Siklus Manajemen Kinerja PUPR Mimika
                    </h2>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                        Rangkaian siklus akuntabilitas berkesinambungan - menghubungkan perencanaan Renstra dinas, verifikasi fisik lapangan, evaluasi AKIP, hingga publikasi LKjIP Kabupaten Mimika.
                    </p>
                </Reveal>

                {/* Interactive Process Stepper Progress Bar */}
                <div className="hidden lg:grid grid-cols-4 gap-4 mb-8">
                    {phases.map((phase, i) => {
                        const isActive = i === active;
                        const isPast = i < active;
                        return (
                            <button
                                key={phase.id}
                                type="button"
                                onClick={() => setActive(i)}
                                className={`text-left p-4 rounded-2xl border transition-all ${
                                    isActive
                                        ? 'bg-gradient-to-br from-[#002B49] to-[#0A2540] text-white border-[#FFB800] shadow-xl scale-[1.02]'
                                        : isPast
                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-slate-800 dark:text-slate-200'
                                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${
                                            isActive
                                                ? 'bg-[#FFB800] text-slate-950'
                                                : isPast
                                                ? 'bg-[#002B49] text-[#FFB800]'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {phase.step}
                                    </span>
                                    {isPast && <Check className="w-4 h-4 text-[#FFB800]" />}
                                </div>
                                <div className="font-serif font-bold text-sm truncate">{phase.title}</div>
                                <div className="text-[10px] opacity-75 truncate mt-0.5">{phase.subtitle}</div>
                            </button>
                        );
                    })}
                </div>

                {/* Mobile / Active Stage Content Card */}
                <div className="grid lg:grid-cols-12 gap-8 items-stretch">
                    {/* Left: Mobile selector + Quick Details */}
                    <div className="lg:col-span-5 space-y-3 lg:hidden">
                        {phases.map((phase, i) => (
                            <button
                                key={phase.id}
                                type="button"
                                onClick={() => setActive(i)}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs font-bold transition-all ${
                                    active === i
                                        ? 'bg-[#002B49] text-white border-[#FFB800] shadow-md'
                                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-amber-400">{phase.step}</span>
                                    <span>{phase.title}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 opacity-50" />
                            </button>
                        ))}
                    </div>

                    {/* Detailed Active Stage Console */}
                    <div className="lg:col-span-12 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 p-6 sm:p-10 shadow-xl flex flex-col justify-between">
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold uppercase">
                                        {phases[active].badge}
                                    </span>
                                    <span className="text-xs font-mono text-zinc-400">
                                        Tahap {phases[active].step} dari 04
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-lg border border-amber-500/20">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Output: {phases[active].outputDoc}</span>
                                </div>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-bold font-serif text-zinc-950 dark:text-white leading-snug">
                                {phases[active].headline}
                            </h3>

                            <p className="mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl">
                                {phases[active].description}
                            </p>

                            {/* Checklist features */}
                            <div className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-3">
                                    KOMPONEN OPERASIONAL SAKIP
                                </span>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {phases[active].items.map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 shadow-xs"
                                        >
                                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFB800]/20 text-[#D97706] dark:text-[#FFB800] mt-0.5">
                                                <Check className="h-3 w-3 stroke-[3]" />
                                            </div>
                                            <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                                                {item}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Stage navigation footer */}
                        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                            <button
                                type="button"
                                disabled={active === 0}
                                onClick={() => setActive((v) => Math.max(0, v - 1))}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                ← Tahap Sebelumnya
                            </button>

                            <button
                                type="button"
                                disabled={active === phases.length - 1}
                                onClick={() => setActive((v) => Math.min(phases.length - 1, v + 1))}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#002B49] to-[#0A2540] hover:from-[#062035] hover:to-[#002B49] text-[#FFB800] border border-[#FFB800]/40 font-bold text-xs shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <span>Tahap Selanjutnya</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
