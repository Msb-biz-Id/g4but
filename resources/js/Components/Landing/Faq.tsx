import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import Reveal from './Reveal';

const faqs = [
    {
        q: 'Apa fungsi utama sistem e-KASUARI bagi Pemerintah Provinsi Papua Barat?',
        a: 'e-KASUARI adalah sistem informasi akuntabilitas dan evaluasi kinerja terpadu Pemerintah Provinsi Papua Barat. Sistem ini mengintegrasikan cascading sasaran RPJMD ke Renstra OPD, pemantauan realisasi fisik dan keuangan seluruh OPD (termasuk 4 OPD Pilot Project: Bappeda, Inspektorat, Koperasi & UKM, PUPR), evaluasi SAKIP mandiri dan Inspektorat, peringatan dini (EWS), hingga penyusunan laporan LKjIP secara transparan.',
    },
    {
        q: 'Siapa saja pihak yang memiliki hak akses ke dalam sistem di lingkungan Pemprov Papua Barat?',
        a: 'Akses diberikan kepada ASN dan pemangku kepentingan resmi dengan kontrol akses berbasis peran (RBAC) — meliputi Super Admin (Biro Organisasi), Admin OPD, Kepala OPD, Penilai Teknis Inspektorat/Bappeda, serta Pimpinan Daerah (Gubernur, Wakil Gubernur, dan Sekda).',
    },
    {
        q: 'Bagaimana integritas dan akuntabilitas data kinerja dijaga?',
        a: 'Setiap data realisasi diverifikasi melalui alur persetujuan bertingkat di lingkungan OPD, dilampiri dokumen bukti dukung fisik/keuangan (evidence), dan seluruh perubahan terekam secara permanen dalam jejak audit (audit trail).',
    },
    {
        q: 'Bagaimana peran modul AI & Analitik Prediktif bagi pimpinan daerah Papua Barat?',
        a: 'Modul AI berfungsi sebagai asisten Gubernur dan Kepala OPD dalam menyusun ringkasan eksekutif cepat, mendeteksi potensi deviasi penyerapan anggaran, dan menghitung proyeksi capaian berbasis regresi statistik terverifikasi tanpa intervensi otomatis terhadap keputusan kebijakan.',
    },
    {
        q: 'Apakah sistem dapat terhubung dengan portal Satu Data Papua Barat dan SIPD?',
        a: 'Ya. e-KASUARI dilengkapi API interoperabilitas standar nasional untuk memfasilitasi pertukaran data indikator, target, dan realisasi dengan portal Satu Data Papua Barat maupun sistem perencanaan pembangunan daerah.',
    },
    {
        q: 'Bagaimana langkah awal OPD Papua Barat untuk memulai pengisian data kinerja?',
        a: 'Gunakan tombol "Masuk" di pojok kanan atas dengan kredensial resmi OPD yang telah didaftarkan dan diverifikasi oleh Administrator Biro Organisasi Pemerintah Provinsi Papua Barat.',
    },
];

export default function Faq() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section id="faq" className="scroll-mt-20 bg-white py-20 dark:bg-background border-b border-slate-200/80 dark:border-border">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
                <Reveal className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs dark:border-border dark:bg-muted dark:text-foreground">
                        <HelpCircle className="h-3.5 w-3.5 stroke-[2.5] text-primary" />
                        <span>Tanya Jawab Seputar Papua Barat</span>
                    </span>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-foreground">
                        Pertanyaan yang Sering Diajukan
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-muted-foreground">
                        Panduan dan informasi teknis seputar operasional sistem e-KASUARI di lingkungan Pemerintah Provinsi Papua Barat.
                    </p>
                </Reveal>

                <div className="mt-10 space-y-3">
                    {faqs.map((faq, i) => {
                        const isOpen = open === i;
                        return (
                            <Reveal key={faq.q} delay={(i % 3 + 1) as 1 | 2 | 3 | 4}>
                                <div className={`overflow-hidden rounded-2xl border transition-colors ${isOpen ? 'border-primary/40 bg-primary/5 dark:border-primary/40 dark:bg-muted/30 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-border dark:bg-card'}`}>
                                    <button
                                        onClick={() => setOpen(isOpen ? null : i)}
                                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                                    >
                                        <span className="text-sm font-bold text-gray-900 dark:text-foreground">
                                            {faq.q}
                                        </span>
                                        <span
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform duration-200 ${
                                                isOpen ? 'bg-primary text-primary-foreground rotate-180 shadow-xs' : 'bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground'
                                            }`}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </span>
                                    </button>
                                    <div
                                        className={`grid transition-all duration-300 ease-in-out ${
                                            isOpen
                                                ? 'grid-rows-[1fr] opacity-100'
                                                : 'grid-rows-[0fr] opacity-0'
                                        }`}
                                    >
                                        <div className="overflow-hidden">
                                            <p className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
                                                {faq.a}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
