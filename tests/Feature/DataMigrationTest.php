<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\DataMigration;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class DataMigrationTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);
    }

    public function test_store_creates_migration_with_inventory_and_profiling(): void
    {
        $csv = "code,name,type\nMIG-A,Dinas Migrasi A,opd\nMIG-A,Dinas Duplikat,opd\n,NoCode,opd\n";

        $file = UploadedFile::fake()->createWithContent('migrasi.csv', $csv);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('migrations.store'), [
                'name' => 'Migrasi OPD 2026',
                'entity_type' => 'organizations',
                'file' => $file,
            ]);

        $migration = DataMigration::firstOrFail();
        $response->assertRedirect(route('migrations.show', $migration->id));

        $this->assertSame('staged', $migration->status);
        $this->assertSame(3, $migration->source_count);
        $this->assertSame(1, $migration->profile['missing_required']);
        $this->assertSame(1, $migration->profile['duplicate_codes']);

        $this->actingAs($this->superAdmin)
            ->get(route('migrations.show', $migration->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('DataMigrations/Show')
                ->where('migration.status', 'staged'));
    }

    public function test_full_flow_validate_reconcile_approve_load(): void
    {
        $csv = "code,name,type\nMIG-X,Dinas X,opd\nMIG-Y,Dinas Y,opd\n";

        $file = UploadedFile::fake()->createWithContent('migrasi.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.store'), [
                'name' => 'Migrasi Lengkap',
                'entity_type' => 'organizations',
                'file' => $file,
            ])
            ->assertRedirect();

        $migration = DataMigration::firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.validate', $migration->id))
            ->assertRedirect();

        $migration->refresh();
        $this->assertSame('validated', $migration->status);
        $this->assertSame(2, $migration->cleansed_count);
        $this->assertSame(2, $migration->transformed_count);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.reconcile', $migration->id))
            ->assertRedirect();

        $migration->refresh();
        $this->assertSame('reconciled', $migration->status);
        $this->assertSame(2, $migration->reconciliation['source_valid']);
        $this->assertSame(2, $migration->reconciliation['will_load']);
        $this->assertSame(0, $migration->reconciliation['invalid_rows']);
        $this->assertTrue($migration->reconciliation['reconciled']);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.approve', $migration->id))
            ->assertRedirect();

        $migration->refresh();
        $this->assertSame('signed_off', $migration->status);
        $this->assertSame($this->superAdmin->id, $migration->signed_off_by);
        $this->assertNotNull($migration->signed_off_at);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.load', $migration->id))
            ->assertRedirect();

        $migration->refresh();
        $this->assertSame('loaded', $migration->status);
        $this->assertSame(2, $migration->loaded_count);
        $this->assertDatabaseHas('organizations', ['code' => 'MIG-X']);
        $this->assertDatabaseHas('organizations', ['code' => 'MIG-Y']);
    }

    public function test_load_is_blocked_before_sign_off(): void
    {
        $csv = "code,name,type\nMIG-Z,Dinas Z,opd\n";

        $file = UploadedFile::fake()->createWithContent('migrasi.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.store'), [
                'name' => 'Migrasi Blokir',
                'entity_type' => 'organizations',
                'file' => $file,
            ])
            ->assertRedirect();

        $migration = DataMigration::firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.load', $migration->id))
            ->assertStatus(422);

        $this->assertSame(0, Organization::count());
    }

    public function test_reconciliation_detects_unmatched_and_duplicates(): void
    {
        Organization::create(['code' => 'ADA-DI-TARGET', 'name' => 'Sudah Ada', 'type' => 'opd']);

        $csv = "code,name,type\nADA-DI-TARGET,Dinas Sama,opd\nBARU-DI-SUMBER,Dinas Baru,opd\n";

        $file = UploadedFile::fake()->createWithContent('migrasi.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.store'), [
                'name' => 'Rekonsiliasi',
                'entity_type' => 'organizations',
                'file' => $file,
            ])
            ->assertRedirect();

        $migration = DataMigration::firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.validate', $migration->id))
            ->assertRedirect();

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.reconcile', $migration->id))
            ->assertRedirect();

        $migration->refresh();
        $this->assertSame(1, $migration->reconciliation['matched']);
        $this->assertSame(1, $migration->reconciliation['unmatched_source']);
    }

    public function test_report_downloads_reconciliation_csv(): void
    {
        $csv = "code,name,type\nMIG-R,Dinas R,opd\n";

        $file = UploadedFile::fake()->createWithContent('migrasi.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('migrations.store'), [
                'name' => 'Migrasi Report',
                'entity_type' => 'organizations',
                'file' => $file,
            ])
            ->assertRedirect();

        $migration = DataMigration::firstOrFail();

        $response = $this->actingAs($this->superAdmin)
            ->get(route('migrations.report', $migration->id))
            ->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Migrasi Report', $response->streamedContent());
    }

    public function test_user_without_permission_cannot_access_migrations(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)
            ->get(route('migrations.index'))
            ->assertForbidden();
    }
}
