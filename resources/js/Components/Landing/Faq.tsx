import { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import Reveal from './Reveal';

const CATEGORIES = [
    { id: 'all', label: 'Semua Pertanyaan' },
    { id: 'umum', label: 'Tentang Sistem' },
    { id: 'capaian', label: 'Penginputan Capaian' },
    { id: 'evaluasi', label: 'Evaluasi & LHE' },
    { id: 'publik', label: 'Akses Masyarakat' },
];

export default function Faq() {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    const faqs = [
        {
            category: 'umum',
            q: `Apa peran strategis ${appName} bagi ${orgName} ${instansiName}?`,
            a: `${appName} adalah sistem informasi akuntabilitas kinerja terintegrasi yang menyelaraskan sasaran pembangunan infrastruktur RPJMD Kabupaten Mimika ke 5 bidang teknis dinas (Bina Marga, Cipta Karya, Sumber Daya Air, Tata Ruang, Bina Konstruksi). Berlandaskan PermenPAN-RB No. 88/2021 dan standar mutu Kementerian PUPR.`,
        },
        {
            category: 'umum',
            q: `Siapa saja yang memiliki hak akses ke konsol aparatur?`,
            a: `Akses internal diberikan kepada aparatur resmi dengan pembagian 7 peran birokrasi berjenjang: Super Admin, Kepala OPD (Checker), Admin OPD (Maker), Kepala Sekretariat, Admin Sekretariat, Kepala Bidang, dan Admin Bidang.`,
        },
        {
            category: 'capaian',
            q: 'Mengapa penginputan realisasi memerlukan bukti dukung fisik & digital?',
            a: 'Prinsip akuntabilitas modern mewajibkan setiap angka capaian kinerja dan penyerapan anggaran dapat dipertanggungjawabkan melalui dokumen bukti sah (evidence) untuk mencegah data semu dan mempermudah audit inspektorat.',
        },
        {
            category: 'evaluasi',
            q: 'Bagaimana alur penerbitan rekomendasi Lembar Hasil Evaluasi (LHE)?',
            a: 'Setelah OPD menuntaskan penginputan capaian triwulanan, Tim Evaluator Internal melakukan penilaian mandiri (AKIP), menghitung skor otomatis, dan menerbitkan rekomendasi LHE dengan menunjuk Pejabat Penanggung Jawab (PIC) untuk ditindaklanjuti.',
        },
        {
            category: 'evaluasi',
            q: 'Apa fungsi modul Peringatan Dini (Early Warning System / EWS)?',
            a: 'Modul EWS mendeteksi indikator yang realisasinya berada di bawah batas toleransi atau deviasi anggaran tinggi, memberikan sinyal langsung ke dashboard pimpinan agar segera dilakukan penyesuaian strategi sebelum akhir tahun anggaran.',
        },
        {
            category: 'publik',
            q: 'Dokumen apa saja yang dapat diakses oleh masyarakat umum tanpa login?',
            a: 'Masyarakat umum dapat mengakses visualisasi Pohon Kinerja Cascading, arsip Lembar Hasil Evaluasi (LHE), ringkasan LKjIP Perangkat Daerah, serta pusat regulasi dan SOP SAKIP secara terbuka melalui menu navigasi publik.',
        },
    ];

    const [activeCategory, setActiveCategory] = useState('all');
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const filteredFaqs = activeCategory === 'all'
        ? faqs
        : faqs.filter((f) => f.category === activeCategory);

    return (
        <section id="faq" className="scroll-mt-14 bg-white dark:bg-[#090d11] py-16 sm:py-24 border-b border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                <Reveal className="mb-12 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-mono uppercase tracking-wider mb-3">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>INFORMASI &amp; PERTANYAAN RESMI</span>
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-zinc-950 dark:text-white tracking-tight">
                        Pertanyaan yang Sering Diajukan
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
                        Panduan dan informasi teknis seputar operasional sistem {appName} di lingkungan {instansiName}.
                    </p>
                </Reveal>

                {/* Interactive Category Filter Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setOpenIndex(0);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeCategory === cat.id
                                    ? 'bg-gradient-to-r from-[#002B49] to-[#0A2540] text-[#FFB800] shadow-md border border-[#FFB800]/50'
                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    {filteredFaqs.map((faq, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div
                                key={faq.q}
                                className={`rounded-2xl border transition-all ${
                                    isOpen
                                        ? 'border-amber-500/40 bg-zinc-50/80 dark:bg-zinc-900/80 shadow-md'
                                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                                >
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white font-serif leading-snug">
                                        {faq.q}
                                    </span>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-transform ${
                                        isOpen ? 'bg-amber-400 text-zinc-950 rotate-180' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                    }`}>
                                        <ChevronDown className="h-4 w-4" />
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-5 pt-0">
                                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-200/80 dark:border-zinc-800/80 pt-3.5 font-normal">
                                            {faq.a}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
