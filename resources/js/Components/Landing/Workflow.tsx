import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import Reveal from './Reveal';

const phases = [
    {
        id: 'plan',
        step: '01',
        title: 'Perencanaan Strategis Papua Barat',
        subtitle: 'Cascading Sasaran RPJMD → Renstra OPD → IKU',
        headline: 'Perumusan Sasaran Strategis, IKU, dan Perjanjian Kinerja',
        description:
            'Penyusunan tujuan, sasaran strategis, dan indikator kinerja utama (IKU) beserta target per periode pelaporan triwulanan dan tahunan di lingkungan Pemprov Papua Barat secara berjenjang.',
        items: [
            'Cascading indikator dari level Gubernur hingga bidang teknis OPD',
            'Penetapan formula perhitungan & satuan ukur target',
            'Penyusunan pohon kinerja & perjanjian kinerja daerah',
            'Manajemen dokumen perencanaan berversi dan tervalidasi',
        ],
    },
    {
        id: 'measure',
        step: '02',
        title: 'Pengukuran & Realisasi OPD',
        subtitle: 'Input capaian + bukti dukung + verifikasi',
        headline: 'Pencatatan Realisasi Kinerja Fisik & Penyerapan Anggaran',
        description:
            'Pencatatan realisasi kinerja fisik dan penyerapan anggaran oleh OPD Papua Barat secara berkala, disertai unggahan bukti dukung (evidence) dan verifikasi bertingkat.',
        items: [
            'Input realisasi berkala per indikator & sub-kegiatan OPD',
            'Unggah bukti dukung (dokumen, foto lapangan, tautan)',
            'Alur persetujuan bertingkat (Analis → Kepala Bidang → Kepala OPD)',
            'Jejak audit otomatis pada setiap koreksi data realisasi',
        ],
    },
    {
        id: 'evaluate',
        step: '03',
        title: 'Evaluasi SAKIP & Rekomendasi',
        subtitle: 'Penilaian mandiri + review Inspektorat Papua Barat',
        headline: 'Penilaian Mandiri AKIP & Rekomendasi LHE Pengawasan',
        description:
            'Perhitungan nilai akuntabilitas kinerja, analisis kesenjangan target vs realisasi, serta penerbitan rekomendasi perbaikan dari Inspektorat Provinsi Papua Barat.',
        items: [
            'Perhitungan skor capaian otomatis berbasis formula resmi',
            'Penerbitan rekomendasi LHE SAKIP dengan PIC terdefinisi',
            'Pelacakan status tindak lanjut rekomendasi secara real-time',
            'Matriks perbandingan kinerja antar Organisasi Perangkat Daerah',
        ],
    },
    {
        id: 'report',
        step: '04',
        title: 'Peringatan Dini & LKjIP Papua Barat',
        subtitle: 'EWS + laporan kinerja + analitik prediktif',
        headline: 'Early Warning System (EWS) & Penyusunan LKjIP Otomatis',
        description:
            'Deteksi dini indikator yang berada di bawah ambang batas kinerja, disertai pembuatan Laporan Kinerja Instansi Pemerintah (LKjIP) Papua Barat secara otomatis.',
        items: [
            'Early Warning System (EWS) dengan alur intervensi pimpinan',
            'Penyusunan laporan LKjIP & ringkasan eksekutif instan',
            'Analitik tren, deviasi, dan visualisasi capaian OPD',
            'Proyeksi ketercapaian target berbasis model statistik',
        ],
    },
];

export default function Workflow() {
    const [active, setActive] = useState(0);

    return (
        <section id="sistem" className="relative scroll-mt-20 bg-slate-50/60 py-16 sm:py-24 dark:bg-muted/20 border-b border-slate-200/80 dark:border-border">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <Reveal className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs dark:border-border dark:bg-muted dark:text-foreground">
                        <Check className="h-3.5 w-3.5 stroke-[2.5] text-primary" />
                        <span>Siklus Akuntabilitas Kinerja Papua Barat</span>
                    </span>
                    <h2 className="mt-3.5 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-foreground">
                        Alur Kerja Evaluasi Kinerja Terintegrasi
                    </h2>
                    <p className="mx-auto mt-2.5 max-w-2xl text-xs sm:text-base leading-relaxed text-gray-600 dark:text-muted-foreground">
                        Empat tahapan terpadu yang menghubungkan perencanaan hingga pelaporan akuntabilitas kinerja instansi pemerintah di Papua Barat.
                    </p>
                </Reveal>

                <div className="mt-8 sm:mt-12 grid gap-6 lg:gap-8 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr]">
                    <Reveal>
                        <div className="relative">
                            <div className="hidden sm:block absolute left-[21px] top-4 bottom-4 w-px bg-slate-200 dark:bg-border" />
                            <div className="space-y-2.5 sm:space-y-3">
                                {phases.map((phase, i) => {
                                    const isActive = i === active;
                                    return (
                                        <button
                                            key={phase.id}
                                            onClick={() => setActive(i)}
                                            className={`relative flex w-full items-center gap-3 sm:gap-4 rounded-2xl border p-3 sm:p-4 text-left transition-all ${
                                                isActive
                                                    ? 'border-primary bg-white shadow-md ring-1 ring-primary/30 dark:border-primary dark:bg-card'
                                                    : 'border-slate-200/70 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-border/60 dark:bg-card/40 dark:hover:border-border dark:hover:bg-card/70'
                                            }`}
                                        >
                                            <span
                                                className={`relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-extrabold transition ${
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                        : 'bg-white text-gray-700 ring-1 ring-slate-200 dark:bg-card dark:text-gray-300 dark:ring-border'
                                                }`}
                                            >
                                                {phase.step}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className={`text-xs sm:text-sm font-bold truncate leading-snug ${
                                                        isActive
                                                            ? 'text-primary'
                                                            : 'text-gray-900 dark:text-foreground'
                                                    }`}
                                                >
                                                    {phase.title}
                                                </div>
                                                <div className="mt-0.5 text-[11px] sm:text-xs text-gray-500 dark:text-muted-foreground truncate">
                                                    {phase.subtitle}
                                                </div>
                                            </div>
                                            <ChevronRight
                                                className={`h-4 w-4 shrink-0 transition-transform ${
                                                    isActive
                                                        ? 'text-primary translate-x-0.5'
                                                        : 'text-gray-300 dark:text-muted'
                                                }`}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={2}>
                        <div
                            key={active}
                            className="h-full animate-fade-in rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 lg:p-8 shadow-sm dark:border-border dark:bg-card"
                        >
                            <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <span>Tahap {phases[active].step} • {phases[active].title}</span>
                            </div>
                            <h3 className="mt-2 text-base sm:text-xl font-extrabold text-gray-900 leading-snug dark:text-foreground">
                                {phases[active].headline}
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
                                {phases[active].description}
                            </p>

                            <div className="mt-5 sm:mt-6 border-t border-slate-100 pt-5 sm:pt-6 dark:border-border">
                                <div className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-muted-foreground uppercase tracking-wider mb-3">
                                    Fitur & Output Utama SAKIP Papua Barat
                                </div>
                                <ul className="grid gap-2.5 sm:grid-cols-2">
                                    {phases[active].items.map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-gray-700 dark:border-border dark:bg-muted/30 dark:text-gray-300"
                                        >
                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                                            </span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
