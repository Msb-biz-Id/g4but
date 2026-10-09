<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\PlanningDocument;
use App\Services\SakipDocumentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SakipDocumentServiceTest extends TestCase
{
    use RefreshDatabase;

    private SakipDocumentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(SakipDocumentService::class);

        Organization::create([
            'code' => 'PROV-PAPBAR',
            'name' => 'Pemerintah Provinsi Papua Barat',
            'type' => 'province',
            'is_active' => true,
        ]);

        Organization::create([
            'code' => 'BAPPEDA-PB',
            'name' => 'Badan Perencanaan Pembangunan Daerah',
            'type' => 'opd',
            'is_active' => true,
        ]);
    }

    public function test_canonical_pemda_definitions_has_13_documents(): void
    {
        $defs = $this->service->getCanonicalPemdaDefinitions();
        $this->assertCount(13, $defs);

        $keys = array_column($defs, 'type');
        $this->assertContains('rpjmd', $keys);
        $this->assertContains('pohon_kinerja', $keys);
        $this->assertContains('sop', $keys);
        $this->assertContains('crosscutting', $keys);
        $this->assertContains('cascading', $keys);
        $this->assertContains('iku', $keys);
        $this->assertContains('rkpd', $keys);
        $this->assertContains('dpa', $keys);
        $this->assertContains('pk', $keys);
        $this->assertContains('monev', $keys);
        $this->assertContains('renaksi', $keys);
        $this->assertContains('pedoman_teknis', $keys);
        $this->assertContains('lkjip', $keys);
    }

    public function test_canonical_opd_definitions_has_12_documents(): void
    {
        $defs = $this->service->getCanonicalOpdDefinitions();
        $this->assertCount(12, $defs);

        $keys = array_column($defs, 'key');
        $expected = [
            'renstra', 'pohon_kinerja', 'sop', 'crosscutting', 'cascading',
            'iku', 'renja', 'dpa', 'pk', 'monev', 'renaksi', 'lkjip'
        ];
        $this->assertEquals($expected, $keys);
    }

    public function test_pemda_sakip_matrix_computation(): void
    {
        $matrix = $this->service->getSakipPemdaMatrix(2026);

        $this->assertEquals(13, $matrix['total_required']);
        $this->assertIsInt($matrix['available']);
        $this->assertIsInt($matrix['missing']);
        $this->assertEquals($matrix['total_required'], $matrix['available'] + $matrix['missing']);
        $this->assertCount(13, $matrix['rows']);
        $this->assertContains($matrix['status'], ['Lengkap', 'Belum Lengkap', 'Belum Tersedia']);
    }

    public function test_opd_sakip_matrix_computation_and_formula(): void
    {
        $matrix = $this->service->getSakipOpdMatrix(2026);

        $this->assertGreaterThan(0, $matrix['total_opd']);
        $this->assertIsInt($matrix['opd_lengkap']);
        $this->assertIsInt($matrix['opd_belum_lengkap']);
        $this->assertEquals($matrix['total_opd'], $matrix['opd_lengkap'] + $matrix['opd_belum_lengkap']);

        $expectedPct = round(($matrix['opd_lengkap'] / $matrix['total_opd']) * 100, 2);
        $this->assertEquals($expectedPct, $matrix['pct_lengkap']);

        $this->assertCount(12, $matrix['columns']);
        $this->assertCount($matrix['total_opd'], $matrix['rows']);

        foreach ($matrix['rows'] as $row) {
            $this->assertEquals(12, $row['total_required']);
            $this->assertCount(12, $row['checks']);
            $this->assertEquals($row['total_required'], $row['available_count'] + $row['missing_count']);
            $this->assertContains($row['status'], ['Lengkap', 'Belum Lengkap', 'Belum Tersedia']);
        }
    }
}
