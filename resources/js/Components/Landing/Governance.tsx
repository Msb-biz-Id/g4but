import { usePage } from '@inertiajs/react';
import {
    ShieldCheck,
    FileCheck2,
    KeyRound,
    CheckCircle2,
    Database,
    BellRing,
    Sparkles,
} from 'lucide-react';
import Reveal from './Reveal';

const pillars = [
    {
        icon: ShieldCheck,
        title: 'Kontrol Akses Berbasis Tupoksi (RBAC)',
        category: 'OTORISASI ASN',
        badge: '7 ROLE BIROKRASI',
        text: 'Akses terbagi tegas sesuai wewenang: Pimpinan Daerah, Kepala OPD (Checker), Pejabat Teknis (Maker), hingga Admin Bidang demi pencegahan konflik kepentingan.',
    },
    {
        icon: FileCheck2,
        title: 'Jejak Audit Permanen & Tak Terbantahkan',
        category: 'AUDIT TRAIL',
        badge: 'FORENSIK DIGITAL',
        text: 'Setiap pengisian, koreksi target, dan persetujuan data capaian tercatat secara permanen dengan identitas NIP, stempel waktu WIT, dan nilai sebelum/sesudah.',
    },
    {
        icon: CheckCircle2,
        title: 'Validasi Bukti Fisik & Keuangan Sah',
        category: 'EVIDENCE-BASED',
        badge: 'BUKTI DUKUNG',
        text: 'Capaian indikator kinerja wajib dilampiri bukti dukung digital sah (faktur, dokumentasi lapangan, SK) sebelum disahkan oleh pimpinan perangkat daerah.',
    },
    {
        icon: KeyRound,
        title: 'Autentikasi Terenkripsi & Proteksi Akun',
        category: 'KEAMANAN SIBER',
        badge: 'HASH STANDAR NASIONAL',
        text: 'Proteksi kata sandi dengan enkripsi mutakhir, pembatasan percobaan brute-force, dan kesiapan integrasi identitas tunggal aparatur sipil negara.',
    },
    {
        icon: Database,
        title: 'Integritas Basis Data Berkesinambungan',
        category: 'KONTINUITAS',
        badge: 'REPLIKASI DATA',
        text: 'Arsip akuntabilitas dan pohon kinerja tersimpan dengan replikasi berkala, menjamin ketersediaan data historis lintas periode perencanaan pembangunan.',
    },
    {
        icon: BellRing,
        title: 'Sistem Deteksi Dini Kinerja (EWS)',
        category: 'EARLY WARNING',
        badge: 'NOTIFIKASI INTERVENSI',
        text: 'Pemberitahuan otomatis saat indikator mengalami deviasi di bawah target triwulanan agar pimpinan dapat segera mengambil langkah intervensi strategis.',
    },
];

export default function Governance() {
    const { appConfig } = usePage<any>().props;
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';

    return (
        <section id="keamanan" className="bg-[#F8FAFC] dark:bg-[#070E17] py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800 scroll-mt-14 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Reveal className="mb-14 text-center max-w-2xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#002B49] border border-amber-400/40 text-[#FFB800] text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#FFB800]" />
                        <span>INTEGRITAS DATA &amp; MUTU KONSTRUKSI</span>
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-slate-900 dark:text-white tracking-tight">
                        Enam Pilar Tata Kelola Kinerja {orgName}
                    </h2>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                        Menerapkan prinsip kehati-hatian, bukti sah lapangan (evidence), dan jejak audit permanen demi menjamin akuntabilitas pembangunan di {instansiName}.
                    </p>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pillars.map((pillar) => {
                        const Icon = pillar.icon;
                        return (
                            <Reveal key={pillar.title}>
                                <div className="group rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#002B49] to-slate-900 text-[#FFB800] border border-amber-400/30 shadow-md group-hover:scale-105 transition-transform">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                                {pillar.badge}
                                            </span>
                                        </div>

                                        <div className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                                            {pillar.category}
                                        </div>

                                        <h3 className="text-base font-bold text-zinc-950 dark:text-white font-serif mb-2 leading-snug">
                                            {pillar.title}
                                        </h3>

                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                            {pillar.text}
                                        </p>
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
