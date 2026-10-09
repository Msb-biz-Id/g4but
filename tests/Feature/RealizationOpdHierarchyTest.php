<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\RealizationOpdItem;
use App\Models\Role;
use App\Models\User;
use App\Services\OpdAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealizationOpdHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $opdUser;
    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();

        $superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($superAdminRole);

        $this->org = Organization::create([
            'code' => 'DISDIK-PB',
            'name' => 'Dinas Pendidikan Papua Barat',
            'type' => 'opd',
        ]);

        $this->opdUser = User::factory()->create();
        $this->opdUser->organizations()->attach($this->org->id);
    }

    public function test_can_create_one_goal_with_multiple_objectives(): void
    {
        $payload = [
            'organization_id' => $this->org->id,
            'mode' => 'both',
            'goal' => 'Tujuan 1: Meningkatkan Akses dan Kualitas Pendidikan Daerah',
            'goal_indicator' => 'Indeks Pendidikan',
            'goal_indicator_unit' => 'Poin',
            'goal_measurement_pattern' => 'Positif',
            'goal_targets' => [2026 => 80],
            'goal_realizations' => [2026 => 82],
            'objectives' => [
                [
                    'order_no' => 1,
                    'objective' => 'Sasaran 1.1: Pemerataan Tenaga Pendidik',
                    'objective_indicator' => 'Rasio Guru Siswa Terpenuhi',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 90],
                    'realizations' => [2026 => 95],
                ],
                [
                    'order_no' => 2,
                    'objective' => 'Sasaran 1.2: Beasiswa Pendidikan Daerah',
                    'objective_indicator' => 'Jumlah Siswa Penerima Beasiswa',
                    'unit' => 'Orang',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 500],
                    'realizations' => [2026 => 520],
                ],
            ],
        ];

        $response = $this->actingAs($this->opdUser)
            ->post(route('measurement.realization.opd.store'), $payload);

        $response->assertRedirect();

        // Verify Goal is created
        $this->assertDatabaseHas('realization_opd_items', [
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan 1: Meningkatkan Akses dan Kualitas Pendidikan Daerah',
        ]);

        $goal = RealizationOpdItem::where('level', 'goal')->first();
        $this->assertNotNull($goal);

        // Verify child objectives are created with parent_id
        $this->assertEquals(2, $goal->children()->count());
        $this->assertDatabaseHas('realization_opd_items', [
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'objective' => 'Sasaran 1.1: Pemerataan Tenaga Pendidik',
        ]);
        $this->assertDatabaseHas('realization_opd_items', [
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 2,
            'objective' => 'Sasaran 1.2: Beasiswa Pendidikan Daerah',
        ]);
    }

    public function test_can_quick_add_objective_to_existing_goal(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'order_no' => 0,
            'goal' => 'Tujuan Renstra Dinas Pendidikan',
            'goal_indicator' => 'Indikator Tujuan Utama',
            'goal_indicator_unit' => '%',
            'created_by' => $this->opdUser->id,
        ]);

        $payload = [
            'organization_id' => $this->org->id,
            'mode' => 'objective',
            'parent_id' => $goal->id,
            'objective' => 'Sasaran Tambahan 1.1',
            'objective_indicator' => 'Indikator Sasaran Tambahan',
            'unit' => 'Dokumen',
            'measurement_pattern' => 'Positif',
            'targets' => [2026 => 15],
            'realizations' => [2026 => 15],
        ];

        $response = $this->actingAs($this->opdUser)
            ->post(route('measurement.realization.opd.store'), $payload);

        $response->assertRedirect();

        $this->assertEquals(1, $goal->children()->count());
        $child = $goal->children()->first();
        $this->assertEquals('Sasaran Tambahan 1.1', $child->objective);
        $this->assertEquals('Tujuan Renstra Dinas Pendidikan', $child->goal);
        $this->assertEquals(1, $child->order_no);
    }

    public function test_deleting_goal_cascades_to_child_objectives(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan Akan Dihapus',
            'created_by' => $this->opdUser->id,
        ]);

        $child = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'goal' => $goal->goal,
            'objective' => 'Sub Sasaran Anak',
            'objective_indicator' => 'Indikator Anak',
            'created_by' => $this->opdUser->id,
        ]);

        $response = $this->actingAs($this->opdUser)
            ->delete(route('measurement.realization.opd.destroy', $goal->id));

        $response->assertRedirect();

        $this->assertDatabaseMissing('realization_opd_items', ['id' => $goal->id]);
        $this->assertDatabaseMissing('realization_opd_items', ['id' => $child->id]);
    }

    public function test_updating_goal_propagates_to_child_objectives(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan Lama',
            'goal_indicator' => 'Indikator Lama',
            'created_by' => $this->opdUser->id,
        ]);

        $child = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'goal' => 'Tujuan Lama',
            'objective' => 'Sasaran Anak',
            'objective_indicator' => 'Indikator Sasaran Anak',
            'created_by' => $this->opdUser->id,
        ]);

        $response = $this->actingAs($this->opdUser)
            ->put(route('measurement.realization.opd.update', $goal->id), [
                'goal' => 'Tujuan Baru Direvisi',
                'goal_indicator' => 'Indikator Baru Direvisi',
                'goal_indicator_unit' => 'Poin',
            ]);

        $response->assertRedirect();

        $child->refresh();
        $this->assertEquals('Tujuan Baru Direvisi', $child->goal);
        $this->assertEquals('Indikator Baru Direvisi', $child->goal_indicator);
    }

    public function test_analytics_ranking_respects_hierarchy_without_duplicate_goals(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan Utama Renstra',
            'goal_indicator' => 'Indikator Tujuan Utama',
            'created_by' => $this->opdUser->id,
        ]);

        RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'goal' => $goal->goal,
            'objective' => 'Sasaran 1.1',
            'objective_indicator' => 'Indikator Sasaran 1.1',
            'measurement_pattern' => 'Positif',
            'targets' => [2026 => 100],
            'realizations' => [2026 => 90],
            'created_by' => $this->opdUser->id,
        ]);

        RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 2,
            'goal' => $goal->goal,
            'objective' => 'Sasaran 1.2',
            'objective_indicator' => 'Indikator Sasaran 1.2',
            'measurement_pattern' => 'Positif',
            'targets' => [2026 => 100],
            'realizations' => [2026 => 100],
            'created_by' => $this->opdUser->id,
        ]);

        $service = app(OpdAnalyticsService::class);
        $ranking = $service->getOpdPerformanceRanking(2026, $this->org->id);

        $this->assertNotEmpty($ranking['rows']);
        $opdRank = collect($ranking['rows'])->firstWhere('id', $this->org->id);
        $this->assertNotNull($opdRank);

        // Exactly 2 indicators (the child objectives), NOT 3 (the goal is not counted as indicator)
        $this->assertCount(2, $opdRank['drilldown']['indikator']);
        $this->assertEquals(95.0, $opdRank['rata_capaian']);
    }

    public function test_can_create_goals_and_objectives_with_multi_indicators(): void
    {
        $payload = [
            'organization_id' => $this->org->id,
            'mode' => 'both',
            'goals' => [
                [
                    'goal' => 'Tujuan Renstra Multi Indikator',
                    'goal_indicators' => [
                        [
                            'indicator' => 'Indikator Tujuan 1',
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => [2026 => 90],
                            'realizations' => [2026 => 90],
                        ],
                        [
                            'indicator' => 'Indikator Tujuan 2',
                            'unit' => 'Poin',
                            'measurement_pattern' => 'Positif',
                            'targets' => [2026 => 80],
                            'realizations' => [2026 => 85],
                        ],
                    ],
                    'objectives' => [
                        [
                            'order_no' => 1,
                            'objective' => 'Sasaran Renstra Multi Indikator',
                            'indicators' => [
                                [
                                    'indicator' => 'Indikator Sasaran 1.1',
                                    'unit' => '%',
                                    'measurement_pattern' => 'Positif',
                                    'targets' => [2026 => 100],
                                    'realizations' => [2026 => 100],
                                ],
                                [
                                    'indicator' => 'Indikator Sasaran 1.2',
                                    'unit' => 'Dokumen',
                                    'measurement_pattern' => 'Positif',
                                    'targets' => [2026 => 10],
                                    'realizations' => [2026 => 10],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->opdUser)
            ->post(route('measurement.realization.opd.store'), $payload);

        $response->assertRedirect();

        $goal = RealizationOpdItem::where('level', 'goal')->where('goal', 'Tujuan Renstra Multi Indikator')->first();
        $this->assertNotNull($goal);
        $this->assertCount(2, $goal->goal_indicators_list);
        $this->assertEquals('Indikator Tujuan 1', $goal->goal_indicators_list[0]['indicator']);
        $this->assertEquals('Indikator Tujuan 2', $goal->goal_indicators_list[1]['indicator']);

        $child = $goal->children()->first();
        $this->assertNotNull($child);
        $this->assertCount(2, $child->objective_indicators_list);
        $this->assertEquals('Indikator Sasaran 1.1', $child->objective_indicators_list[0]['indicator']);
        $this->assertEquals('Indikator Sasaran 1.2', $child->objective_indicators_list[1]['indicator']);
    }

    public function test_can_quick_add_objective_with_multi_indicators(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'order_no' => 0,
            'goal' => 'Tujuan Renstra Parent',
            'goal_indicators' => [
                ['indicator' => 'Indikator Tujuan', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [], 'realizations' => []],
            ],
            'created_by' => $this->opdUser->id,
        ]);

        $payload = [
            'organization_id' => $this->org->id,
            'mode' => 'objective',
            'parent_id' => $goal->id,
            'objective' => 'Sasaran Cepat Multi Indikator',
            'indicators' => [
                [
                    'indicator' => 'Indikator Cepat 1',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 75],
                    'realizations' => [2026 => 75],
                ],
                [
                    'indicator' => 'Indikator Cepat 2',
                    'unit' => 'Laporan',
                    'measurement_pattern' => 'Positif',
                    'targets' => [2026 => 5],
                    'realizations' => [2026 => 5],
                ],
            ],
        ];

        $response = $this->actingAs($this->opdUser)
            ->post(route('measurement.realization.opd.store'), $payload);

        $response->assertRedirect();

        $child = $goal->children()->where('objective', 'Sasaran Cepat Multi Indikator')->first();
        $this->assertNotNull($child);
        $this->assertCount(2, $child->objective_indicators_list);
        $this->assertEquals('Indikator Cepat 1', $child->objective_indicators_list[0]['indicator']);
        $this->assertEquals('Indikator Cepat 2', $child->objective_indicators_list[1]['indicator']);
    }

    public function test_export_pdf_succeeds_with_hierarchical_multi_indicators(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan Renstra Export PDF',
            'goal_indicators' => [
                ['indicator' => 'Indikator Tujuan 1', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 100], 'realizations' => [2026 => 100]],
            ],
            'created_by' => $this->opdUser->id,
        ]);

        RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'goal' => $goal->goal,
            'objective' => 'Sasaran Export PDF',
            'indicators' => [
                ['indicator' => 'Indikator Sasaran 1', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 100], 'realizations' => [2026 => 100]],
                ['indicator' => 'Indikator Sasaran 2', 'unit' => 'Dokumen', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 10], 'realizations' => [2026 => 10]],
            ],
            'created_by' => $this->opdUser->id,
        ]);

        $response = $this->actingAs($this->opdUser)
            ->get(route('measurement.realization.opd.export-pdf', [
                'organization_id' => $this->org->id,
                'year' => 2026,
            ]));

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
    }

    public function test_export_pdf_displays_calculated_achievements_and_statuses(): void
    {
        $goal = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan Renstra Disdik PB',
            'goal_indicators' => [
                ['indicator' => 'Indikator Tujuan 1', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 100], 'realizations' => [2026 => 80]],
            ],
            'created_by' => $this->opdUser->id,
        ]);

        $child = RealizationOpdItem::create([
            'organization_id' => $this->org->id,
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'goal' => $goal->goal,
            'objective' => 'Sasaran Disdik PB',
            'indicators' => [
                ['indicator' => 'Indikator Sasaran 1', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 100], 'realizations' => [2026 => 0]],
                ['indicator' => 'Indikator Sasaran 2', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 600], 'realizations' => [2026 => 300]],
                ['indicator' => 'Indikator Sasaran 3', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 600], 'realizations' => [2026 => 75]],
            ],
            'created_by' => $this->opdUser->id,
        ]);

        $response = $this->actingAs($this->opdUser)
            ->get(route('measurement.realization.opd.export-pdf', [
                'organization_id' => $this->org->id,
                'year' => 2026,
            ]));

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
        $this->assertNotEmpty($response->getContent());

        // Also test RealizationOpdItem accessor preservation directly
        $child->refresh();
        $this->assertCount(3, $child->objective_indicators_list);

        // Test enriched indicators preservation
        $years = [2025, 2026, 2027, 2028, 2029];
        $enriched = array_map(function ($ind) use ($years) {
            $targets = (array) ($ind['targets'] ?? []);
            $realizations = (array) ($ind['realizations'] ?? []);
            $calcs = [];
            foreach ($years as $yr) {
                $t = isset($targets[$yr]) ? (float) $targets[$yr] : null;
                $r = isset($realizations[$yr]) ? (float) $realizations[$yr] : null;
                $ach = \App\Services\PerformanceMeasurementService::calculateAchievement($t, $r, 'Positif');
                $status = \App\Services\PerformanceMeasurementService::determineStatus($ach, $t, $r);
                $calcs[$yr] = ['achievement' => $ach, 'status' => $status['status']];
            }
            $ind['calculations'] = $calcs;
            return $ind;
        }, $child->objective_indicators_list);

        $child->setAttribute('objective_indicators_list', $enriched);
        // Ensure accessor returns enriched list with calculations
        $retrievedList = $child->objective_indicators_list;
        $this->assertArrayHasKey('calculations', $retrievedList[0]);
        $this->assertEquals(0.0, $retrievedList[0]['calculations'][2026]['achievement']);
        $this->assertEquals('Kritis', $retrievedList[0]['calculations'][2026]['status']);
        $this->assertEquals(50.0, $retrievedList[1]['calculations'][2026]['achievement']);
        $this->assertEquals('Perlu Perhatian', $retrievedList[1]['calculations'][2026]['status']);
        $this->assertEquals(12.5, $retrievedList[2]['calculations'][2026]['achievement']);
        $this->assertEquals('Kritis', $retrievedList[2]['calculations'][2026]['status']);

        // Verify HTML rendering contains the exact badges and percentages
        $goal->setRelation('children', collect([$child]));
        $viewHtml = view('pdf.measurement-opd', [
            'goals' => collect([$goal]),
            'items' => [$goal, $child],
            'currentYear' => 2026,
            'organization' => $this->org,
            'stats' => [
                'total' => 3, 'tercapai' => 0, 'perhatian' => 1, 'kritis' => 2, 'tidak_dinilai' => 0, 'avg' => 20.8,
            ],
            'years' => $years,
            'generatedAt' => '08/10/2026 01:00',
        ])->render();

        $this->assertStringContainsString('0,0%', $viewHtml);
        $this->assertStringContainsString('50,0%', $viewHtml);
        $this->assertStringContainsString('12,5%', $viewHtml);
        $this->assertStringContainsString('status-kritis">Kritis</span>', $viewHtml);
        $this->assertStringContainsString('status-perhatian">Perhatian</span>', $viewHtml);
    }
}
