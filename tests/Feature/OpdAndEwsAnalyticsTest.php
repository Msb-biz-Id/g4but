<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\EarlyWarningAnalyticsService;
use App\Services\OpdAnalyticsService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpdAndEwsAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private OpdAnalyticsService $opdService;

    private EarlyWarningAnalyticsService $ewsService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->opdService = app(OpdAnalyticsService::class);
        $this->ewsService = app(EarlyWarningAnalyticsService::class);
    }

    public function test_opd_service_polarity_and_capaian_calculation(): void
    {
        // Pola positif: (Realisasi / Target) * 100%
        $this->assertEquals(105.0, $this->opdService->calculateCapaian(105.0, 100.0, 'positif'));
        $this->assertEquals(90.0, $this->opdService->calculateCapaian(90.0, 100.0, 'positif'));

        // Pola negatif: (2 - (Realisasi / Target)) * 100%
        // Target 10, Realisasi 12 -> (2 - 1.2) * 100 = 80.0%
        $this->assertEquals(80.0, $this->opdService->calculateCapaian(12.0, 10.0, 'negatif'));
        // Target 10, Realisasi 8 -> (2 - 0.8) * 100 = 120.0%
        $this->assertEquals(120.0, $this->opdService->calculateCapaian(8.0, 10.0, 'negatif'));

        // Edge case: null
        $this->assertNull($this->opdService->calculateCapaian(null, 100.0));
        $this->assertNull($this->opdService->calculateCapaian(100.0, null));
    }

    public function test_negative_value_strictly_yields_predikat_sangat_kurang(): void
    {
        // Strict Rule: "Ketika Nilainya Minus maka masuk PREDIKAT: SANGAT KURANG"
        $status = $this->opdService->getStatusCapaian(-12.5);
        $this->assertEquals('Kritis', $status['status']);
        $this->assertEquals('SANGAT KURANG', $status['predikat']);
        $this->assertEquals('danger', $status['badge']);

        $statusSmall = $this->opdService->getStatusCapaian(-0.05);
        $this->assertEquals('Kritis', $statusSmall['status']);
        $this->assertEquals('SANGAT KURANG', $statusSmall['predikat']);
    }

    public function test_status_capaian_thresholds(): void
    {
        $s100 = $this->opdService->getStatusCapaian(102.5);
        $this->assertEquals('Tercapai', $s100['status']);
        $this->assertEquals('SANGAT BAIK', $s100['predikat']);

        $sExact100 = $this->opdService->getStatusCapaian(100.0);
        $this->assertEquals('Tercapai', $sExact100['status']);
        $this->assertEquals('SANGAT BAIK', $sExact100['predikat']);

        $s90 = $this->opdService->getStatusCapaian(92.0);
        $this->assertEquals('Perlu Perhatian', $s90['status']);
        $this->assertEquals('CUKUP', $s90['predikat']);

        $s70 = $this->opdService->getStatusCapaian(75.0);
        $this->assertEquals('Perlu Perhatian', $s70['status']);
        $this->assertEquals('CUKUP', $s70['predikat']);

        $s50 = $this->opdService->getStatusCapaian(55.0);
        $this->assertEquals('Perlu Perhatian', $s50['status']);
        $this->assertEquals('CUKUP', $s50['predikat']);

        $sCritical = $this->opdService->getStatusCapaian(45.0);
        $this->assertEquals('Kritis', $sCritical['status']);
        $this->assertEquals('SANGAT KURANG', $sCritical['predikat']);

        $sZero = $this->opdService->getStatusCapaian(null, 0.0, 0.0);
        $this->assertEquals('Tidak Dinilai', $sZero['status']);
    }

    public function test_iku_pemda_matrix_structure(): void
    {
        $this->seed(DatabaseSeeder::class);
        $matrix = $this->opdService->getIkuPemdaMatrix(2026);

        $this->assertArrayHasKey('summary', $matrix);
        $this->assertArrayHasKey('rows', $matrix);
        $this->assertArrayHasKey('trend', $matrix);

        $this->assertArrayHasKey('total_iku', $matrix['summary']);
        $this->assertArrayHasKey('tercapai', $matrix['summary']);
        $this->assertArrayHasKey('perlu_perhatian', $matrix['summary']);
        $this->assertArrayHasKey('kritis', $matrix['summary']);
        $this->assertArrayHasKey('rata_capaian', $matrix['summary']);

        $this->assertIsArray($matrix['rows']);
        if (! empty($matrix['rows'])) {
            $first = $matrix['rows'][0];
            $this->assertArrayHasKey('indikator', $first);
            $this->assertArrayHasKey('target', $first);
            $this->assertArrayHasKey('realisasi', $first);
            $this->assertArrayHasKey('capaian', $first);
            $this->assertArrayHasKey('status', $first);
            $this->assertArrayHasKey('predikat', $first);
            $this->assertArrayHasKey('opd_pengampu', $first);
            $this->assertArrayHasKey('tren', $first);
        }
    }

    public function test_opd_performance_ranking_and_drilldown_structure(): void
    {
        $this->seed(DatabaseSeeder::class);
        $result = $this->opdService->getOpdPerformanceRanking(2026);

        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('rows', $result);
        $this->assertArrayHasKey('trend', $result);

        $this->assertArrayHasKey('total_opd', $result['summary']);
        $this->assertArrayHasKey('rata_capaian', $result['summary']);
        $this->assertArrayHasKey('tercapai', $result['summary']);
        $this->assertArrayHasKey('perlu_perhatian', $result['summary']);
        $this->assertArrayHasKey('kritis', $result['summary']);

        $this->assertIsArray($result['rows']);
        if (! empty($result['rows'])) {
            $firstOpd = $result['rows'][0];
            $this->assertArrayHasKey('id', $firstOpd);
            $this->assertArrayHasKey('perangkat_daerah', $firstOpd);
            $this->assertArrayHasKey('rank', $firstOpd);
            $this->assertArrayHasKey('rata_capaian', $firstOpd);
            $this->assertArrayHasKey('status', $firstOpd);
            $this->assertArrayHasKey('predikat', $firstOpd);
            $this->assertArrayHasKey('drilldown', $firstOpd);

            // Periksa drilldown hierarki: OPD -> Indikator & Cascading Programs
            $drilldown = $firstOpd['drilldown'];
            $this->assertArrayHasKey('opd', $drilldown);
            $this->assertArrayHasKey('indikator', $drilldown);
            $this->assertArrayHasKey('programs', $drilldown);
        }
    }

    public function test_sakip_evaluation_matrix_4_components(): void
    {
        $this->seed(DatabaseSeeder::class);
        $eval = $this->opdService->getSakipEvaluationMatrix(2026);

        $this->assertArrayHasKey('summary', $eval);
        $this->assertArrayHasKey('rows', $eval);
        $this->assertArrayHasKey('trend', $eval);
        $this->assertArrayHasKey('years', $eval);
        $this->assertArrayHasKey('pemda', $eval);
        $this->assertEquals([2025, 2026, 2027, 2028, 2029], $eval['years']);

        $this->assertArrayHasKey('opd_dievaluasi', $eval['summary']);
        $this->assertArrayHasKey('rata_rata_nilai', $eval['summary']);
        $this->assertArrayHasKey('predikat_A', $eval['summary']);
        $this->assertArrayHasKey('predikat_BB', $eval['summary']);

        $this->assertIsArray($eval['rows']);
        if (! empty($eval['rows'])) {
            $row = $eval['rows'][0];
            $this->assertArrayHasKey('perencanaan', $row);
            $this->assertArrayHasKey('pengukuran', $row);
            $this->assertArrayHasKey('pelaporan', $row);
            $this->assertArrayHasKey('evaluasi_internal', $row);
            $this->assertArrayHasKey('nilai', $row);
            $this->assertArrayHasKey('predikat', $row);
            $this->assertArrayHasKey('yearly', $row);
            $this->assertArrayHasKey('tren', $row);
            $this->assertArrayHasKey(2025, $row['yearly']);
            $this->assertArrayHasKey(2026, $row['yearly']);
            $this->assertArrayHasKey(2029, $row['yearly']);
            $this->assertArrayHasKey('lhe', $row);
            $this->assertArrayHasKey('nomor_lhe', $row['lhe']);
            $this->assertArrayHasKey('rekomendasi', $row['lhe']);
        }

        // Test filter predikat BAIK / A (7-tier scale)
        $filterBaik = $this->opdService->getSakipEvaluationMatrix(2026, null, 'BAIK');
        foreach ($filterBaik['rows'] as $rB) {
            $this->assertTrue(in_array($rB['predikat'], ['A', 'BAIK']));
        }
    }

    public function test_pko_matrix_pemda_and_opd(): void
    {
        $this->seed(DatabaseSeeder::class);
        $pko = $this->opdService->getPkoMatrix(2026);

        $this->assertArrayHasKey('pemda_pko', $pko);
        $this->assertArrayHasKey('opd_pko', $pko);

        // PKO Pemda
        $this->assertArrayHasKey('nilai', $pko['pemda_pko']);
        $this->assertArrayHasKey('predikat', $pko['pemda_pko']);
        $this->assertArrayHasKey('trend', $pko['pemda_pko']);

        // PKO OPD
        $this->assertArrayHasKey('total_opd', $pko['opd_pko']);
        $this->assertArrayHasKey('rows', $pko['opd_pko']);
        $this->assertArrayHasKey('top_10', $pko['opd_pko']);
        $this->assertArrayHasKey('attention_10', $pko['opd_pko']);

        if (! empty($pko['opd_pko']['rows'])) {
            $first = $pko['opd_pko']['rows'][0];
            $this->assertArrayHasKey('nilai_pko', $first);
            $this->assertArrayHasKey('predikat', $first);
            $this->assertArrayHasKey('koreksi_akip', $first);
        }
    }

    public function test_action_plans_matrix_and_quarters(): void
    {
        $this->seed(DatabaseSeeder::class);
        $ap = $this->opdService->getActionPlansMatrix(2026, 'all');

        $this->assertArrayHasKey('summary', $ap);
        $this->assertArrayHasKey('rows', $ap);
        $this->assertArrayHasKey('opd_rows', $ap);
        $this->assertArrayHasKey('trend', $ap);

        $this->assertArrayHasKey('total_renaksi', $ap['summary']);
        $this->assertArrayHasKey('tercapai', $ap['summary']);
        $this->assertArrayHasKey('perlu_perhatian', $ap['summary']);
        $this->assertArrayHasKey('terlambat', $ap['summary']);

        $this->assertNotEmpty($ap['opd_rows']);
        $sampleOpd = $ap['opd_rows'][0];
        $this->assertArrayHasKey('opd', $sampleOpd);
        $this->assertArrayHasKey('target_tw', $sampleOpd);
        $this->assertArrayHasKey('realisasi_tw', $sampleOpd);
        $this->assertArrayHasKey('capaian', $sampleOpd);
        $this->assertArrayHasKey('status', $sampleOpd);

        $this->assertIsArray($ap['trend']);
        $this->assertCount(4, $ap['trend']); // TW I - TW IV
    }

    public function test_early_warning_system_risk_map(): void
    {
        $this->seed(DatabaseSeeder::class);
        $risk = $this->ewsService->getRiskMap(2026);

        $this->assertArrayHasKey('summary', $risk);
        $this->assertArrayHasKey('rows', $risk);

        $this->assertArrayHasKey('total_opd', $risk['summary']);
        $this->assertArrayHasKey('risiko_tinggi', $risk['summary']);
        $this->assertArrayHasKey('risiko_sedang', $risk['summary']);
        $this->assertArrayHasKey('risiko_rendah', $risk['summary']);
        $this->assertArrayHasKey('critical_iku_count', $risk['summary']);
        $this->assertArrayHasKey('late_renaksi_count', $risk['summary']);

        $this->assertIsArray($risk['rows']);
        if (! empty($risk['rows'])) {
            $first = $risk['rows'][0];
            $this->assertArrayHasKey('risk_score', $first);
            $this->assertArrayHasKey('risk_level', $first);
            $this->assertArrayHasKey('risk_factors', $first);
            $this->assertArrayHasKey('rekomendasi', $first);
        }
    }

    public function test_analytics_controller_renders_all_matrices(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'admin@ekasuari.test')->firstOrFail();

        $response = $this->actingAs($user)->get(route('analytics.index', ['year' => 2026]));
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => $page
            ->component('Analytics/Index')
            ->has('iku_pemda_matrix')
            ->has('opd_ranking_matrix')
            ->has('sakip_pemda_matrix')
            ->has('sakip_eval_matrix')
            ->has('pko_matrix')
            ->has('action_plans_matrix')
            ->has('risk_map_matrix')
            ->has('sakip_docs')
            ->has('rpjmd_analysis')
        );
    }

    public function test_sakip_pemda_matrix_from_evaluation_module(): void
    {
        $this->seed(DatabaseSeeder::class);
        $pemda = $this->opdService->getSakipPemdaMatrix(2026);

        $this->assertArrayHasKey('nilai', $pemda);
        $this->assertArrayHasKey('predikat', $pemda);
        $this->assertArrayHasKey('perencanaan', $pemda);
        $this->assertArrayHasKey('pengukuran', $pemda);
        $this->assertArrayHasKey('pelaporan', $pemda);
        $this->assertArrayHasKey('evaluasi_internal', $pemda);
        $this->assertArrayHasKey('komponen', $pemda);
        $this->assertArrayHasKey('trend', $pemda);
        $this->assertArrayHasKey('lhe', $pemda);

        $this->assertCount(4, $pemda['komponen']);
        $this->assertEquals(2026, $pemda['tahun']);
        $this->assertGreaterThan(0, $pemda['nilai']);

        // Check LHE
        $this->assertArrayHasKey('nomor_lhe', $pemda['lhe']);
        $this->assertArrayHasKey('catatan', $pemda['lhe']);
        $this->assertArrayHasKey('rekomendasi', $pemda['lhe']);
    }

    public function test_analytics_csv_exports_for_all_matrix_types(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'admin@ekasuari.test')->firstOrFail();

        $types = ['iku_pemda', 'opd_ranking', 'sakip_pemda', 'sakip_eval', 'pko_opd', 'pko_pemda', 'action_plans', 'risk_map'];

        foreach ($types as $type) {
            $response = $this->actingAs($user)->get(route('analytics.export', ['type' => $type, 'year' => 2026]));
            $response->assertStatus(200);
            $disposition = $response->headers->get('content-disposition') ?? '';
            $this->assertTrue(str_contains($disposition, '.csv'));
            $this->assertTrue(str_contains($disposition, '2026'));
        }
    }

    public function test_analytics_pdf_export_for_sakip_pemda(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::where('email', 'admin@ekasuari.test')->firstOrFail();

        $response = $this->actingAs($user)->get(route('analytics.export-pdf', ['type' => 'sakip_pemda', 'year' => 2026]));
        $response->assertStatus(200);
        $disposition = $response->headers->get('content-disposition') ?? '';
        $this->assertTrue(str_contains($disposition, '.pdf'));
        $this->assertTrue(str_contains($disposition, 'analitik-evaluasi-sakip-pemda'));
    }
}
