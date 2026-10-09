<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\AppNotification;
use App\Models\ImportBatch;
use App\Models\Indicator;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class NotificationImportTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    private User $recipient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);

        $this->recipient = User::factory()->create();

        $operatorRole = Role::create(['name' => 'Operator OPD']);
        $viewNotification = Permission::firstOrCreate(
            ['name' => 'notification:view'],
            ['resource' => 'notification', 'action' => 'view', 'module' => 'notification'],
        );
        $operatorRole->permissions()->sync([$viewNotification->id]);
        $this->recipient->roles()->attach($operatorRole);
    }

    public function test_admin_can_send_notification_and_recipient_sees_and_marks_read(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('notifications.send'), [
                'user_id' => $this->recipient->id,
                'title' => 'Pengumuman Pilot',
                'message' => 'Persiapan pilot dimulai',
                'event' => 'announcement',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->recipient->id,
            'title' => 'Pengumuman Pilot',
        ]);

        $response = $this->actingAs($this->recipient)
            ->get(route('notifications.index'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Notifications/Index')
            ->where('unread_count', 1));

        $notification = AppNotification::where('user_id', $this->recipient->id)->firstOrFail();

        $this->actingAs($this->recipient)
            ->post(route('notifications.read', $notification))
            ->assertRedirect();

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_cannot_mark_other_users_notification_as_read(): void
    {
        $notification = AppNotification::create([
            'user_id' => $this->recipient->id,
            'event' => 'assignment',
            'channel' => 'in_app',
            'title' => 'Tugas baru',
            'delivery_status' => 'sent',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('notifications.read', $notification))
            ->assertForbidden();
    }

    public function test_can_upload_commit_import_organizations_from_csv(): void
    {
        $csv = "code,name,type\nOPD-A,Dinas Contoh A,opd\nOPD-B,Dinas Contoh B,opd\nOPD-A,Duplikat,opd\n,NoCode,opd\n";

        $file = UploadedFile::fake()->createWithContent('orgs.csv', $csv);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('imports.upload'), [
                'file' => $file,
                'import_type' => 'organizations',
            ]);

        $batch = ImportBatch::firstOrFail();
        $response->assertRedirect(route('imports.preview', $batch->id));

        $this->assertSame(3, $batch->valid_rows);
        $this->assertSame(1, $batch->invalid_rows);
        $this->assertSame('preview', $batch->status);

        $preview = $this->actingAs($this->superAdmin)
            ->get(route('imports.preview', $batch->id))
            ->assertOk();

        $preview->assertInertia(fn ($page) => $page
            ->component('Imports/Preview')
            ->where('batch.valid_rows', 3)
            ->where('batch.invalid_rows', 1));

        $this->actingAs($this->superAdmin)
            ->post(route('imports.commit', $batch->id))
            ->assertRedirect();

        $batch->refresh();
        $this->assertSame('committed', $batch->status);
        $this->assertSame(2, $batch->imported);
        $this->assertSame(1, $batch->skipped);

        $this->assertDatabaseHas('organizations', ['code' => 'OPD-A']);
        $this->assertDatabaseHas('organizations', ['code' => 'OPD-B']);
        $this->assertSame(2, Organization::whereIn('code', ['OPD-A', 'OPD-B'])->count());
    }

    public function test_can_upload_commit_import_indicators_from_csv(): void
    {
        $csv = "code,name,type,direction,frequency,unit\nIKU-I1,Indikator Satu,outcome,higher_is_better,annual,persen\nIKU-I2,Indikator Dua,output,higher_is_better,quarterly,persen\n";

        $file = UploadedFile::fake()->createWithContent('indicators.csv', $csv);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('imports.upload'), [
                'file' => $file,
                'import_type' => 'indicators',
            ]);

        $batch = ImportBatch::firstOrFail();
        $response->assertRedirect(route('imports.preview', $batch->id));
        $this->assertSame(2, $batch->valid_rows);

        $this->actingAs($this->superAdmin)
            ->post(route('imports.commit', $batch->id))
            ->assertRedirect();

        $batch->refresh();
        $this->assertSame('committed', $batch->status);
        $this->assertSame(2, $batch->imported);

        $this->assertDatabaseHas('indicators', ['code' => 'IKU-I1', 'status' => 'draft']);

        $indicator = Indicator::where('code', 'IKU-I1')->firstOrFail();
        $this->assertNotNull($indicator->current_version_id);
        $this->assertEquals(1, $indicator->versions()->count());
    }

    public function test_upload_rejects_missing_required_header(): void
    {
        $csv = "name,type\nDinas Tanpa Kode,opd\n";

        $file = UploadedFile::fake()->createWithContent('orgs.csv', $csv);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('imports.upload'), [
                'file' => $file,
                'import_type' => 'organizations',
            ]);

        $response->assertSessionHasErrors('file');
        $this->assertSame(0, ImportBatch::count());
    }

    public function test_upload_redirects_to_preview_and_cancel_marks_batch(): void
    {
        $csv = "code,name,type\nOPD-Z,Dinas Z,opd\n";

        $file = UploadedFile::fake()->createWithContent('orgs.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('imports.upload'), [
                'file' => $file,
                'import_type' => 'organizations',
            ])
            ->assertRedirect();

        $batch = ImportBatch::firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('imports.cancel', $batch->id))
            ->assertRedirect();

        $this->assertSame('cancelled', $batch->fresh()->status);
        $this->assertSame(0, Organization::count());
    }

    public function test_commit_cannot_run_twice(): void
    {
        $csv = "code,name,type\nOPD-X,Dinas X,opd\n";

        $file = UploadedFile::fake()->createWithContent('orgs.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('imports.upload'), [
                'file' => $file,
                'import_type' => 'organizations',
            ])
            ->assertRedirect();

        $batch = ImportBatch::firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('imports.commit', $batch->id))
            ->assertRedirect();

        $this->actingAs($this->superAdmin)
            ->post(route('imports.commit', $batch->id))
            ->assertStatus(422);
    }

    public function test_import_report_downloads_csv(): void
    {
        $csv = "code,name,type\nOPD-R,Dinas R,opd\n,NoCode,opd\n";

        $file = UploadedFile::fake()->createWithContent('orgs.csv', $csv);

        $this->actingAs($this->superAdmin)
            ->post(route('imports.upload'), [
                'file' => $file,
                'import_type' => 'organizations',
            ])
            ->assertRedirect();

        $batch = ImportBatch::firstOrFail();

        $response = $this->actingAs($this->superAdmin)
            ->get(route('imports.report', $batch->id))
            ->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('kolom code wajib diisi', $response->streamedContent());
    }

    public function test_user_without_permission_cannot_access_notifications_and_imports(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)
            ->get(route('notifications.index'))
            ->assertForbidden();

        $this->actingAs($regular)
            ->get(route('imports.index'))
            ->assertForbidden();
    }

    public function test_notifications_clear_command_empties_all_notifications(): void
    {
        AppNotification::create([
            'user_id' => $this->recipient->id,
            'title' => 'Test Notif 1',
            'event' => 'announcement',
            'channel' => 'in_app',
            'delivery_status' => 'sent',
        ]);
        AppNotification::create([
            'user_id' => $this->superAdmin->id,
            'title' => 'Test Notif 2',
            'event' => 'submission',
            'channel' => 'in_app',
            'delivery_status' => 'sent',
        ]);

        $this->assertEquals(2, AppNotification::count());

        $this->artisan('notifications:clear')
            ->assertSuccessful();

        $this->assertEquals(0, AppNotification::count());
    }
}
