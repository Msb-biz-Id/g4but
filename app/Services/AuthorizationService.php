<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

class AuthorizationService
{
    public function boot(): void
    {
        Gate::before(function (User $user, string $ability): ?bool {
            if ($user->hasRole('Super Admin')) {
                return true;
            }

            if (str_contains($ability, ':') && $user->hasPermission($ability)) {
                return true;
            }

            return null;
        });

        Gate::define('manage-users', fn (User $user) => $user->hasPermission('user:create'));
        Gate::define('view-users', fn (User $user) => $user->hasPermission('user:view'));
        Gate::define('deactivate-users', fn (User $user) => $user->hasPermission('user:deactivate'));
        Gate::define('reset-passwords', fn (User $user) => $user->hasPermission('user:reset_password'));
        Gate::define('manage-roles', fn (User $user) => $user->hasPermission('role:manage'));
        Gate::define('view-roles', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('role:view'));

        Gate::define('view-organizations', fn (User $user) => $user->hasPermission('organization:view'));
        Gate::define('manage-organizations', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('organization:create'));
        Gate::define('edit-organization-profile', function (User $user, Organization $org) {
            if ($user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi')) {
                return true;
            }

            // Admin OPD hanya boleh mengedit profil OPD-nya sendiri
            return $user->hasRole('Admin OPD') && $user->organizations()->where('organizations.id', $org->id)->exists();
        });

        Gate::define('view-goals', fn (User $user) => $user->hasPermission('goal:view'));
        Gate::define('manage-goals', fn (User $user) => $user->hasPermission('goal:manage'));
        Gate::define('view-targets', fn (User $user) => $user->hasPermission('target:view'));
        Gate::define('manage-targets', fn (User $user) => $user->hasPermission('target:manage'));
        Gate::define('view-realizations', fn (User $user) => $user->hasPermission('realization:view'));
        Gate::define('create-realizations', fn (User $user) => $user->hasPermission('realization:create'));
        Gate::define('update-realizations', fn (User $user) => $user->hasPermission('realization:update'));
        Gate::define('submit-realizations', fn (User $user) => $user->hasPermission('realization:submit'));
        Gate::define('approve-realizations', fn (User $user) => $user->hasPermission('realization:approve'));
        Gate::define('reject-realizations', fn (User $user) => $user->hasPermission('realization:reject'));
        Gate::define('view-evidences', fn (User $user) => $user->hasPermission('evidence:view'));
        Gate::define('upload-evidences', fn (User $user) => $user->hasPermission('evidence:upload'));

        Gate::define('view-dashboard', fn (User $user) => $user->hasPermission('dashboard:view'));
        Gate::define('view-reports', fn (User $user) => $user->hasPermission('report:view'));
        Gate::define('generate-reports', fn (User $user) => $user->hasPermission('report:generate'));
        Gate::define('view-evaluations', fn (User $user) => $user->hasPermission('evaluation:view'));
        Gate::define('manage-evaluations', fn (User $user) => $user->hasPermission('evaluation:manage'));
        Gate::define('score-evaluations', fn (User $user) => $user->hasPermission('evaluation:score'));
        Gate::define('view-alerts', fn (User $user) => $user->hasPermission('alert:view'));
        Gate::define('acknowledge-alerts', fn (User $user) => $user->hasPermission('alert:acknowledge'));
        Gate::define('resolve-alerts', fn (User $user) => $user->hasPermission('alert:resolve'));
        Gate::define('view-alert-rules', fn (User $user) => $user->hasPermission('alert_rule:view'));
        Gate::define('manage-alert-rules', fn (User $user) => $user->hasPermission('alert_rule:manage'));
        Gate::define('view-notifications', fn (User $user) => $user->hasPermission('notification:view'));
        Gate::define('send-notifications', fn (User $user) => $user->hasPermission('notification:send'));
        Gate::define('run-imports', fn (User $user) => $user->hasPermission('import:run'));
        Gate::define('run-migrations', fn (User $user) => $user->hasPermission('migration:run'));
        Gate::define('view-knowledge', fn (User $user) => $user->hasPermission('knowledge:view'));
        Gate::define('manage-knowledge', fn (User $user) => $user->hasPermission('knowledge:manage'));
        Gate::define('publish-knowledge', fn (User $user) => $user->hasPermission('knowledge:publish'));
        Gate::define('use-ai', fn (User $user) => $user->hasPermission('ai:use'));
        Gate::define('manage-ai', fn (User $user) => $user->hasPermission('config:manage'));
        Gate::define('view-integrations', fn (User $user) => $user->hasPermission('integration:view'));
        Gate::define('view-readiness', fn (User $user) => $user->hasPermission('config:view'));
        Gate::define('manage-readiness', fn (User $user) => $user->hasPermission('config:manage'));

        // Indicator gates (existing)
        Gate::define('view-indicators', fn (User $user) => $user->hasPermission('indicator:view'));
        Gate::define('create-indicators', fn (User $user) => $user->hasPermission('indicator:create'));
        Gate::define('update-indicators', fn (User $user) => $user->hasPermission('indicator:update'));
        Gate::define('archive-indicators', fn (User $user) => $user->hasPermission('indicator:archive'));

        // IKU Workflow gates — FINAL SPEC
        Gate::define('view-iku', fn (User $user) => true); // semua login bisa lihat
        Gate::define('create-iku', fn (User $user) => $user->hasPermission('indicator:create') || $user->hasPermission('iku:create'));
        Gate::define('update-iku', fn (User $user) => $user->hasPermission('indicator:update') || $user->hasPermission('iku:update'));
        Gate::define('submit-iku', fn (User $user) => $user->hasPermission('indicator:update') || $user->hasPermission('iku:submit'));
        Gate::define('review-iku', fn (User $user) => $user->organization?->is_bappeda === true || $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Evaluator Provinsi') || $user->hasPermission('iku:review'));
        Gate::define('finalize-iku', fn (User $user) => $user->organization?->is_bappeda === true || $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Evaluator Provinsi') || $user->hasPermission('iku:finalize'));
        Gate::define('deactivate-iku', fn (User $user) => $user->organization?->is_bappeda === true || $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Evaluator Provinsi') || $user->hasPermission('iku:deactivate'));
        Gate::define('delete-iku', fn (User $user) => $user->organization?->is_bappeda === true || $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Evaluator Provinsi') || $user->hasPermission('iku:delete'));
        Gate::define('import-iku', fn (User $user) => $user->hasPermission('indicator:create') || $user->hasPermission('iku:import'));
        Gate::define('export-iku', fn (User $user) => $user->hasPermission('indicator:view') || $user->hasPermission('iku:export'));

        // Unit (measurement unit) gates
        Gate::define('view-units', fn (User $user) => $user->hasPermission('unit:view'));
        Gate::define('manage-units', fn (User $user) => $user->hasPermission('unit:manage'));

        // Period gates — PeriodController uses 'view-planning-periods' and 'manage-planning-periods'
        Gate::define('view-planning-periods', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('planning_period:view'));
        Gate::define('view-periods', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('planning_period:view'));
        Gate::define('manage-planning-periods', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('planning_period:manage'));
        Gate::define('manage-periods', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('planning_period:manage'));

        // Audit log gates — dipakai AuditController
        Gate::define('view-audit', fn (User $user) => $user->hasPermission('audit_log:view'));
        Gate::define('view-audit-logs', fn (User $user) => $user->hasPermission('audit_log:view'));
        Gate::define('export-audit', fn (User $user) => $user->hasPermission('audit_log:view'));
        Gate::define('export-audit-logs', fn (User $user) => $user->hasPermission('audit_log:view'));
        Gate::define('audit_log:view', fn (User $user) => $user->hasPermission('audit_log:view'));

        // Measurement period gates
        Gate::define('view-measurement-periods', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('measurement_period:view'));
        Gate::define('manage-measurement-periods', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasPermission('measurement_period:manage'));

        // Analytics gate — dipakai AnalyticsController
        Gate::define('view-analytics', fn (User $user) => $user->hasPermission('report:view'));

        // Planning document gates (FR-PLN-001/002/003 — RPJMD/Renstra/Renja)
        Gate::define('view-planning-docs', fn (User $user) => $user->hasPermission('goal:view'));
        Gate::define('manage-planning-docs', fn (User $user) => $user->hasPermission('goal:manage'));
        Gate::define('approve-planning-docs', fn (User $user) => $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve')
        );
        Gate::define('reject-planning-docs', fn (User $user) => $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve')
        );
        Gate::define('lock-planning-docs', fn (User $user) => $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve')
        );
        Gate::define('approve-agreements', fn (User $user) => $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi')
            || $user->hasPermission('agreement:approve')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
        );
        Gate::define('reject-agreements', fn (User $user) => $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi')
            || $user->hasPermission('agreement:approve')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
        );
        Gate::define('lock-agreements', fn (User $user) => $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi')
            || $user->hasPermission('agreement:approve')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
        );
        Gate::define('view-planning-monitoring', fn (User $user) => $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Evaluator Provinsi') || $user->hasRole('Inspektorat') || $user->hasRole('Pimpinan Provinsi') || $user->hasPermission('planning:review'));

        // Direct permission-string gates — used by SettingsController::authorize()
        Gate::define('config:manage', fn (User $user) => $user->hasPermission('config:manage'));
        Gate::define('config:view', fn (User $user) => $user->hasPermission('config:view'));
    }

    public function isProvincialAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi');
    }

    public function accessibleOrganizationIds(?User $user): array
    {
        if (! $user) {
            return [];
        }

        if ($this->isProvincialAdmin($user) || $user->isProvincialLevel()) {
            return Organization::query()->pluck('id')->map(fn ($id) => (int) $id)->all();
        }

        $orgIds = $user->organizations()->pluck('organizations.id')->map(fn ($id) => (int) $id)->all();
        if (empty($orgIds) && $user->defaultOrganization()) {
            $orgIds = [(int) $user->defaultOrganization()->id];
        }

        return $orgIds;
    }

    /**
     * Cek apakah user berhak mengakses organisasi tertentu.
     */
    public function canAccessOrganization(?User $user, int $organizationId): bool
    {
        if (! $user) {
            return false;
        }

        return in_array((int) $organizationId, $this->accessibleOrganizationIds($user), true);
    }
}
