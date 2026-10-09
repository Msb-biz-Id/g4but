import { useState } from 'react';
import { FileSpreadsheet, Sparkles, TrendingUp, ShieldCheck, MessageSquareCheck } from 'lucide-react';
import Reveal from './Reveal';

const modes = [
    {
        id: 'summary',
        label: 'Ringkasan Eksekutif Pimpinan',
        icon: FileSpreadsheet,
        text: 'Capaian Triwulan III Pemerintah Provinsi Papua Barat mencatat 84.6% target sasaran strategis terpenuhi. Empat OPD Pilot Project (Bappeda, Inspektorat, Koperasi & UKM, PUPR) mencatatkan kepatuhan pelaporan tepat waktu, sementara program prioritas dikawal intensif melalui Early Warning System (EWS).',
        tags: ['Berbasis Data SAKIP Papua Barat', 'Dapat Diaudit Inspektorat', 'Format LKjIP Resmi'],
    },
    {
        id: 'insight',
        label: 'Analisis Kesenjangan & Rekomendasi',
        icon: Sparkles,
        text: 'Terdeteksi deviasi realisasi fisik pada program strategis infrastruktur wilayah dan konektivitas antardaerah di Tanah Papua Barat. Rekomendasi: Penyesuaian jadwal pengadaan barang/jasa dan penguatan bukti dukung teknis sebelum audit Inspektorat.',
        tags: ['Pendeteksian Deviasi OPD', 'Rekomendasi Terstruktur', 'PIC Sektor Jelas'],
    },
    {
        id: 'prediction',
        label: 'Proyeksi Ketercapaian Akhir Tahun',
        icon: TrendingUp,
        text: 'Berdasarkan model regresi time-series atas data capaian kinerja di lingkungan Pemprov Papua Barat (R² = 0.94), estimasi nilai SAKIP provinsi pada akhir tahun anggaran diproyeksikan mencapai skor 86.20 (Predikat A Memuaskan).',
        tags: ['Model Numerik Statistik', 'Verifikasi Empiris Papua Barat', 'Bukan Keputusan Otomatis'],
    },
];

const forecast = [62, 68, 66, 74, 78, 84, 80, 88, 92];

export default function AiPreview() {
    const [active, setActive] = useState(0);
    const mode = modes[active];
    const ActiveIcon = mode.icon;

    return (
        <section id="ai" className="relative scroll-mt-20 overflow-hidden bg-slate-900 py-20 text-white dark:bg-card border-b border-slate-800">
            {/* Subtle Ambient Glows */}
            <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-slate-700/10 blur-3xl" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
                <Reveal className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-4 py-1 text-xs font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5 stroke-[2.5] text-primary" />
                        <span>Asisten Cerdas Kinerja Papua Barat</span>
                    </span>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
                        AI & Analitik Kinerja yang Akuntabel
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-slate-300">
                        Pemanfaatan kecerdasan buatan dirancang transparan sebagai alat bantu analisis pimpinan daerah — terhubung dengan portal web dan WhatsApp Gateway resmi dengan nomor terverifikasi.
                    </p>
                </Reveal>

                <div className="mt-12 grid gap-8 lg:grid-cols-[300px_1fr]">
                    <Reveal delay={1}>
                        <div className="space-y-2.5">
                            {modes.map((m, i) => {
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setActive(i)}
                                        className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                                            active === i
                                                ? 'border-primary bg-primary/20 text-white shadow-md'
                                                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white'
                                        }`}
                                    >
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active === i ? 'bg-primary text-primary-foreground font-bold' : 'bg-slate-800 text-slate-400'}`}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="text-xs font-bold leading-tight">{m.label}</span>
                                    </button>
                                );
                            })}

                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-[11px] text-emerald-300">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                    <MessageSquareCheck className="h-3.5 w-3.5" />
                                    <span>WhatsApp Bot Gateway</span>
                                </div>
                                <div className="mt-1 text-slate-400 leading-relaxed text-[10px]">
                                    Khusus nomor HP resmi pimpinan (Gubernur, Wagub, Sekda, Kepala Biro) yang telah terdaftar whitelist.
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={2}>
                        <div
                            key={mode.id}
                            className="flex h-full animate-fade-in flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-7 shadow-xl backdrop-blur"
                        >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                                        <ActiveIcon className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <div className="text-sm font-bold text-white">{mode.label}</div>
                                        <div className="text-[11px] text-slate-400">
                                            Asisten Analitik e-KASUARI Papua Barat
                                        </div>
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-800/60">
                                    Status: Tervalidasi
                                </span>
                            </div>

                            <p className="mt-5 text-sm sm:text-base leading-relaxed text-slate-200">
                                {mode.text}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {mode.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-md bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 text-[11px] font-medium text-slate-300"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>

                            {mode.id === 'prediction' && (
                                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                                    <div className="flex items-center justify-between text-xs text-slate-300">
                                        <span>Tren Historis vs Estimasi Akhir Tahun</span>
                                        <span className="font-bold text-emerald-400">
                                            Proyeksi 86.20 (Predikat A)
                                        </span>
                                    </div>
                                    <div className="mt-3 flex h-20 items-end gap-2">
                                        {forecast.map((h, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 origin-bottom animate-bar-grow rounded-t ${
                                                    i === forecast.length - 1
                                                        ? 'bg-emerald-500'
                                                        : 'bg-primary/70'
                                                }`}
                                                style={{
                                                    height: `${h}%`,
                                                    animationDelay: `${0.1 + i * 0.05}s`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-[11px] text-slate-400">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>Terekam jejak audit transparansi Pemprov Papua Barat</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                    <MessageSquareCheck className="h-3.5 w-3.5" />
                                    <span>Siap Integrasi WhatsApp Gateway</span>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
