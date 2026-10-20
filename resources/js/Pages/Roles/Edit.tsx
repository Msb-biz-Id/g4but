import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState, useMemo } from 'react';
import {
    CheckSquare2,
    Shield,
    Square,
    Search,
    ArrowLeft,
    CheckCircle2,
    Lock,
    SlidersHorizontal,
    FileCheck,
    Layers,
    Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermissionItem {
    id: number;
    name: string;
    resource: string;
    action: string;
}

interface Props extends PageProps {
    role: {
        id: number;
        name: string;
        description: string | null;
        permissions: Array<{ id: number }>;
    };
    permissions: Record<string, PermissionItem[]>;
}

// Terjemahan Lengkap Nama & Keterangan Modul Sistem
const MODULE_INFO: Record<string, { title: string; desc: string }> = {
    iam: {
        title: 'Identitas & Manajemen Pengguna (IAM)',
        desc: 'Pengaturan akun aparatur, penetapan peran pengguna, dan izin akses sistem.',
    },
    master_data: {
        title: 'Data Master (Organisasi, Periode & Satuan)',
        desc: 'Pengelolaan daftar Perangkat Daerah (OPD), periode perencanaan 5 tahunan (Renstra), dan kamus indikator.',
    },
    planning: {
        title: 'Perencanaan Kinerja (Renstra & Renja)',
        desc: 'Penyusunan tujuan strategis daerah, sasaran, perjanjian kinerja (PK), dan rencana aksi tahunan.',
    },
    measurement: {
        title: 'Pengukuran Kinerja (Realisasi & IKU)',
        desc: 'Penginputan capaian triwulanan, pengesahan nilai realisasi, bukti dukung, dan status IKU.',
    },
    reporting: {
        title: 'Pelaporan Kinerja (LKIP)',
        desc: 'Penyusunan, pembuatan otomatis, dan ekspor Laporan Kinerja Instansi Pemerintah (LKIP).',
    },
    evaluation: {
        title: 'Evaluasi Kinerja (SAKIP & LHE)',
        desc: 'Penilaian 4 komponen akuntabilitas kinerja SAKIP dan Lembar Hasil Evaluasi (LHE).',
    },
    ews: {
        title: 'Sistem Peringatan Dini (Early Warning System)',
        desc: 'Pemantauan anomali capaian, konfirmasi keterlambatan, dan mitigasi deviasi target kinerja.',
    },
    notification: {
        title: 'Notifikasi & Pengumuman Sistem',
        desc: 'Penerimaan notifikasi dan penyiaran pengumuman penting kepada seluruh aparatur.',
    },
    audit: {
        title: 'Log Audit & Jejak Rekam Sistem',
        desc: 'Pencatatan dan penelusuran seluruh riwayat perubahan data serta riwayat login pengguna.',
    },
    knowledge: {
        title: 'Pusat Informasi & Regulasi Kinerja',
        desc: 'Publikasi dokumen peraturan perundangan, pedoman teknis SAKIP, dan materi panduan SOP.',
    },
    ai: {
        title: 'AI Asisten & Analitik Eksekutif',
        desc: 'Penggunaan kecerdasan buatan untuk resume eksekutif, insight, dan rekomendasi tindak lanjut.',
    },
    integration: {
        title: 'Integrasi Layanan & WhatsApp',
        desc: 'Pengelolaan integrasi API eksternal dan kanal pesan WhatsApp pimpinan daerah.',
    },
    configuration: {
        title: 'Pengaturan & Konfigurasi Sistem',
        desc: 'Konfigurasi teknis, batas kuota, dan preferensi aplikasi SIPERFORMA PUPR.',
    },
};

const MODULE_COLORS: Record<string, string> = {
    iam: 'border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/10',
    master_data: 'border-slate-200/80 bg-slate-50/40 dark:bg-slate-900/20',
    planning: 'border-indigo-200/80 bg-indigo-50/30 dark:bg-indigo-950/10',
    measurement: 'border-teal-200/80 bg-teal-50/30 dark:bg-teal-950/10',
    reporting: 'border-purple-200/80 bg-purple-50/30 dark:bg-purple-950/10',
    evaluation: 'border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/10',
    ews: 'border-orange-200/80 bg-orange-50/30 dark:bg-orange-950/10',
    notification: 'border-cyan-200/80 bg-cyan-50/30 dark:bg-cyan-950/10',
    audit: 'border-zinc-200/80 bg-zinc-50/30 dark:bg-zinc-900/20',
    knowledge: 'border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/10',
    ai: 'border-violet-200/80 bg-violet-50/30 dark:bg-violet-950/10',
    integration: 'border-sky-200/80 bg-sky-50/30 dark:bg-sky-950/10',
    configuration: 'border-gray-200/80 bg-gray-50/30 dark:bg-gray-900/20',
};

// Kamus Nama Izin Akses Bahasa Indonesia Lengkap
const PERMISSION_INFO: Record<string, { title: string; desc: string; actionLabel: string; actionColor: string }> = {
    // IAM & Pengguna
    'user:view': { title: 'Lihat Daftar Pengguna', desc: 'Melihat akun dan profil seluruh pengguna sistem', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'user:create': { title: 'Tambah Pengguna Baru', desc: 'Mendaftarkan akun operator / pejabat baru', actionLabel: 'Tambah', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'user:update': { title: 'Ubah Data Pengguna', desc: 'Mengedit profil, email, dan wewenang pengguna', actionLabel: 'Ubah', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    'user:deactivate': { title: 'Nonaktifkan Akun Pengguna', desc: 'Memblokir atau mencabut akses masuk akun', actionLabel: 'Blokir', actionColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    'user:reset_password': { title: 'Reset Kata Sandi Pengguna', desc: 'Mengatur ulang kata sandi pengguna', actionLabel: 'Reset', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    'role:view': { title: 'Lihat Daftar Peran', desc: 'Melihat daftar peran dan hak akses sistem', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'role:assign': { title: 'Tetapkan Peran Pengguna', desc: 'Menghubungkan peran RBAC ke akun pengguna', actionLabel: 'Tetapkan', actionColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    'role:manage': { title: 'Kelola Peran & Izin Akses', desc: 'Mengubah konfigurasi matriks peran dan izin RBAC', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'permission:view': { title: 'Lihat Master Hak Akses', desc: 'Melihat seluruh daftar izin akses terdaftar', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'permission:manage': { title: 'Kelola Master Hak Akses', desc: 'Mengatur izin akses teknis pada tingkat sistem', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },

    // Data Master
    'organization:view': { title: 'Lihat Perangkat Daerah (OPD)', desc: 'Melihat profil dan daftar perangkat daerah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'organization:create': { title: 'Tambah Perangkat Daerah', desc: 'Mendaftarkan instansi OPD baru ke sistem', actionLabel: 'Tambah', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'organization:update': { title: 'Ubah Data Perangkat Daerah', desc: 'Memperbarui nama instansi, kode, atau pimpinan', actionLabel: 'Ubah', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    'organization_unit:view': { title: 'Lihat Unit Kerja / Bidang', desc: 'Melihat sub-bagian unit kerja di bawah OPD', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'organization_unit:manage': { title: 'Kelola Unit Kerja / Bidang', desc: 'Menambah dan menyusun struktur unit bidang', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'planning_period:view': { title: 'Lihat Periode Perencanaan', desc: 'Melihat rentang tahun Renstra', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'planning_period:manage': { title: 'Kelola Periode Perencanaan', desc: 'Mengatur rentang tahun perencanaan 5 tahunan', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'measurement_period:view': { title: 'Lihat Periode Pengukuran', desc: 'Melihat jadwal triwulan input realisasi aktif', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'measurement_period:manage': { title: 'Kelola Periode Pengukuran', desc: 'Membuka atau menutup jadwal pelaporan triwulan', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'indicator:view': { title: 'Lihat Master Indikator', desc: 'Melihat kamus indikator kinerja daerah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'indicator:create': { title: 'Tambah Master Indikator', desc: 'Menambahkan indikator kinerja baru ke kamus', actionLabel: 'Tambah', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'indicator:update': { title: 'Ubah Master Indikator', desc: 'Mengubah definisi operasional dan formula indikator', actionLabel: 'Ubah', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    'indicator:archive': { title: 'Arsipkan Indikator', desc: 'Mengarsipkan indikator yang sudah tidak aktif', actionLabel: 'Arsip', actionColor: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
    'indicator:version': { title: 'Versi Baru Indikator', desc: 'Mencatat riwayat pembaruan formula indikator', actionLabel: 'Versi', actionColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    'unit:view': { title: 'Lihat Satuan Pengukuran', desc: 'Melihat daftar satuan ukur (%, orang, dokumen, dll)', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'unit:manage': { title: 'Kelola Satuan Pengukuran', desc: 'Menambah atau mengedit satuan pengukuran', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'reference:view': { title: 'Lihat Data Referensi', desc: 'Melihat tabel rujukan pembantu sistem', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'reference:manage': { title: 'Kelola Data Referensi', desc: 'Mengatur tabel rujukan pembantu sistem', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'import:run': { title: 'Jalankan Impor Data Massal', desc: 'Mengunggah data Excel dalam jumlah besar ke database', actionLabel: 'Impor', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    'migration:run': { title: 'Jalankan Migrasi Data Sistem', desc: 'Memproses sinkronisasi data antar periode sistem', actionLabel: 'Migrasi', actionColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },

    // Perencanaan
    'goal:view': { title: 'Lihat Tujuan Strategis', desc: 'Melihat tujuan makro pembangunan jangka menengah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'goal:manage': { title: 'Kelola Tujuan Strategis', desc: 'Menambah dan menyunting tujuan strategis daerah', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'objective:view': { title: 'Lihat Sasaran Strategis', desc: 'Melihat sasaran pembangunan perangkat daerah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'objective:manage': { title: 'Kelola Sasaran Strategis', desc: 'Menambah dan menyunting sasaran strategis daerah', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'target:view': { title: 'Lihat Target Kinerja Tahunan', desc: 'Melihat target capaian tahunan indikator', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'target:manage': { title: 'Kelola Target Kinerja Tahunan', desc: 'Menetapkan angka target tahunan untuk OPD', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'performance_node:view': { title: 'Lihat Pohon Kinerja', desc: 'Melihat visualisasi cascading pohon kinerja daerah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'performance_node:manage': { title: 'Kelola Pohon Kinerja', desc: 'Mengatur relasi hierarki node pada pohon kinerja', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'agreement:view': { title: 'Lihat Perjanjian Kinerja (PK)', desc: 'Melihat dokumen perjanjian kinerja kepala OPD', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'agreement:manage': { title: 'Kelola Perjanjian Kinerja (PK)', desc: 'Menyusun naskah penetapan perjanjian kinerja', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'agreement:approve': { title: 'Sahkan Perjanjian Kinerja', desc: 'Mengesahkan penetapan PK pimpinan secara resmi', actionLabel: 'Sahkan', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'action_plan:view': { title: 'Lihat Rencana Aksi (Renaksi)', desc: 'Melihat rincian rencana aksi kegiatan tahunan', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'action_plan:manage': { title: 'Kelola Rencana Aksi (Renaksi)', desc: 'Menyusun jadwal kegiatan, sub-aksi, dan target', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'risk:view': { title: 'Lihat Profil Risiko Kinerja', desc: 'Melihat matriks daftar identifikasi risiko kinerja', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'risk:manage': { title: 'Kelola Profil Risiko Kinerja', desc: 'Menyusun analisis risiko dan rencana mitigasi', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'planning:submit': { title: 'Ajukan Dokumen Perencanaan', desc: 'Mengirimkan dokumen perencanaan untuk diverifikasi', actionLabel: 'Ajukan', actionColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    'planning:review': { title: 'Verifikasi Dokumen Perencanaan', desc: 'Memeriksa kelengkapan dan keselarasan dokumen', actionLabel: 'Verifikasi', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    'planning:approve': { title: 'Sahkan / Setujui Dokumen Perencanaan', desc: 'Mengesahkan dan menyetujui dokumen perencanaan', actionLabel: 'Sahkan', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'iku:view': { title: 'Lihat Indikator Kinerja Utama (IKU)', desc: 'Melihat daftar IKU daerah dan IKU OPD', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'iku:create': { title: 'Tambah Indikator IKU', desc: 'Menambahkan indikator utama baru ke modul IKU', actionLabel: 'Tambah', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'iku:update': { title: 'Ubah Data Indikator IKU', desc: 'Memperbarui formula, satuan, atau target tahunan IKU', actionLabel: 'Ubah', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    'iku:submit': { title: 'Ajukan Usulan IKU ke Verifikator', desc: 'Mengirim usulan IKU OPD ke admin perencanaan', actionLabel: 'Ajukan', actionColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    'iku:review': { title: 'Verifikasi & Telaah IKU', desc: 'Menelaah kelayakan IKU sesuai standar PermenPANRB', actionLabel: 'Verifikasi', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    'iku:finalize': { title: 'Finalisasi & Kunci IKU', desc: 'Mengesahkan dan mengunci IKU agar tidak berubah', actionLabel: 'Finalisasi', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'iku:deactivate': { title: 'Nonaktifkan Indikator IKU', desc: 'Menonaktifkan IKU yang tidak lagi digunakan', actionLabel: 'Nonaktif', actionColor: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
    'iku:delete': { title: 'Hapus Indikator IKU', desc: 'Menghapus data IKU yang keliru diinput', actionLabel: 'Hapus', actionColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    'iku:export': { title: 'Ekspor Data Indikator IKU', desc: 'Mengunduh rekap IKU ke format spreadsheet', actionLabel: 'Ekspor', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'iku:import': { title: 'Impor Data Indikator IKU', desc: 'Mengunggah daftar IKU dari berkas Excel', actionLabel: 'Impor', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },

    // Pengukuran
    'realization:view': { title: 'Lihat Realisasi Kinerja', desc: 'Melihat capaian fisik dan anggaran perangkat daerah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'realization:create': { title: 'Input Capaian Realisasi', desc: 'Mengisi capaian triwulanan IKU dan rencana aksi', actionLabel: 'Input', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'realization:update': { title: 'Perbarui Nilai Realisasi', desc: 'Mengoreksi angka capaian sebelum disahkan', actionLabel: 'Ubah', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    'realization:submit': { title: 'Ajukan Realisasi ke Verifikator', desc: 'Mengirimkan laporan realisasi untuk dinilai', actionLabel: 'Ajukan', actionColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    'realization:approve': { title: 'Sahkan / Setujui Realisasi', desc: 'Menyetujui capaian kinerja yang terverifikasi sah', actionLabel: 'Sahkan', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'realization:reject': { title: 'Tolak Pengajuan Realisasi', desc: 'Menolak data capaian yang tidak sesuai target', actionLabel: 'Tolak', actionColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    'realization:revision': { title: 'Minta Revisi Realisasi', desc: 'Mengembalikan berkas realisasi untuk diperbaiki OPD', actionLabel: 'Revisi', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    'realization:reopen': { title: 'Buka Kembali Periode Pengisian', desc: 'Membuka izin pengisian susulan untuk perangkat daerah', actionLabel: 'Buka Susulan', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'evidence:view': { title: 'Lihat Bukti Dukung Capaian', desc: 'Melihat arsip dokumen bukti fisik/anggaran yang diunggah', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'evidence:upload': { title: 'Unggah Bukti Dukung Capaian', desc: 'Melampirkan berkas bukti dukung capaian kinerja', actionLabel: 'Unggah', actionColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    'evidence:download': { title: 'Unduh Bukti Dukung Capaian', desc: 'Mengunduh berkas lampiran data dukung', actionLabel: 'Unduh', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },

    // Pelaporan
    'report:view': { title: 'Lihat Laporan Kinerja (LKIP)', desc: 'Melihat dokumen laporan akuntabilitas kinerja', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'report:generate': { title: 'Susun Laporan LKIP Otomatis', desc: 'Menghasilkan draf naskah LKIP berbasis data sistem', actionLabel: 'Generate', actionColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    'report:export_pdf': { title: 'Unduh Laporan Format PDF', desc: 'Mencetak laporan kinerja resmi berstandar dokumen PDF', actionLabel: 'PDF', actionColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    'report:export_xlsx': { title: 'Unduh Laporan Format Excel', desc: 'Mengekspor matriks tabel laporan ke lembar kerja Excel', actionLabel: 'Excel', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'report:export_csv': { title: 'Unduh Laporan Format CSV', desc: 'Mengekspor data mentah laporan kinerja ke format CSV', actionLabel: 'CSV', actionColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    'dashboard:view': { title: 'Akses Dashboard Analitik', desc: 'Melihat ringkasan eksekutif, grafik tren, dan matriks OPD', actionLabel: 'Akses', actionColor: 'bg-primary/10 text-primary' },

    // Evaluasi
    'evaluation:view': { title: 'Lihat Evaluasi SAKIP & LHE', desc: 'Melihat nilai evaluasi, predikat nilai, dan lembar LHE', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'evaluation:score': { title: 'Beri Penilaian Evaluasi Kinerja', desc: 'Mengisi skor pada 4 komponen akuntabilitas kinerja', actionLabel: 'Nilai', actionColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    'evaluation:submit': { title: 'Ajukan Lembar Hasil Evaluasi', desc: 'Mengirimkan berkas LHE ke Tim Evaluasi Internal / Kepala OPD', actionLabel: 'Ajukan', actionColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    'evaluation:manage': { title: 'Kelola Evaluasi Akuntabilitas', desc: 'Mengatur parameter penilaian dan catatan evaluasi', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'recommendation:view': { title: 'Lihat Rekomendasi SAKIP', desc: 'Melihat daftar rekomendasi perbaikan dari evaluator', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'recommendation:manage': { title: 'Kelola Rekomendasi SAKIP', desc: 'Menyusun rekomendasi tindak lanjut hasil evaluasi', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'followup:view': { title: 'Lihat Tindak Lanjut Evaluasi', desc: 'Melihat progres penanganan catatan rekomendasi LHE', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'followup:manage': { title: 'Input Tindak Lanjut Evaluasi', desc: 'Melaporkan langkah aksi tindak lanjut dari OPD', actionLabel: 'Input', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'followup:verify': { title: 'Verifikasi Tindak Lanjut', desc: 'Mengesahkan bukti tindak lanjut rekomendasi OPD', actionLabel: 'Verifikasi', actionColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },

    // Early Warning
    'alert:view': { title: 'Lihat Peringatan Dini Kinerja', desc: 'Melihat daftar notifikasi deviasi dan keterlambatan OPD', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'alert:acknowledge': { title: 'Konfirmasi Peringatan Dini', desc: 'Menandai bahwa peringatan dini telah dibaca & diketahui', actionLabel: 'Konfirmasi', actionColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    'alert:resolve': { title: 'Selesaikan Peringatan Dini', desc: 'Menandai penyelesaian atas peringatan kinerja OPD', actionLabel: 'Selesai', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    'alert_rule:view': { title: 'Lihat Aturan Peringatan', desc: 'Melihat ambang batas toleransi keterlambatan target', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'alert_rule:manage': { title: 'Kelola Aturan Peringatan', desc: 'Mengatur ambang batas dan formula pemicu alarm peringatan', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },

    // Notifikasi
    'notification:view': { title: 'Lihat Notifikasi Pengguna', desc: 'Menerima pesan notifikasi dan pengumuman aplikasi', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'notification:send': { title: 'Kirim Notifikasi / Pengumuman', desc: 'Mengirimkan pesan pengumuman resmi ke akun pengguna', actionLabel: 'Kirim', actionColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },

    // Audit Log
    'audit_log:view': { title: 'Lihat Log Audit & Jejak Rekam', desc: 'Memeriksa rekam jejak aktivitas dan riwayat login pengguna', actionLabel: 'Audit', actionColor: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },

    // Pusat Informasi
    'knowledge:view': { title: 'Akses Pusat Informasi & Regulasi', desc: 'Membaca dokumen regulasi, pedoman teknis, dan materi SOP', actionLabel: 'Akses', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'knowledge:manage': { title: 'Kelola Dokumen Pusat Informasi', desc: 'Mengunggah, mengedit, dan menghapus dokumen informasi', actionLabel: 'Kelola', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    'knowledge:publish': { title: 'Publikasikan Konten Informasi', desc: 'Menyetujui dokumen agar dapat diakses publik/pengguna', actionLabel: 'Publikasi', actionColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },

    // AI
    'ai:use': { title: 'Akses Layanan AI Asisten', desc: 'Menggunakan chatbot AI untuk konsultasi SAKIP dan analisis kinerja', actionLabel: 'AI', actionColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },

    // Integrasi
    'integration:view': { title: 'Lihat Integrasi Layanan Eksternal', desc: 'Melihat status koneksi webhook dan layanan WhatsApp bot', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },

    // Konfigurasi
    'config:view': { title: 'Lihat Konfigurasi Sistem', desc: 'Melihat preferensi dan pengaturan operasional aplikasi', actionLabel: 'Lihat', actionColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    'config:manage': { title: 'Kelola Pengaturan Sistem', desc: 'Mengubah parameter keamanan, nama instansi, dan konfigurasi', actionLabel: 'Konfigurasi', actionColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
};

// Fallback generator jika ada permission baru yang belum terdaftar
function getPermissionMeta(perm: PermissionItem) {
    if (PERMISSION_INFO[perm.name]) {
        return PERMISSION_INFO[perm.name];
    }

    const actionMap: Record<string, { label: string; color: string }> = {
        view: { label: 'Lihat', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        create: { label: 'Tambah', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
        update: { label: 'Ubah', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
        delete: { label: 'Hapus', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
        manage: { label: 'Kelola', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
        approve: { label: 'Sahkan', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
        reject: { label: 'Tolak', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
        submit: { label: 'Ajukan', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
        review: { label: 'Verifikasi', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
        export: { label: 'Ekspor', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
        import: { label: 'Impor', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    };

    const actionMeta = actionMap[perm.action] || {
        label: perm.action.charAt(0).toUpperCase() + perm.action.slice(1),
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };

    const formattedResource = perm.resource.replace(/_/g, ' ');
    const title = `${actionMeta.label} ${formattedResource.charAt(0).toUpperCase() + formattedResource.slice(1)}`;

    return {
        title,
        desc: `Izin untuk ${actionMeta.label.toLowerCase()} pada entitas ${formattedResource}`,
        actionLabel: actionMeta.label,
        actionColor: actionMeta.color,
    };
}

export default function RolesEdit({ role, permissions }: Props) {
    const { appConfig } = usePage<Props>().props;
    const appName = appConfig?.appName || 'SIPERFORMA PUPR';

    const { data, setData, errors, put, processing } = useForm({
        name: role.name,
        description: role.description ?? '',
        permission_ids: role.permissions.map((p) => p.id),
    });

    const [search, setSearch] = useState('');
    const isSuperAdmin = role.name === 'Super Admin';

    const selected = useMemo(() => new Set(data.permission_ids), [data.permission_ids]);

    const toggle = (id: number) => {
        if (isSuperAdmin) return;
        setData(
            'permission_ids',
            selected.has(id) ? data.permission_ids.filter((v) => v !== id) : [...data.permission_ids, id]
        );
    };

    const selectModule = (ids: number[], checked: boolean) => {
        if (isSuperAdmin) return;
        const moduleIds = new Set(ids);
        setData(
            'permission_ids',
            checked
                ? Array.from(new Set([...data.permission_ids, ...ids]))
                : data.permission_ids.filter((v) => !moduleIds.has(v))
        );
    };

    const selectAllGlobal = () => {
        if (isSuperAdmin) return;
        const allIds = Object.values(permissions).flat().map((p) => p.id);
        setData('permission_ids', allIds);
    };

    const clearAllGlobal = () => {
        if (isSuperAdmin) return;
        setData('permission_ids', []);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(route('roles.update', role.id));
    };

    const totalSelected = data.permission_ids.length;
    const totalAll = Object.values(permissions).flat().length;

    // Filter permissions based on search query
    const filteredModuleEntries = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return Object.entries(permissions);

        return Object.entries(permissions)
            .map(([module, items]) => {
                const moduleMatch =
                    (MODULE_INFO[module]?.title || module).toLowerCase().includes(q) ||
                    (MODULE_INFO[module]?.desc || '').toLowerCase().includes(q);

                const matchedItems = items.filter((item) => {
                    const meta = getPermissionMeta(item);
                    return (
                        moduleMatch ||
                        item.name.toLowerCase().includes(q) ||
                        item.resource.toLowerCase().includes(q) ||
                        item.action.toLowerCase().includes(q) ||
                        meta.title.toLowerCase().includes(q) ||
                        meta.desc.toLowerCase().includes(q)
                    );
                });

                return [module, matchedItems] as [string, PermissionItem[]];
            })
            .filter(([, items]) => items.length > 0);
    }, [permissions, search]);

    return (
        <AuthenticatedLayout header={`Atur Hak Akses: ${role.name}`}>
            <Head title={`Atur Hak Akses Peran: ${role.name}`} />

            <div className="mx-auto max-w-6xl space-y-6">
                {/* Navigation Back & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
                    <div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 pl-1 text-muted-foreground hover:text-foreground">
                                <Link href={route('roles.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Kembali ke Daftar Peran</span>
                                </Link>
                            </Button>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
                            <span>Atur Hak Akses Peran:</span>
                            <span className="text-primary underline decoration-primary/30 decoration-2 underline-offset-4">
                                {role.name}
                            </span>
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tentukan matriks izin dan kewenangan operasional yang diperbolehkan untuk peran ini di seluruh modul SIPERFORMA PUPR.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-1.5 bg-primary/5 border-primary/20 text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{totalSelected} dari {totalAll} Izin Aktif</span>
                        </Badge>
                    </div>
                </div>

                <form autoComplete="off" noValidate onSubmit={submit} className="space-y-6">
                    {/* Role Info Card */}
                    <Card className="shadow-2xs border-border">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Shield className="h-4 w-4 text-primary" />
                                <span>Informasi & Identitas Peran</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Nama peran dan penjelasan ruang lingkup wewenang jabatan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2 pt-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold">
                                    Nama Peran (Role) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="cth: Admin Perencanaan OPD, Kepala Bidang"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    disabled={isSuperAdmin}
                                    className="text-sm"
                                />
                                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-semibold">
                                    Deskripsi Tugas & Kewenangan
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Jelaskan ruang lingkup wewenang, batasan akses, dan tanggung jawab peran ini..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    disabled={isSuperAdmin}
                                    rows={2}
                                    className="resize-none text-sm"
                                />
                                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permission Matrix Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <SlidersHorizontal className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Matriks Hak Akses Berbasis Modul (RBAC)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Centang izin yang ingin diberikan kepada peran ini.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                {/* Search Filter */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Cari izin akses (cth: realisasi)..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>

                                {!isSuperAdmin && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={selectAllGlobal}
                                            className="h-8 text-xs gap-1 cursor-pointer"
                                        >
                                            <CheckSquare2 className="h-3.5 w-3.5 text-primary" />
                                            <span>Pilih Semua</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearAllGlobal}
                                            className="h-8 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-destructive"
                                        >
                                            <Square className="h-3.5 w-3.5" />
                                            <span>Kosongkan</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Super Admin Notice */}
                        {isSuperAdmin && (
                            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                                <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Peran Super Administrator Dilindungi:</span>
                                    <p className="mt-0.5 text-indigo-800/90 dark:text-indigo-300">
                                        Peran ini memiliki seluruh hak akses sistem secara permanen dan tidak dapat diubah demi menjaga integritas dan kelangsungan operasional sistem {appName}.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Modules Grid */}
                        <div className="space-y-4">
                            {filteredModuleEntries.length === 0 ? (
                                <Card className="p-8 text-center text-muted-foreground border-dashed">
                                    <p className="text-sm font-medium">Tidak ada hak akses yang cocok dengan pencarian "{search}".</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSearch('')}
                                        className="mt-3 text-xs"
                                    >
                                        Bersihkan Pencarian
                                    </Button>
                                </Card>
                            ) : (
                                filteredModuleEntries.map(([module, items]) => {
                                    const modInfo = MODULE_INFO[module] || {
                                        title: module.replace(/_/g, ' ').toUpperCase(),
                                        desc: `Pengaturan hak akses modul ${module}`,
                                    };

                                    const modIds = items.map((p) => p.id);
                                    const allChecked = modIds.length > 0 && modIds.every((id) => selected.has(id));
                                    const someChecked = modIds.some((id) => selected.has(id)) && !allChecked;
                                    const countChecked = modIds.filter((id) => selected.has(id)).length;

                                    return (
                                        <Card
                                            key={module}
                                            className={cn(
                                                'overflow-hidden shadow-2xs border transition-all duration-200',
                                                MODULE_COLORS[module] || 'bg-card border-border'
                                            )}
                                        >
                                            {/* Module Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b px-4 py-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {!isSuperAdmin ? (
                                                        <Checkbox
                                                            checked={allChecked}
                                                            data-state={someChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
                                                            onCheckedChange={(v) => selectModule(modIds, !!v)}
                                                            id={`mod-${module}`}
                                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <label
                                                            htmlFor={`mod-${module}`}
                                                            className="cursor-pointer text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                                                        >
                                                            <span>{modInfo.title}</span>
                                                        </label>
                                                        <p className="text-[11px] text-muted-foreground truncate font-normal mt-0.5">
                                                            {modInfo.desc}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                    <Badge
                                                        variant={countChecked > 0 ? 'default' : 'outline'}
                                                        className={cn(
                                                            'text-xs font-mono px-2 py-0.5',
                                                            countChecked === items.length
                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                : countChecked > 0
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {countChecked} / {items.length} Aktif
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Permissions Grid */}
                                            <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-3">
                                                {items.map((perm) => {
                                                    const isChecked = selected.has(perm.id);
                                                    const meta = getPermissionMeta(perm);

                                                    return (
                                                        <label
                                                            key={perm.id}
                                                            className={cn(
                                                                'group relative flex items-start gap-3 rounded-xl p-2.5 transition-all duration-150 border select-none',
                                                                isSuperAdmin ? 'cursor-default' : 'cursor-pointer',
                                                                isChecked
                                                                    ? 'bg-white dark:bg-slate-800/90 border-primary/40 shadow-xs ring-1 ring-primary/20'
                                                                    : 'bg-white/40 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-300'
                                                            )}
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={() => toggle(perm.id)}
                                                                disabled={isSuperAdmin}
                                                                className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                                            />

                                                            <div className="min-w-0 flex-1 space-y-1">
                                                                <div className="flex items-start justify-between gap-1.5">
                                                                    <span
                                                                        className={cn(
                                                                            'text-xs font-semibold leading-tight line-clamp-2',
                                                                            isChecked ? 'text-foreground' : 'text-slate-700 dark:text-slate-300'
                                                                        )}
                                                                    >
                                                                        {meta.title}
                                                                    </span>
                                                                    <span
                                                                        className={cn(
                                                                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 select-none',
                                                                            meta.actionColor
                                                                        )}
                                                                    >
                                                                        {meta.actionLabel}
                                                                    </span>
                                                                </div>

                                                                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 font-normal">
                                                                    {meta.desc}
                                                                </p>

                                                                {/* Technical Code Identifier */}
                                                                <div className="pt-0.5">
                                                                    <code className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                                                        {perm.name}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Bottom Sticky Action Bar */}
                    <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                                Status:
                            </span>
                            <Badge variant="outline" className="text-xs font-semibold font-mono">
                                {totalSelected} Hak Akses Dipilih
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            <Button asChild variant="outline" size="sm" className="h-9 px-4 text-xs cursor-pointer">
                                <Link href={route('roles.index')}>
                                    Batal
                                </Link>
                            </Button>

                            {!isSuperAdmin && (
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    size="sm"
                                    className="h-9 px-5 text-xs font-semibold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>{processing ? 'Menyimpan Perubahan…' : 'Simpan Hak Akses'}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}