<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\RealizationRpjmdItem;
use App\Models\Role;
use App\Models\User;
use App\Services\RpjmdAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealizationRpjmdHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($superAdminRole);
    }

    public function test_can_create_one_goal_with_multiple_objectives(): void
    {
        $payload = [
            'mode' => 'both',
            'mission' => 'Misi 1: Mewujudkan SDM Berkualitas',
            'goal' => 'Tujuan 1: Meningkatkan Akses Pendidikan',
            'goal_indicator' => 'Indeks Pendidikan',
            'goal_indicator_unit' => 'Poin',
            'goal_measurement_pattern' => 'Positif',
            'goal_targets' => [2026 => 80],
            'goal_realizations' => [2026 => 82],
            'objectives' => [
                [
                    'order_no' => 1,
                    'objective' => 'Sasaran 1.1: Pemerataan Guru',
                    'objective_indicator' => 'Rasio Guru Siswa',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 90],
                    'realizations' => [2026 => 95],
                ],
                [
                    'order_no' => 2,
                    'objective' => 'Sasaran 1.2: Beasiswa Daerah',
                    'objective_indicator' => 'Jumlah Penerima Beasiswa',
                    'unit' => 'Orang',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 500],
                    'realizations' => [2026 => 520],
                ],
            ],
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('measurement.realization.rpjmd.store'), $payload);

        $response->assertRedirect();

        // Verify Goal is created
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan 1: Meningkatkan Akses Pendidikan',
        ]);

        $goal = RealizationRpjmdItem::where('level', 'goal')->first();
        $this->assertNotNull($goal);

        // Verify child objectives are created with parent_id
        $this->assertEquals(2, $goal->children()->count());
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'objective' => 'Sasaran 1.1: Pemerataan Guru',
        ]);
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 2,
            'objective' => 'Sasaran 1.2: Beasiswa Daerah',
        ]);
    }

    public function test_can_quick_add_objective_to_existing_goal(): void
    {
        $goal = RealizationRpjmdItem::create([
            'level' => 'goal',
            'parent_id' => null,
            'order_no' => 0,
            'mission' => 'Misi Utama',
            'goal' => 'Tujuan Utama',
            'goal_indicator' => 'Indikator Utama',
            'created_by' => $this->superAdmin->id,
        ]);

        $payload = [
            'mode' => 'objective',
            'parent_id' => $goal->id,
            'objective' => 'Sasaran Tambahan',
            'objective_indicator' => 'Indikator Tambahan',
            'unit' => 'Dokumen',
            'measurement_pattern' => 'Positif',
            'targets' => [2026 => 10],
            'realizations' => [2026 => 10],
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('measurement.realization.rpjmd.store'), $payload);

        $response->assertRedirect();

        $this->assertEquals(1, $goal->children()->count());
        $child = $goal->children()->first();
        $this->assertEquals('Sasaran Tambahan', $child->objective);
        $this->assertEquals('Tujuan Utama', $child->goal);
        $this->assertEquals(1, $child->order_no);
    }

    public function test_deleting_goal_cascades_to_child_objectives(): void
    {
        $goal = RealizationRpjmdItem::create([
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan Akan Dihapus',
            'created_by' => $this->superAdmin->id,
        ]);

        $child = RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $goal->id,
            'goal' => $goal->goal,
            'objective' => 'Sub Sasaran Anak',
            'objective_indicator' => 'Indikator Anak',
            'created_by' => $this->superAdmin->id,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->delete(route('measurement.realization.rpjmd.destroy', $goal->id));

        $response->assertRedirect();

        $this->assertDatabaseMissing('realization_rpjmd_items', ['id' => $goal->id]);
        $this->assertDatabaseMissing('realization_rpjmd_items', ['id' => $child->id]);
    }

    public function test_updating_goal_propagates_to_child_objectives(): void
    {
        $goal = RealizationRpjmdItem::create([
            'level' => 'goal',
            'parent_id' => null,
            'mission' => 'Misi Lama',
            'goal' => 'Tujuan Lama',
            'goal_indicator' => 'Indikator Lama',
            'created_by' => $this->superAdmin->id,
        ]);

        $child = RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $goal->id,
            'mission' => 'Misi Lama',
            'goal' => 'Tujuan Lama',
            'objective' => 'Sasaran Anak',
            'objective_indicator' => 'Indikator Sasaran',
            'created_by' => $this->superAdmin->id,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->put(route('measurement.realization.rpjmd.update', $goal->id), [
                'mission' => 'Misi Baru Direvisi',
                'goal' => 'Tujuan Baru Direvisi',
                'goal_indicator' => 'Indikator Baru Direvisi',
            ]);

        $response->assertRedirect();

        $child->refresh();
        $this->assertEquals('Misi Baru Direvisi', $child->mission);
        $this->assertEquals('Tujuan Baru Direvisi', $child->goal);
    }

    public function test_analytics_matrix_produces_hierarchical_numbering(): void
    {
        $goal = RealizationRpjmdItem::create([
            'level' => 'goal',
            'parent_id' => null,
            'mission' => 'Misi 1',
            'goal' => 'Tujuan Pertama',
            'goal_indicator' => 'Indikator Tujuan 1',
            'created_by' => $this->superAdmin->id,
        ]);

        RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'mission' => 'Misi 1',
            'goal' => $goal->goal,
            'objective' => 'Sasaran 1.1',
            'objective_indicator' => 'Indikator Sasaran 1.1',
            'created_by' => $this->superAdmin->id,
        ]);

        RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 2,
            'mission' => 'Misi 1',
            'goal' => $goal->goal,
            'objective' => 'Sasaran 1.2',
            'objective_indicator' => 'Indikator Sasaran 1.2',
            'created_by' => $this->superAdmin->id,
        ]);

        $service = app(RpjmdAnalyticsService::class);
        $matrix = $service->getRpjmdMatrix(2026);

        $this->assertNotEmpty($matrix['rows']);
        $this->assertEquals(1, $matrix['rows'][0]['no']);
        $this->assertEquals('(1.1)', $matrix['rows'][0]['number_code']);
        $this->assertEquals(2, $matrix['rows'][1]['no']);
        $this->assertEquals('(1.2)', $matrix['rows'][1]['number_code']);
        $this->assertEquals(1, $matrix['summary']['total_tujuan']);
        $this->assertEquals(2, $matrix['summary']['total_sasaran']);
    }

    public function test_can_update_mission_name_across_all_items(): void
    {
        $goal = RealizationRpjmdItem::create([
            'level' => 'goal',
            'parent_id' => null,
            'mission' => 'Misi Asal',
            'goal' => 'Tujuan Asal',
            'created_by' => $this->superAdmin->id,
        ]);

        $child = RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $goal->id,
            'mission' => 'Misi Asal',
            'goal' => 'Tujuan Asal',
            'objective' => 'Sasaran Asal',
            'created_by' => $this->superAdmin->id,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('measurement.realization.rpjmd.update-mission'), [
                'old_mission' => 'Misi Asal',
                'new_mission' => 'Misi Terbarukan',
            ]);

        $response->assertRedirect();

        $goal->refresh();
        $child->refresh();

        $this->assertEquals('Misi Terbarukan', $goal->mission);
        $this->assertEquals('Misi Terbarukan', $child->mission);
    }

    public function test_can_create_and_manage_multi_indicators_on_goal_and_objectives(): void
    {
        $payload = [
            'mode' => 'both',
            'mission' => 'Misi 2: Perekonomian Inklusif',
            'goal' => 'Tujuan 2: Pertumbuhan Ekonomi Daerah',
            'goal_indicators' => [
                [
                    'indicator' => 'Laju Pertumbuhan Ekonomi',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 5.5],
                    'realizations' => [2026 => 5.8],
                ],
                [
                    'indicator' => 'Tingkat Pengangguran Terbuka',
                    'unit' => '%',
                    'measurement_pattern' => 'Negatif',
                    'targets' => [2026 => 6.0],
                    'realizations' => [2026 => 5.5],
                ],
            ],
            'objectives' => [
                [
                    'order_no' => 1,
                    'objective' => 'Sasaran 2.1: Pengembangan Sektor Unggulan',
                    'indicators' => [
                        [
                            'indicator' => 'Kontribusi Sektor Pertanian',
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => [2026 => 25],
                            'realizations' => [2026 => 26],
                        ],
                        [
                            'indicator' => 'Kontribusi Sektor Pariwisata',
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => [2026 => 15],
                            'realizations' => [2026 => 16],
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('measurement.realization.rpjmd.store'), $payload);

        $response->assertRedirect();

        $goal = RealizationRpjmdItem::where('goal', 'Tujuan 2: Pertumbuhan Ekonomi Daerah')->first();
        $this->assertNotNull($goal);
        $this->assertCount(2, $goal->goal_indicators_list);
        $this->assertEquals('Laju Pertumbuhan Ekonomi', $goal->goal_indicator);

        $child = RealizationRpjmdItem::where('parent_id', $goal->id)->first();
        $this->assertNotNull($child);
        $this->assertCount(2, $child->objective_indicators_list);
        $this->assertEquals('Kontribusi Sektor Pertanian', $child->objective_indicator);

        // Check Analytics Matrix
        $service = app(RpjmdAnalyticsService::class);
        $matrix = $service->getRpjmdMatrix(2026);

        // Rows should unpack both indicators
        $this->assertGreaterThanOrEqual(2, count($matrix['rows']));
        $this->assertGreaterThanOrEqual(1, $matrix['summary']['total_sasaran']);
        $this->assertGreaterThanOrEqual(2, $matrix['summary']['total_indikator']);
    }

    public function test_rpjmd_pdf_export_renders_successfully(): void
    {
        $payload = [
            'mode' => 'both',
            'mission' => 'Misi PDF Test',
            'goal' => 'Tujuan PDF Test',
            'goal_indicators' => [
                [
                    'indicator' => 'Indikator Tujuan 1',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => ['2026' => 80],
                    'realizations' => ['2026' => 85],
                ],
                [
                    'indicator' => 'Indikator Tujuan 2',
                    'unit' => 'Indeks',
                    'measurement_pattern' => 'Positif',
                    'targets' => ['2026' => 3.5],
                    'realizations' => ['2026' => 3.7],
                ],
            ],
            'objectives' => [
                [
                    'order_no' => 1,
                    'objective' => 'Sasaran PDF 1',
                    'indicators' => [
                        [
                            'indicator' => 'Indikator Sasaran 1.1',
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => ['2026' => 90],
                            'realizations' => ['2026' => 95],
                        ],
                    ],
                ],
            ],
        ];

        $this->actingAs($this->superAdmin)
            ->post(route('measurement.realization.rpjmd.store'), $payload);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('measurement.realization.rpjmd.export-pdf', ['year' => 2026]));

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }

    public function test_can_create_multiple_goals_with_objectives_under_same_mission(): void
    {
        $payload = [
            'mode' => 'both',
            'mission' => 'Misi Multi-Goal: Transformasi Wilayah',
            'goals' => [
                [
                    'goal' => 'Tujuan 1: Pertumbuhan Ekonomi Inklusif',
                    'goal_indicators' => [
                        [
                            'indicator' => 'Laju Pertumbuhan Ekonomi',
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => ['2026' => 6.0],
                            'realizations' => ['2026' => 6.2],
                        ],
                    ],
                    'objectives' => [
                        [
                            'order_no' => 1,
                            'objective' => 'Sasaran 1.1: Peningkatan Investasi Daerah',
                            'indicators' => [
                                [
                                    'indicator' => 'Realisasi Investasi PMDN/PMA',
                                    'unit' => 'Milyar Rp',
                                    'measurement_pattern' => 'Positif',
                                    'targets' => ['2026' => 500],
                                    'realizations' => ['2026' => 550],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'goal' => 'Tujuan 2: Pengentasan Kemiskinan',
                    'goal_indicators' => [
                        [
                            'indicator' => 'Tingkat Kemiskinan',
                            'unit' => '%',
                            'measurement_pattern' => 'Negatif',
                            'targets' => ['2026' => 7.0],
                            'realizations' => ['2026' => 6.5],
                        ],
                    ],
                    'objectives' => [
                        [
                            'order_no' => 1,
                            'objective' => 'Sasaran 2.1: Perluasan Bantuan Sosial',
                            'indicators' => [
                                [
                                    'indicator' => 'Cakupan Bansos Tepat Sasaran',
                                    'unit' => '%',
                                    'measurement_pattern' => 'Positif',
                                    'targets' => ['2026' => 95],
                                    'realizations' => ['2026' => 98],
                                ],
                            ],
                        ],
                        [
                            'order_no' => 2,
                            'objective' => 'Sasaran 2.2: Pemberdayaan UMKM Miskin',
                            'indicators' => [
                                [
                                    'indicator' => 'Jumlah UMKM Binaan Mandiri',
                                    'unit' => 'Unit',
                                    'measurement_pattern' => 'Positif',
                                    'targets' => ['2026' => 200],
                                    'realizations' => ['2026' => 220],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('measurement.realization.rpjmd.store'), $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        // Check Goals created
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'goal',
            'mission' => 'Misi Multi-Goal: Transformasi Wilayah',
            'goal' => 'Tujuan 1: Pertumbuhan Ekonomi Inklusif',
        ]);
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'goal',
            'mission' => 'Misi Multi-Goal: Transformasi Wilayah',
            'goal' => 'Tujuan 2: Pengentasan Kemiskinan',
        ]);

        // Check Objectives created
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'objective',
            'mission' => 'Misi Multi-Goal: Transformasi Wilayah',
            'objective' => 'Sasaran 1.1: Peningkatan Investasi Daerah',
        ]);
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'objective',
            'mission' => 'Misi Multi-Goal: Transformasi Wilayah',
            'objective' => 'Sasaran 2.1: Perluasan Bantuan Sosial',
        ]);
        $this->assertDatabaseHas('realization_rpjmd_items', [
            'level' => 'objective',
            'mission' => 'Misi Multi-Goal: Transformasi Wilayah',
            'objective' => 'Sasaran 2.2: Pemberdayaan UMKM Miskin',
        ]);
    }

    public function test_numbering_restarts_per_mission_across_goals_and_objectives(): void
    {
        // Mission 1: 2 Goals
        $m1g1 = RealizationRpjmdItem::create([
            'level' => 'goal',
            'mission' => 'Misi 1',
            'goal' => 'Tujuan 1 Misi 1',
            'created_by' => $this->superAdmin->id,
        ]);
        RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $m1g1->id,
            'mission' => 'Misi 1',
            'goal' => $m1g1->goal,
            'objective' => 'Sasaran 1.1 Misi 1',
            'created_by' => $this->superAdmin->id,
        ]);

        $m1g2 = RealizationRpjmdItem::create([
            'level' => 'goal',
            'mission' => 'Misi 1',
            'goal' => 'Tujuan 2 Misi 1',
            'created_by' => $this->superAdmin->id,
        ]);
        RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $m1g2->id,
            'mission' => 'Misi 1',
            'goal' => $m1g2->goal,
            'objective' => 'Sasaran 2.1 Misi 1',
            'created_by' => $this->superAdmin->id,
        ]);

        // Mission 2: 1 Goal
        $m2g1 = RealizationRpjmdItem::create([
            'level' => 'goal',
            'mission' => 'Misi 2',
            'goal' => 'Tujuan 1 Misi 2',
            'created_by' => $this->superAdmin->id,
        ]);
        RealizationRpjmdItem::create([
            'level' => 'objective',
            'parent_id' => $m2g1->id,
            'mission' => 'Misi 2',
            'goal' => $m2g1->goal,
            'objective' => 'Sasaran 1.1 Misi 2',
            'created_by' => $this->superAdmin->id,
        ]);

        $service = app(RpjmdAnalyticsService::class);
        $matrix = $service->getRpjmdMatrix(2026);

        $this->assertCount(3, $matrix['rows']);
        // Misi 1 Goal 1 -> (1.1)
        $this->assertEquals(1, $matrix['rows'][0]['no']);
        $this->assertEquals('(1.1)', $matrix['rows'][0]['number_code']);
        $this->assertEquals('(1)', $matrix['rows'][0]['goal_code']);
        $this->assertEquals('Misi 1', $matrix['rows'][0]['misi']);

        // Misi 1 Goal 2 -> (2.1)
        $this->assertEquals(2, $matrix['rows'][1]['no']);
        $this->assertEquals('(2.1)', $matrix['rows'][1]['number_code']);
        $this->assertEquals('(2)', $matrix['rows'][1]['goal_code']);
        $this->assertEquals('Misi 1', $matrix['rows'][1]['misi']);

        // Misi 2 Goal 1 -> RESTARTS to (1.1) and goal_code (1), while sequential row no is 3!
        $this->assertEquals(3, $matrix['rows'][2]['no']);
        $this->assertEquals('(1.1)', $matrix['rows'][2]['number_code']);
        $this->assertEquals('(1)', $matrix['rows'][2]['goal_code']);
        $this->assertEquals('Misi 2', $matrix['rows'][2]['misi']);
    }
}
