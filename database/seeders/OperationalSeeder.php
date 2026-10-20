<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\AppNotification;
use App\Models\AuditLog;
use App\Models\KnowledgeDocument;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Report;
use App\Models\Risk;
use App\Models\User;
use Illuminate\Database\Seeder;

class OperationalSeeder extends Seeder
{
    /**
     * Menyiapkan Data Operasional Lengkap Dinas PUPR Kabupaten Mimika:
     * 1. Early Warning System (Alerts & Peringatan Dini)
     * 2. Manajemen Risiko Infrastruktur (Risks & Mitigasi)
     * 3. Pelaporan Kinerja Resmi (LKjIP Reports & Snapshots)
     * 4. Bank Regulasi & Standar Operasional Prosedur (Knowledge Documents)
     * 5. Notifikasi Sistem (App Notifications)
     * 6. Jejak Audit Kinerja (Audit Logs)
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();
        $uptd = Organization::where('code', 'UPTD-PUPR')->first() ?? $rootOpd;

        $pp2026 = PlanningPeriod::where('code', 'TA-2026')->firstOrFail();

        $superAdmin = User::where('email', 'superadmin@siperforma.local')->firstOrFail();
        $kadis = User::where('email', 'kepala.dinas@siperforma.local')->first() ?? $superAdmin;
        $adminOpd = User::where('email', 'admin.pupr@siperforma.local')->first() ?? $superAdmin;
        $kabidBM = User::where('email', 'kabid.binamarga@siperforma.local')->first() ?? $superAdmin;
        $kabidCK = User::where('email', 'kabid.ciptakarya@siperforma.local')->first() ?? $superAdmin;

        // ══════════════════════════════════════════════════════════════════════
        // 1. EARLY WARNING SYSTEM (ALERTS)
        // ══════════════════════════════════════════════════════════════════════
        $ruleBelow = AlertRule::where('code', 'REALIZATION_BELOW_TARGET')->first();
        $ruleWarning = AlertRule::where('code', 'REALIZATION_WARNING_TARGET')->first();
        $ruleLate = AlertRule::where('code', 'SUBMISSION_LATE')->first();
        $ruleBudget = AlertRule::where('code', 'BUDGET_ABSORPTION_LOW')->first();

        $alerts = [
            [
                'rule_id' => $ruleWarning?->id,
                'organization_id' => $bidangBM->id,
                'alert_type' => 'realization_deviation',
                'severity' => 'warning',
                'title' => 'Deviasi Capaian Fisik Proyek Peningkatan Jalan Poros Sp 2 - Sp 5',
                'message' => 'Progres fisik pada akhir Triwulan II sebesar 52.0% berada di bawah target jadwal 58.0% akibat intensitas hujan tinggi.',
                'status' => 'acknowledged',
                'owner_id' => $kabidBM->id,
                'acknowledged_by' => $kabidBM->id,
                'acknowledged_at' => now()->subDays(5),
            ],
            [
                'rule_id' => $ruleBudget?->id,
                'organization_id' => $bidangSDA->id,
                'alert_type' => 'budget_deviation',
                'severity' => 'critical',
                'title' => 'Peringatan Serapan Anggaran Sub-Kegiatan Normalisasi Alur Sungai',
                'message' => 'Realisasi penyerapan anggaran Triwulan I baru mencapai 48.2% dari pagu termin pertama.',
                'status' => 'open',
                'owner_id' => $adminOpd->id,
            ],
            [
                'rule_id' => $ruleLate?->id,
                'organization_id' => $bidangCK->id,
                'alert_type' => 'submission_delay',
                'severity' => 'warning',
                'title' => 'Keterlambatan Unggah Bukti Dukung (Evidence) BAP SPAM Komunal',
                'message' => 'Berkas BAP fisik termin kedua belum diunggah oleh pengawas lapangan melewati batas toleransi H+5.',
                'status' => 'resolved',
                'owner_id' => $kabidCK->id,
                'acknowledged_by' => $kabidCK->id,
                'acknowledged_at' => now()->subDays(12),
                'resolved_by' => $adminOpd->id,
                'resolved_at' => now()->subDays(2),
            ],
        ];

        foreach ($alerts as $alt) {
            Alert::updateOrCreate(
                [
                    'organization_id' => $alt['organization_id'],
                    'title' => $alt['title'],
                ],
                $alt
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 2. MANAJEMEN RISIKO PEMBANGUNAN (RISKS)
        // ══════════════════════════════════════════════════════════════════════
        $risks = [
            [
                'title' => 'Curah Hujan Ekstrem Mengakibatkan Keterlambatan Pengaspalan Jalan Poros',
                'risk_event' => 'Curah hujan tinggi pada musim hujan Timika menghambat pemadatan agregat dan pengaspalan hotmix',
                'description' => 'Faktor iklim dan cuaca basah khas wilayah pegunungan-pesisir Papua Tengah mengancam ketepatan jadwal penyelesaian proyek jalan.',
                'cause' => 'Anomali cuaca hujan berkepanjangan dan keterbatasan tenda kerja konstruksi',
                'impact' => 'Keterlambatan progres fisik sebesar 10-15% dari kurva S rencana',
                'likelihood' => 4,
                'impact_level' => 4,
                'risk_level' => 'high',
                'mitigation' => 'Penerapan metode kerja shift malam saat cuaca kering dan percepatan pekerjaan drainase samping sebelum perkerasan jalan.',
                'owner' => 'Kepala Bidang Bina Marga',
                'status' => 'mitigated',
                'organization_id' => $bidangBM->id,
            ],
            [
                'title' => 'Keterlambatan Mobilisasi Pipa HDPE dan Aksesoris Jaringan SPAM dari Luar Papua',
                'risk_event' => 'Keterlambatan pengiriman kontainer pipa dari Surabaya melalui Pelabuhan Pomako Timika',
                'description' => 'Pasokan material pabrikan tidak tersedia lokal sehingga tergantung pada jadwal kapal kargo laut.',
                'cause' => 'Jadwal pelayaran kapal kargo terbatas dan antrean bongkar muat di dermaga',
                'impact' => 'Pekerjaan galian pipa tertunda dan mengganggu kelancaran lalu lintas jalan',
                'likelihood' => 3,
                'impact_level' => 4,
                'risk_level' => 'medium',
                'mitigation' => 'Pemesanan material pabrikan sejak tahap awal kontrak (early procurement) dan penyediaan buffer stock di gudang dinas.',
                'owner' => 'Kepala Bidang Cipta Karya',
                'status' => 'mitigated',
                'organization_id' => $bidangCK->id,
            ],
            [
                'title' => 'Klaim Hak Ulayat dan Pelepasan Lahan pada Trase Peningkatan Jalan Distrik',
                'risk_event' => 'Warga masyarakat adat menghentikan sementara aktivitas alat berat terkait batas ganti rugi tanaman',
                'description' => 'Belum tuntasnya koordinasi musyawarah adat dapat menghentikan operasional kontraktor pelaksana.',
                'cause' => 'Keterlambatan mediasi batas tanah adat dan administrasi pelepasan hak',
                'impact' => 'Peralatan konstruksi idle dan potensi klaim perpanjangan waktu kontrak',
                'likelihood' => 3,
                'impact_level' => 4,
                'risk_level' => 'high',
                'mitigation' => 'Pendampingan tim fasilitator mediasi bersama Lembaga Musyawarah Adat Amungme dan Kamoro sebelum pekerjaan fisik dimulai.',
                'owner' => 'Sekretaris Dinas PUPR',
                'status' => 'identified',
                'organization_id' => $rootOpd->id,
            ],
            [
                'title' => 'Limpasan Debit Air Ekstrem Sungai Wania Merusak Tanggul Sementara (Cofferdam)',
                'risk_event' => 'Banjir kiriman dari hulu pegunungan menerjang galian fondasi parapet beton',
                'description' => 'Fluktuasi debit air sungai yang cepat saat hujan lebat di kawasan hulu Tembagapura.',
                'cause' => 'Curah hujan hulu sangat tinggi melebihi kapasitas bendung sementara',
                'impact' => 'Kerusakan pekerjaan fondasi awal dan peralatan pompa tergenang',
                'likelihood' => 3,
                'impact_level' => 4,
                'risk_level' => 'high',
                'mitigation' => 'Pemasangan sistem peringatan dini sensor ketinggian air hulu dan penguatan dewatering otomatis.',
                'owner' => 'Kepala Bidang Sumber Daya Air',
                'status' => 'mitigated',
                'organization_id' => $bidangSDA->id,
            ],
            [
                'title' => 'Keterlambatan Integrasi Peta RDTR Skala 1:5000 ke Sistem OSS Kementerian Investasi',
                'risk_event' => 'Format geodatabase RDTR memerlukan sinkronisasi standar atribut nasional',
                'description' => 'Kendala teknis interoperabilitas sistem GIS daerah dengan server pusat.',
                'cause' => 'Perubahan skema schema database spasial pada portal pusat',
                'impact' => 'Pelayanan persetujuan KKPR otomatis tertunda sementara waktu',
                'likelihood' => 2,
                'impact_level' => 3,
                'risk_level' => 'low',
                'mitigation' => 'Asistensi intensif bersama Tim GIS Kementerian ATR/BPN dan validasi topologi berkala.',
                'owner' => 'Kepala Bidang Penataan Ruang',
                'status' => 'mitigated',
                'organization_id' => $bidangTR->id,
            ],
            [
                'title' => 'Kerusakan Komponen Hidrolik Alat Berat Akibat Beban Kerja Ekstrem di Lapangan',
                'risk_event' => 'Ekskavator operasional UPTD mengalami kebocoran seal silinder boom',
                'description' => 'Kondisi medan galian berbatuan tajam dan sedimen tebal mempercepat keausan komponen.',
                'cause' => 'Keterlambatan suku cadang spesifik alat berat dari dealer di Jayapura/Surabaya',
                'impact' => 'Penanganan tanggap darurat normalisasi saluran terhambat 3-5 hari',
                'likelihood' => 3,
                'impact_level' => 3,
                'risk_level' => 'medium',
                'mitigation' => 'Pengadaan fast-moving spare parts kit di gudang bengkel UPTD dan jadwal servis berkala ketat.',
                'owner' => 'Kepala UPTD PUPR',
                'status' => 'mitigated',
                'organization_id' => $uptd->id,
            ],
        ];

        foreach ($risks as $rData) {
            Risk::updateOrCreate(
                [
                    'organization_id' => $rData['organization_id'],
                    'title' => $rData['title'],
                ],
                array_merge($rData, [
                    'created_by' => $adminOpd->id,
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 3. PELAPORAN KINERJA RESMI (LKJIP REPORTS)
        // ══════════════════════════════════════════════════════════════════════
        $reports = [
            [
                'code' => 'LKJIP-PUPR-2024',
                'title' => 'Laporan Kinerja Instansi Pemerintah (LKjIP) Dinas PUPR Kabupaten Mimika Tahun 2024',
                'type' => 'annual',
                'format' => 'pdf',
                'status' => 'completed',
                'parameters' => ['year' => 2024, 'scope' => 'opd', 'verified' => true],
                'file_path' => 'reports/lkjip_pupr_mimika_2024.pdf',
                'generated_by' => $adminOpd->id,
                'generated_at' => '2025-02-15 11:30:00',
            ],
            [
                'code' => 'LKJIP-PUPR-2025',
                'title' => 'Laporan Kinerja Instansi Pemerintah (LKjIP) Dinas PUPR Kabupaten Mimika Tahun 2025',
                'type' => 'annual',
                'format' => 'pdf',
                'status' => 'completed',
                'parameters' => ['year' => 2025, 'scope' => 'opd', 'verified' => true],
                'file_path' => 'reports/lkjip_pupr_mimika_2025.pdf',
                'generated_by' => $adminOpd->id,
                'generated_at' => '2026-02-10 14:00:00',
            ],
            [
                'code' => 'LKJIP-TW2-2026',
                'title' => 'Laporan Capaian Kinerja Triwulan II Dinas PUPR Mimika Tahun Anggaran 2026',
                'type' => 'quarterly',
                'format' => 'pdf',
                'status' => 'completed',
                'parameters' => ['year' => 2026, 'quarter' => 'TW2', 'verified' => true],
                'file_path' => 'reports/lkjip_tw2_pupr_mimika_2026.pdf',
                'generated_by' => $adminOpd->id,
                'generated_at' => '2026-07-05 16:20:00',
            ],
        ];

        foreach ($reports as $rep) {
            Report::updateOrCreate(
                ['code' => $rep['code']],
                array_merge($rep, [
                    'organization_id' => $rootOpd->id,
                    'planning_period_id' => $pp2026->id,
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 4. BANK REGULASI & STANDAR OPERASIONAL (KNOWLEDGE DOCUMENTS)
        // ══════════════════════════════════════════════════════════════════════
        $knowledgeBase = [
            [
                'title' => 'Peraturan Menteri PAN-RB Nomor 88 Tahun 2021 tentang Evaluasi AKIP',
                'document_type' => 'regulation',
                'category' => 'Regulasi Nasional',
                'content' => 'Pedoman teknis pelaksanaan evaluasi akuntabilitas kinerja instansi pemerintah (AKIP) yang mencakup 5 komponen berbobot penilaian SAKIP.',
                'tags' => 'permenpan,sakip,akip,evaluasi',
                'status' => 'published',
                'access' => 'public',
                'version' => '1.0',
                'published_at' => '2021-12-30',
            ],
            [
                'title' => 'Peraturan Menteri PAN-RB Nomor 89 Tahun 2021 tentang Penjenjangan Kinerja',
                'document_type' => 'regulation',
                'category' => 'Regulasi Nasional',
                'content' => 'Tata cara penjenjangan kinerja instansi pemerintah (cascading) dari level tujuan strategis, sasaran, program prioritas, hingga kegiatan teknis.',
                'tags' => 'cascading,penjenjangan,pohon-kinerja,iku',
                'status' => 'published',
                'access' => 'public',
                'version' => '1.0',
                'published_at' => '2021-12-30',
            ],
            [
                'title' => 'Peraturan Menteri PAN-RB Nomor 22 Tahun 2024 tentang Penilaian Kinerja Organisasi',
                'document_type' => 'regulation',
                'category' => 'Regulasi Nasional',
                'content' => 'Ketentuan dan formula baku perhitungan Nilai Kinerja Organisasi (NKO), normalisasi capaian target, dan penetapan predikat ISTIMEWA.',
                'tags' => 'pko,nko,predikat,kinerja-organisasi',
                'status' => 'published',
                'access' => 'public',
                'version' => '1.0',
                'published_at' => '2024-05-15',
            ],
            [
                'title' => 'Peraturan Daerah Kabupaten Mimika No. 15 Tahun 2021 tentang RTRW Mimika',
                'document_type' => 'regulation',
                'category' => 'Regulasi Daerah',
                'content' => 'Rencana Tata Ruang Wilayah Kabupaten Mimika Tahun 2021-2041 sebagai acuan penetapan zonasi infrastruktur dan pemanfaatan ruang.',
                'tags' => 'perda,rtrw,mimika,tata-ruang',
                'status' => 'published',
                'access' => 'public',
                'version' => '1.0',
                'published_at' => '2021-11-20',
            ],
            [
                'title' => 'SOP Pengukuran Kinerja dan Verifikasi Bukti Dukung (Evidence) Digital',
                'document_type' => 'sop',
                'category' => 'SOP Internal',
                'content' => 'Standar operasional prosedur penginputan realisasi, mekanisme persetujuan berjenjang (maker-checker), dan kriteria sah dokumen evidence.',
                'tags' => 'sop,evidence,verifikasi,maker-checker',
                'status' => 'published',
                'access' => 'internal',
                'version' => '2.0',
                'published_at' => '2026-01-10',
            ],
        ];

        foreach ($knowledgeBase as $kb) {
            KnowledgeDocument::updateOrCreate(
                ['title' => $kb['title']],
                array_merge($kb, [
                    'published_by' => $superAdmin->id,
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 5. NOTIFIKASI SISTEM (APP NOTIFICATIONS)
        // ══════════════════════════════════════════════════════════════════════
        $notifications = [
            [
                'user_id' => $kadis->id,
                'event' => 'realization_approved',
                'channel' => 'system',
                'title' => 'Verifikasi Realisasi Selesai',
                'message' => 'Laporan realisasi IKU Triwulan II Tahun 2026 telah diverifikasi lengkap oleh seluruh Kepala Bidang.',
                'resource_type' => 'realization',
                'resource_id' => 1,
                'delivery_status' => 'delivered',
            ],
            [
                'user_id' => $kadis->id,
                'event' => 'evaluation_published',
                'channel' => 'system',
                'title' => 'Lembar Hasil Evaluasi (LHE) SAKIP Diterbitkan',
                'message' => 'Inspektorat Kabupaten Mimika menerbitkan predikat Kinerja Sangat Memuaskan (A) dengan nilai 84.80.',
                'resource_type' => 'evaluation',
                'resource_id' => 1,
                'delivery_status' => 'delivered',
            ],
            [
                'user_id' => $adminOpd->id,
                'event' => 'alert_triggered',
                'channel' => 'system',
                'title' => 'Peringatan Dini (EWS) Kinerja Fisik',
                'message' => 'Terdeteksi deviasi capaian fisik pada sub-kegiatan peningkatan jalan poros distrik sebesar 6.0%.',
                'resource_type' => 'alert',
                'resource_id' => 1,
                'delivery_status' => 'delivered',
            ],
            [
                'user_id' => $kabidBM->id,
                'event' => 'agreement_locked',
                'channel' => 'system',
                'title' => 'Pengesahan Perjanjian Kinerja 2026',
                'message' => 'Dokumen Perjanjian Kinerja Bidang Bina Marga Tahun 2026 telah disahkan oleh Kepala Dinas PUPR.',
                'resource_type' => 'agreement',
                'resource_id' => 1,
                'delivery_status' => 'delivered',
            ],
        ];

        foreach ($notifications as $notif) {
            AppNotification::updateOrCreate(
                [
                    'user_id' => $notif['user_id'],
                    'title' => $notif['title'],
                ],
                array_merge($notif, [
                    'metadata' => ['system' => 'e-SAKIP PUPR Mimika'],
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 6. JEJAK AUDIT KINERJA (AUDIT LOGS)
        // ══════════════════════════════════════════════════════════════════════
        $auditLogs = [
            [
                'actor_id' => $kadis->id,
                'actor_type' => User::class,
                'action' => 'approve',
                'resource_type' => 'planning_document',
                'resource_id' => 1,
                'organization_id' => $rootOpd->id,
                'diff' => ['status' => ['before' => 'submitted', 'after' => 'approved']],
                'reason' => 'Pengesahan resmi Dokumen Renstra PUPR Mimika 2024-2026',
                'request_id' => 'REQ-'.uniqid(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'created_at' => now()->subDays(60),
            ],
            [
                'actor_id' => $adminOpd->id,
                'actor_type' => User::class,
                'action' => 'submit',
                'resource_type' => 'realization',
                'resource_id' => 1,
                'organization_id' => $rootOpd->id,
                'diff' => ['status' => ['before' => 'draft', 'after' => 'submitted']],
                'reason' => 'Pengajuan realisasi kinerja fisik Triwulan II beserta lampiran BAP',
                'request_id' => 'REQ-'.uniqid(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'created_at' => now()->subDays(15),
            ],
            [
                'actor_id' => $kadis->id,
                'actor_type' => User::class,
                'action' => 'verify',
                'resource_type' => 'pko_evaluation',
                'resource_id' => 1,
                'organization_id' => $rootOpd->id,
                'diff' => ['status' => ['before' => 'draft', 'after' => 'final'], 'predikat' => 'ISTIMEWA'],
                'reason' => 'Verifikasi lembar perhitungan Penilaian Kinerja Organisasi Tahun 2025',
                'request_id' => 'REQ-'.uniqid(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'created_at' => now()->subDays(5),
            ],
        ];

        foreach ($auditLogs as $log) {
            AuditLog::create($log);
        }
    }
}
