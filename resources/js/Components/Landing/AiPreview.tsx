import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { FileSpreadsheet, Sparkles, TrendingUp, ShieldCheck, MessageSquareCheck, Terminal, Cpu } from 'lucide-react';
import Reveal from './Reveal';

const modes = [
    {
        id: 'summary',
        label: 'Ringkasan Eksekutif Pimpinan',
        badge: 'EXECUTIVE BRIEF',
        icon: FileSpreadsheet,
        headline: 'Konsolidasi Kepatuhan & Capaian Kinerja Seluruh Bidang',
        text: 'Capaian indikator kinerja pada triwulan berjalan menunjukkan tingkat kepatuhan pelaporan tepat waktu sebesar 94.2% di seluruh Unit Kerja. Bidang Bina Marga dan Cipta Karya mencatatkan progres signifikan.',
        actionNote: 'Siap diverifikasi Tim Evaluator SAKIP Kabupaten Mimika',
        tags: ['Formula Resmi PermenPAN-RB', 'Format LKjIP Sah', 'Jejak Audit Permanen'],
    },
    {
        id: 'insight',
        label: 'Deteksi Deviasi & Rekomendasi',
        badge: 'GAP ANALYSIS',
        icon: Sparkles,
        headline: 'Identifikasi Dini Deviasi Realisasi Fisik vs Anggaran',
        text: 'Terdeteksi selisih deviasi lebih dari 15% pada penyerapan anggaran sub-kegiatan tertentu akibat keterlambatan bukti dukung lapangan (evidence). Rekomendasi: Penerbitan disposisi percepatan verifikasi administrasi sebelum tutup buku triwulan.',
        actionNote: 'Rekomendasi LHE otomatis terpetakan ke Penanggung Jawab (PIC)',
        tags: ['Early Warning Alert', 'PIC Definitif', 'Bebas Asumsi Sepihak'],
    },
    {
        id: 'prediction',
        label: 'Proyeksi Ketercapaian Target',
        badge: 'PREDICTIVE STATS',
        icon: TrendingUp,
        headline: 'Estimasi Realisasi Akhir Tahun Berbasis Tren Historis',
        text: 'Model regresi runtun waktu atas historis data capaian IKU organisasi memproyeksikan indeks akuntabilitas kinerja SAKIP berada pada tren peningkatan positif menuju predikat kinerja Sangat Baik (A).',
        actionNote: 'Model statistik deterministik murni - keputusan akhir tetap di tangan pimpinan',
        tags: ['Regresi Runtun Waktu', 'Validasi Empiris', 'Data Sah Terverifikasi'],
    },
];

export default function AiPreview() {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    const [active, setActive] = useState(0);
    const mode = modes[active];
    const ActiveIcon = mode.icon;

    return (
        <section id="ai" className="scroll-mt-14 bg-gradient-to-b from-[#002B49] via-[#062237] to-[#041624] text-white py-16 sm:py-24 border-b border-amber-500/20 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Reveal className="mb-14 text-center max-w-2xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#FFB800]/40 text-[#FFB800] text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-md">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>ASISTEN ANALITIK PROYEK &amp; KINERJA INFRASTRUKTUR</span>
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-white tracking-tight">
                        Konsol Analitik Kinerja Pimpinan PUPR
                    </h2>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
                        Alat bantu analisis data SAKIP deterministik untuk memantau deviasi penyerapan anggaran dan capaian fisik proyek infrastruktur {orgName} {instansiName}.
                    </p>
                </Reveal>

                <div className="grid gap-8 lg:grid-cols-12 items-stretch">
                    {/* Left: Mode Selection + WhatsApp Notification Gateway Preview */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="space-y-2">
                            {modes.map((m, i) => {
                                const Icon = m.icon;
                                const isCurrent = active === i;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setActive(i)}
                                        className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                                            isCurrent
                                                ? 'bg-gradient-to-r from-[#002B49] to-zinc-900 text-white border-amber-500 shadow-lg scale-[1.02]'
                                                : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                                isCurrent
                                                    ? 'bg-amber-400 text-zinc-950 font-bold'
                                                    : 'bg-zinc-800 text-zinc-400'
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                                                {m.badge}
                                            </div>
                                            <div className="text-xs font-bold leading-tight font-serif mt-0.5">
                                                {m.label}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* WhatsApp Gateway Integration Card */}
                        <div className="p-4 rounded-2xl border border-amber-500/30 bg-[#002B49]/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 font-bold text-amber-300 text-xs mb-1.5">
                                <MessageSquareCheck className="h-4 w-4 text-[#FFB800]" />
                                <span>WhatsApp Notifikasi Terdaftar</span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed">
                                Notifikasi ringkasan evaluasi dan peringatan dini (EWS) diteruskan langsung ke kontak resmi pimpinan yang terverifikasi dalam sistem.
                            </p>
                        </div>
                    </div>

                    {/* Right: Rich Interactive Console Display */}
                    <div className="lg:col-span-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
                        <div>
                            {/* Console Title Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002B49] border border-amber-500/30 text-amber-400">
                                        <ActiveIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white font-serif">
                                            {mode.headline}
                                        </h3>
                                        <div className="text-[11px] font-mono text-zinc-400">
                                            Basis Data Sah • {appName} {instansiName}
                                        </div>
                                    </div>
                                </div>

                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#002B49] border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                    <span>DATA TERVALIDASI</span>
                                </span>
                            </div>

                            {/* Main Body Text */}
                            <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 mb-6">
                                <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 font-sans">
                                    {mode.text}
                                </p>
                                <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center gap-2 text-[11px] text-amber-300 font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span>Catatan: {mode.actionNote}</span>
                                </div>
                            </div>

                            {/* Pill Tags */}
                            <div className="flex flex-wrap gap-2">
                                {mode.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1 text-[11px] font-mono text-zinc-300"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Footer Status */}
                        <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span className="flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                                <span>Algoritma Deterministik SAKIP</span>
                            </span>
                            <span className="text-amber-400 font-bold">Audit Trail: Aktif</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
