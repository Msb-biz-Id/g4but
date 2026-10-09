<?php

namespace Tests\Feature;

use App\Models\Organization;
use Database\Seeders\OrganizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(OrganizationSeeder::class);
    }

    public function test_organization_hierarchy_has_single_root_opd(): void
    {
        $rootOpds = Organization::where('type', 'opd')->whereNull('parent_id')->get();

        $this->assertCount(1, $rootOpds);
        $this->assertSame('Dinas Pendidikan dan Kebudayaan', $rootOpds->first()->name);
    }

    public function test_all_sekretariat_and_bidang_belong_to_root_opd(): void
    {
        $rootOpd = Organization::where('type', 'opd')->firstOrFail();
        $children = Organization::whereIn('type', ['sekretariat', 'bidang'])->get();

        $this->assertGreaterThan(0, $children->count());

        foreach ($children as $child) {
            $this->assertSame($rootOpd->id, $child->parent_id, "Unit {$child->name} harus memiliki parent root OPD.");
        }
    }

    public function test_child_units_contain_one_sekretariat_and_multiple_bidang(): void
    {
        $rootOpd = Organization::where('type', 'opd')->firstOrFail();

        $sekretariatCount = $rootOpd->children()->where('type', 'sekretariat')->count();
        $bidangCount = $rootOpd->children()->where('type', 'bidang')->count();

        $this->assertSame(1, $sekretariatCount);
        $this->assertGreaterThanOrEqual(2, $bidangCount);
    }
}
