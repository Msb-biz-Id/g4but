<?php

namespace App\Services;

use App\Models\Organization;

class EarlyWarningAnalyticsService
{
    public function __construct(
        private readonly OpdAnalyticsService $opdAnalytics,
        private readonly SakipDocumentService $sakipDocService,
    ) {}

    /**
     * Membangun Peta Risiko & Early Warning System (EWS) Kinerja OPD (Item 6 Panduan).
     */
    public function getRiskMap(
        int $year = 2026,
        ?array $opdRankData = null,
        ?array $ikuData = null,
        ?array $renaksData = null,
        ?array $sakipData = null,
        ?array $opdDocMatrix = null
    ): array {
        $allOpd = Organization::where('type', 'opd')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        // 1. IKU Pemda Kritis
        $ikuData = $ikuData ?? $this->opdAnalytics->getIkuPemdaMatrix($year);
        $criticalIku = array_filter($ikuData['rows'], fn($r) => $r['status'] === 'Kritis' || ($r['capaian'] !== null && $r['capaian'] < 60));
        $criticalIkuCount = count($criticalIku);

        // 2. OPD Capaian Rendah (< 80%)
        $opdRankData = $opdRankData ?? $this->opdAnalytics->getOpdPerformanceRanking($year);
        $opdRankByOrg = collect($opdRankData['rows'])->keyBy('id');
        $lowCapOpd = array_filter($opdRankData['rows'], fn($r) => $r['rata_capaian'] < 80.0);
        $lowCapOpdCount = count($lowCapOpd);

        // 3. Rencana Aksi Terlambat
        $renaksData = $renaksData ?? $this->opdAnalytics->getActionPlansMatrix($year);
        $lateRenaksi = array_filter($renaksData['rows'], fn($r) => in_array($r['status'], ['Terlambat', 'Kritis']) || $r['capaian'] < 75.0);
        $lateRenaksiCount = count($lateRenaksi);
        $lateRenaksiByOrg = collect($lateRenaksi)->groupBy('organization_id');

        // 4. Dokumen SAKIP Belum Lengkap (< 100%)
        $opdDocMatrix = $opdDocMatrix ?? $this->sakipDocService->getSakipOpdMatrix($year);
        $incompleteDocsCount = $opdDocMatrix['opd_belum_lengkap'];
        $docByOrg = collect($opdDocMatrix['rows'])->keyBy('organization_id');

        // 5. Penurunan / Rendah Nilai SAKIP (< 70)
        $sakipData = $sakipData ?? $this->opdAnalytics->getSakipEvaluationMatrix($year);
        $sakipByOrg = collect($sakipData['rows'])->keyBy('organization_id');
        $lowSakipOpd = array_filter($sakipData['rows'], fn($r) => $r['nilai'] > 0 && $r['nilai'] < 70.0);
        $lowSakipCount = count($lowSakipOpd);

        $riskRows = [];
        $riskSummary = ['tinggi' => 0, 'sedang' => 0, 'rendah' => 0];

        foreach ($allOpd as $opd) {
            $perfItem  = $opdRankByOrg->get($opd->id);
            $docItem   = $docByOrg->get($opd->id);
            $sakipItem = $sakipByOrg->get($opd->id);
            $opdLateRenaks = $lateRenaksiByOrg->get($opd->id, collect());

            $riskScore = 0;
            $riskFactors = [];
            $actionRecommendations = [];

            // Faktor 1: Dokumen SAKIP
            $docPct = $docItem['percentage'] ?? 0.0;
            $missingDocs = $docItem['missing_count'] ?? 0;
            if ($docPct < 100.0) {
                $points = $docPct <= 50.0 ? 30 : 15;
                $riskScore += $points;
                $riskFactors[] = [
                    'category' => 'Dokumen SAKIP',
                    'detail'   => "Belum lengkap ({$missingDocs} dokumen belum tersedia)",
                    'severity' => $docPct <= 50.0 ? 'critical' : 'warning',
                ];
                $actionRecommendations[] = "Prioritaskan pemenuhan {$missingDocs} dokumen perencanaan/pengukuran SAKIP yang belum diunggah.";
            }

            // Faktor 2: Capaian Kinerja Rendah
            $jmlIndikator = $perfItem['jumlah_indikator'] ?? 0;
            $capaianVal = $perfItem['rata_capaian'] ?? null;
            if ($jmlIndikator > 0 && $capaianVal !== null && $capaianVal < 80.0) {
                $points = $capaianVal < 60.0 ? 35 : 20;
                $riskScore += $points;
                $riskFactors[] = [
                    'category' => 'Capaian Kinerja',
                    'detail'   => "Capaian rata-rata rendah ({$capaianVal}%)",
                    'severity' => $capaianVal < 60.0 ? 'critical' : 'warning',
                ];
                $actionRecommendations[] = "Lakukan rapat evaluasi teknis untuk mengidentifikasi kendala pada indikator berstatus terlambat/kritis.";
            }

            // Faktor 3: Rencana Aksi & Program Terlambat
            if ($opdLateRenaks->isNotEmpty()) {
                $riskScore += 20;
                $lateCount = $opdLateRenaks->count();
                $riskFactors[] = [
                    'category' => 'Program & Rencana Aksi',
                    'detail'   => "{$lateCount} rencana aksi program triwulan berpotensi tidak mencapai target",
                    'severity' => 'warning',
                ];
                $actionRecommendations[] = "Percepat realisasi fisik & eksekusi rencana aksi program triwulanan agar target tahunan tercapai.";
            }

            // Faktor 4: Nilai Evaluasi SAKIP
            $sakipVal = $sakipItem['nilai'] ?? null;
            if ($sakipVal !== null && $sakipVal > 0 && $sakipVal < 70.0) {
                $points = $sakipVal < 60.0 ? 25 : 15;
                $riskScore += $points;
                $riskFactors[] = [
                    'category' => 'Nilai SAKIP',
                    'detail'   => "Nilai evaluasi akuntabilitas rendah ({$sakipVal} - {$sakipItem['predikat']})",
                    'severity' => $sakipVal < 60.0 ? 'critical' : 'warning',
                ];
                $actionRecommendations[] = "Biro Organisasi & Inspektorat perlu memberikan pendampingan intensif penguatan 4 pilar akuntabilitas.";
            }

            if (empty($actionRecommendations)) {
                $actionRecommendations[] = "Pertahankan konsistensi kinerja dan pemantauan berkala dokumen serta target triwulanan.";
            }

            // Tentukan Level Risiko
            $level = match (true) {
                $riskScore >= 50 => 'Tinggi',
                $riskScore >= 25 => 'Sedang',
                default          => 'Rendah',
            };

            match ($level) {
                'Tinggi' => $riskSummary['tinggi']++,
                'Sedang' => $riskSummary['sedang']++,
                'Rendah' => $riskSummary['rendah']++,
            };

            $riskRows[] = [
                'organization_id'       => $opd->id,
                'kode'                  => $opd->code,
                'perangkat_daerah'      => $opd->name,
                'risk_score'            => min(100, $riskScore),
                'risk_level'            => $level,
                'rata_capaian'          => $capaianVal,
                'sakip_nilai'           => $sakipVal,
                'sakip_predikat'        => $sakipItem['predikat'] ?? 'BAIK',
                'dokumen_persen'        => $docPct,
                'risk_factors'          => $riskFactors,
                'rekomendasi'           => $actionRecommendations,
            ];
        }

        // Urutkan dari skor risiko tertinggi ke terendah
        usort($riskRows, fn($a, $b) => $b['risk_score'] <=> $a['risk_score']);
        foreach ($riskRows as $i => &$r) {
            $r['rank'] = $i + 1;
        }
        unset($r);

        return [
            'summary' => [
                'total_opd'              => count($allOpd),
                'risiko_tinggi'          => $riskSummary['tinggi'],
                'risiko_sedang'          => $riskSummary['sedang'],
                'risiko_rendah'          => $riskSummary['rendah'],
                'critical_iku_count'     => $criticalIkuCount,
                'low_cap_opd_count'      => $lowCapOpdCount,
                'late_renaksi_count'     => $lateRenaksiCount,
                'incomplete_docs_count'  => $incompleteDocsCount,
                'low_sakip_count'        => $lowSakipCount,
            ],
            'rows' => $riskRows,
        ];
    }
}
