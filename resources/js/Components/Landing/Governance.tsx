import {
    ShieldCheck,
    FileCheck2,
    KeyRound,
    CheckCircle2,
    Database,
    BellRing,
} from 'lucide-react';
import Reveal from './Reveal';

const items = [
    {
        icon: ShieldCheck,
        title: 'Kontrol Akses Berbasis Peran ASN',
        text: 'Otorisasi ketat sesuai tugas pokok dan fungsi (Tupoksi) ASN Papua Barat — Administrator Daerah, Kepala OPD, Penilai Inspektorat, dan Analis Kebijakan.',
    },
    {
        icon: FileCheck2,
        title: 'Jejak Audit & Riwayat Perubahan',
        text: 'Pencatatan menyeluruh setiap penambahan, koreksi, dan persetujuan data capaian realisasi (pengguna, waktu, dan nilai sebelum/sesudah).',
    },
    {
        icon: KeyRound,
        title: 'Autentikasi Aman & Sesi Terpusat',
        text: 'Manajemen sesi terpusat dengan enkripsi standar dan kesiapan integrasi identitas digital aparatur pemerintah provinsi.',
    },
    {
        icon: CheckCircle2,
        title: 'Validasi & Verifikasi Bukti Dukung',
        text: 'Integritas data realisasi dijaga melalui formula indikator otomatis, batasan toleransi deviasi, dan lampiran bukti fisik yang terverifikasi.',
    },
    {
        icon: Database,
        title: 'Pencadangan & Keberlangsungan Sistem',
        text: 'Prosedur backup data berkala dan pemulihan bencana (disaster recovery) terdokumentasi untuk menjaga ketersediaan layanan publik Papua Barat.',
    },
    {
        icon: BellRing,
        title: 'Log Aktivitas & Notifikasi EWS',
        text: 'Pemberitahuan otomatis batas akhir pelaporan triwulanan, evaluasi tertunda, dan eskalasi indikator yang membutuhkan intervensi pimpinan.',
    },
];

export default function Governance() {
    return (
        <section id="keamanan" className="scroll-mt-20 bg-slate-50/70 py-20 dark:bg-muted/20 border-b border-slate-200/80 dark:border-border">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <Reveal className="text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs dark:border-border dark:bg-muted dark:text-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5] text-primary" />
                        <span>Tata Kelola & Integritas Papua Barat</span>
                    </span>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl dark:text-foreground">
                        Standar Tata Kelola & Keamanan Data
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-gray-600 dark:text-muted-foreground">
                        Keandalan dan validitas data kinerja adalah fondasi pengambilan kebijakan daerah — didukung lapisan kepatuhan dan keamanan yang teruji di Tanah Papua Barat.
                    </p>
                </Reveal>

                <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <Reveal key={item.title} delay={(i % 3 + 1) as 1 | 2 | 3 | 4}>
                                <div className="group h-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-border dark:bg-card">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary group-hover:scale-105 transition-transform">
                                        <Icon className="h-5 w-5 stroke-[2]" />
                                    </span>
                                    <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-foreground">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-muted-foreground">
                                        {item.text}
                                    </p>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
