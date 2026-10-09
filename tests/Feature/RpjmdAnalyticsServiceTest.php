<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\RpjmdAnalyticsService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RpjmdAnalyticsServiceTest extends TestCase
{
    use RefreshDatabase;

    private RpjmdAnalyticsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(RpjmdAnalyticsService::class);
    }

    public function test_calculate_capaian_positif_and_negatif(): void
    {
        // Pola positif: (Realisasi / Target) * 100%
        $this->assertEquals(100.84, $this->service->calculateCapaian(72.10, 71.50, 'positif'));
        $this->assertEquals(92.94, $this->service->calculateCapaian(79.0, 85.0, 'positif'));

        // Pola negatif: (2 - (Realisasi / Target)) * 100%
        // Target 10, Realisasi 12 -> (2 - 1.2) * 100 = 80%
        $this->assertEquals(80.0, $this->service->calculateCapaian(12.0, 10.0, 'negatif'));

        // Pola negatif: Target 10, Realisasi 8 -> (2 - 0.8) * 100 = 120%
        $this->assertEquals(120.0, $this->service->calculateCapaian(8.0, 10.0, 'negatif'));

        // Edge case: null
        $this->assertNull($this->service->calculateCapaian(null, 100.0));
        $this->assertNull($this->service->calculateCapaian(100.0, null));
    }

    public function test_negative_achievement_yields_predikat_sangat_kurang(): void
    {
        // USER REQUIREMENT: "Ketika Nilainya Minus maka masuk PREDIKAT: SANGAT KURANG"
        $status = $this->service->getStatusCapaian(-5.5);
        $this->assertEquals('Kritis', $status['status']);
        $this->assertEquals('SANGAT KURANG', $status['predikat']);
        $this->assertEquals('danger', $status['badge']);

        $statusZeroMinus = $this->service->getStatusCapaian(-0.01);
        $this->assertEquals('Kritis', $statusZeroMinus['status']);
        $this->assertEquals('SANGAT KURANG', $statusZeroMinus['predikat']);
    }

    public function test_status_capaian_thresholds(): void
    {
        // >= 100 => Tercapai (MEMUASKAN)
        $s1 = $this->service->getStatusCapaian(100.0);
        $this->assertEquals('Tercapai', $s1['status']);
        $this->assertEquals('MEMUASKAN', $s1['predikat']);

        // 80..100 => Perlu Perhatian (BAIK)
        $s2 = $this->service->getStatusCapaian(92.94);
        $this->assertEquals('Perlu Perhatian', $s2['status']);
        $this->assertEquals('BAIK', $s2['predikat']);

        // 50..100 => Perlu Perhatian (BAIK)
        $s3 = $this->service->getStatusCapaian(65.0);
        $this->assertEquals('Perlu Perhatian', $s3['status']);
        $this->assertEquals('BAIK', $s3['predikat']);

        // < 50 => Kritis (KURANG)
        $s4 = $this->service->getStatusCapaian(45.0);
        $this->assertEquals('Kritis', $s4['status']);
        $this->assertEquals('KURANG', $s4['predikat']);

        // Null / 0/0 => Tidak Dinilai
        $s5 = $this->service->getStatusCapaian(null);
        $this->assertEquals('Tidak Dinilai', $s5['status']);
    }

    public function test_get_rpjmd_matrix_with_seeded_data(): void
    {
        $this->seed(DatabaseSeeder::class);

        $matrix = $this->service->getRpjmdMatrix(2026);

        $this->assertArrayHasKey('summary', $matrix);
        $this->assertArrayHasKey('trend', $matrix);
        $this->assertArrayHasKey('rows', $matrix);
        $this->assertArrayHasKey('years', $matrix);

        // Validasi 5 Kartu Utama
        $summary = $matrix['summary'];
        $this->assertEquals(18, $summary['total_sasaran'], 'Total Sasaran RPJMD harus 18');
        $this->assertEquals(35, $summary['total_indikator'], 'Total Indikator RPJMD harus 35');
        $this->assertEquals(21, $summary['tercapai'], 'Indikator tercapai harus 21');
        $this->assertEquals(14, $summary['perlu_perhatian'], 'Indikator perlu perhatian harus 14');
        $this->assertGreaterThan(90.0, $summary['rata_capaian']);

        // Validasi 5 Tahun deret tren (2025 -> 2029)
        $this->assertCount(5, $matrix['trend']);
        $trendYears = array_column($matrix['trend'], 'tahun');
        $this->assertEquals([2025, 2026, 2027, 2028, 2029], $trendYears);

        // Validasi struktur setiap baris matriks
        $this->assertCount(35, $matrix['rows']);
        $firstRow = $matrix['rows'][0];
        $this->assertArrayHasKey('no', $firstRow);
        $this->assertArrayHasKey('tujuan', $firstRow);
        $this->assertArrayHasKey('sasaran', $firstRow);
        $this->assertArrayHasKey('indikator', $firstRow);
        $this->assertArrayHasKey('target', $firstRow);
        $this->assertArrayHasKey('realisasi', $firstRow);
        $this->assertArrayHasKey('capaian', $firstRow);
        $this->assertArrayHasKey('status', $firstRow);
        $this->assertArrayHasKey('predikat', $firstRow);
        $this->assertArrayHasKey('opd_pengampu', $firstRow);
        $this->assertArrayHasKey('yearly', $firstRow);
    }

    public function test_dashboard_and_analytics_endpoints_render_rpjmd_props(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'admin@papuabaratprov.go.id')->first() ?? User::first();

        // Test Dashboard
        $dashboardResponse = $this->actingAs($user)->get('/dashboard');
        $dashboardResponse->assertStatus(200);
        $dashboardResponse->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('rpjmd_matrix')
            ->where('rpjmd_matrix.summary.total_sasaran', 18)
            ->where('rpjmd_matrix.summary.total_indikator', 35)
        );

        // Test Analytics Index
        $analyticsResponse = $this->actingAs($user)->get('/analytics?tab=rpjmd');
        $analyticsResponse->assertStatus(200);
        $analyticsResponse->assertInertia(fn ($page) => $page
            ->component('Analytics/Index')
            ->has('rpjmd_analysis')
            ->where('rpjmd_analysis.summary.total_sasaran', 18)
            ->where('rpjmd_analysis.summary.total_indikator', 35)
        );
    }
}
