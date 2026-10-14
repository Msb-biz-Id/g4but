<?php

namespace App\Services;

use App\Models\Indicator;
use App\Models\Organization;
use App\Models\User;
use App\Policies\IkuPolicy;
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

        Gate::policy(Indicator::class, IkuPolicy::class);

        // User & Role management
        Gate::define('manage-users', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('user:create'));
        Gate::define('view-users', fn (User $user) => $user->hasPermission('user:view'));
        Gate::define('deactivate-users', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('user:deactivate'));
        Gate::define('reset-passwords', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('user:reset_password'));
        Gate::define('manage-roles', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('role:manage'));
        Gate::define('view-roles', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('role:view'));

        // Organization management
        Gate::define('view-organizations', fn (User $user) => $user->hasPermission('organization:view'));
        Gate::define('manage-organizations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('organization:create'));
        Gate::define('edit-organization-profile', function (User $user, Organization $org) {
            if ($user->isOpdAdmin()) {
                return true;
            }

            // Admin unit (Sekretariat / Bidang) hanya boleh mengedit profil unit-nya sendiri
            return ($user->hasRole('Admin Sekretariat') || $user->hasRole('Admin Bidang'))
                && $user->organizations()->where('organizations.id', $org->id)->exists();
        });

        // Goals, Objectives, Targets, Performance Nodes
        Gate::define('view-goals', fn (User $user) => $user->hasPermission('goal:view'));
        Gate::define('manage-goals', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('goal:manage'));
        Gate::define('view-targets', fn (User $user) => $user->hasPermission('target:view'));
        Gate::define('manage-targets', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('target:manage'));

        // Realizations & Evidences (Maker: Admin, Checker: Kepala)
        Gate::define('view-realizations', fn (User $user) => $user->hasPermission('realization:view'));
        Gate::define('create-realizations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('realization:create'));
        Gate::define('update-realizations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('realization:update'));
        Gate::define('submit-realizations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('realization:submit'));
        Gate::define('approve-realizations', fn (User $user) => $user->isLeadership() || $user->hasPermission('realization:approve'));
        Gate::define('reject-realizations', fn (User $user) => $user->isLeadership() || $user->hasPermission('realization:reject'));
        Gate::define('view-evidences', fn (User $user) => $user->hasPermission('evidence:view'));
        Gate::define('upload-evidences', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('evidence:upload'));

        // Dashboard & Analytics
        Gate::define('view-dashboard', fn (User $user) => $user->hasPermission('dashboard:view'));
        Gate::define('view-analytics', fn (User $user) => $user->hasPermission('report:view'));

        // Reports (LKIP)
        Gate::define('view-reports', fn (User $user) => $user->hasPermission('report:view'));
        Gate::define('generate-reports', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('report:generate'));

        // Evaluation (SAKIP / PKO)
        Gate::define('view-evaluations', fn (User $user) => $user->hasPermission('evaluation:view'));
        Gate::define('manage-evaluations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('evaluation:manage'));
        Gate::define('score-evaluations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('evaluation:score'));

        // EWS Alerts & Notifications
        Gate::define('view-alerts', fn (User $user) => $user->hasPermission('alert:view'));
        Gate::define('acknowledge-alerts', fn (User $user) => $user->hasPermission('alert:acknowledge'));
        Gate::define('resolve-alerts', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('alert:resolve'));
        Gate::define('view-alert-rules', fn (User $user) => $user->hasPermission('alert_rule:view'));
        Gate::define('manage-alert-rules', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('alert_rule:manage'));
        Gate::define('view-notifications', fn (User $user) => $user->hasPermission('notification:view'));
        Gate::define('send-notifications', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('notification:send'));

        // Imports & Migrations
        Gate::define('run-imports', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('import:run'));
        Gate::define('run-migrations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('migration:run'));

        // Knowledge & Integration
        Gate::define('view-knowledge', fn (User $user) => $user->hasPermission('knowledge:view'));
        Gate::define('manage-knowledge', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('knowledge:manage'));
        Gate::define('publish-knowledge', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('knowledge:publish'));
        Gate::define('use-ai', fn (User $user) => $user->hasPermission('ai:use'));
        Gate::define('manage-ai', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('config:manage'));
        Gate::define('view-integrations', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('integration:view'));
        Gate::define('view-readiness', fn (User $user) => $user->hasPermission('config:view'));
        Gate::define('manage-readiness', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('config:manage'));

        // Master Indicators
        Gate::define('view-indicators', fn (User $user) => $user->hasPermission('indicator:view'));
        Gate::define('create-indicators', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('indicator:create'));
        Gate::define('update-indicators', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('indicator:update'));
        Gate::define('archive-indicators', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('indicator:archive'));

        // IKU Workflow (Maker: Admin, Checker: Kepala)
        Gate::define('view-iku', fn (User $user) => true);
        Gate::define('create-iku', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('iku:create') || $user->hasPermission('indicator:create'));
        Gate::define('update-iku', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('iku:update') || $user->hasPermission('indicator:update'));
        Gate::define('submit-iku', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('iku:submit') || $user->hasPermission('indicator:update'));
        Gate::define('review-iku', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('iku:review'));
        Gate::define('finalize-iku', fn (User $user) => $user->hasRole('Kepala OPD') || $user->hasPermission('iku:finalize'));
        Gate::define('deactivate-iku', fn (User $user) => $user->hasRole('Kepala OPD') || $user->hasPermission('iku:deactivate'));
        Gate::define('delete-iku', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('iku:delete'));
        Gate::define('import-iku', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('iku:import'));
        Gate::define('export-iku', fn (User $user) => $user->hasPermission('iku:export') || $user->hasPermission('indicator:view'));

        // Measurement Units
        Gate::define('view-units', fn (User $user) => $user->hasPermission('unit:view'));
        Gate::define('manage-units', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('unit:manage'));

        // Planning Periods
        Gate::define('view-planning-periods', fn (User $user) => $user->hasPermission('planning_period:view'));
        Gate::define('view-periods', fn (User $user) => $user->hasPermission('planning_period:view'));
        Gate::define('manage-planning-periods', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('planning_period:manage'));
        Gate::define('manage-periods', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('planning_period:manage'));

        // Measurement Periods
        Gate::define('view-measurement-periods', fn (User $user) => $user->hasPermission('measurement_period:view'));
        Gate::define('manage-measurement-periods', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('measurement_period:manage'));

        // Audit Logs
        Gate::define('view-audit', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('audit_log:view'));
        Gate::define('view-audit-logs', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('audit_log:view'));
        Gate::define('export-audit', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('audit_log:view'));
        Gate::define('export-audit-logs', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('audit_log:view'));
        Gate::define('audit_log:view', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('audit_log:view'));

        // Planning Documents
        Gate::define('view-planning-docs', fn (User $user) => $user->hasPermission('goal:view'));
        Gate::define('manage-planning-docs', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('goal:manage'));
        Gate::define('approve-planning-docs', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('planning:approve'));
        Gate::define('reject-planning-docs', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('planning:approve'));
        Gate::define('lock-planning-docs', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('planning:approve'));

        // Performance Agreements
        Gate::define('approve-agreements', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('agreement:approve'));
        Gate::define('reject-agreements', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('agreement:approve'));
        Gate::define('lock-agreements', fn (User $user) => $user->isLeadership() || $user->isOpdAdmin() || $user->hasPermission('agreement:approve'));
        Gate::define('view-planning-monitoring', fn (User $user) => $user->isOpdAdmin() || $user->isLeadership() || $user->hasPermission('planning:review'));

        // Direct permission-string gates
        Gate::define('config:manage', fn (User $user) => $user->isOpdAdmin() || $user->hasPermission('config:manage'));
        Gate::define('config:view', fn (User $user) => $user->hasPermission('config:view'));
    }

    public function isOpdAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->isOpdAdmin();
    }

    public function accessibleOrganizationIds(?User $user): array
    {
        if (! $user) {
            return [];
        }

        if ($this->isOpdAdmin($user) || $user->hasRole('Kepala OPD')) {
            return Organization::query()->pluck('id')->map(fn ($id) => (int) $id)->all();
        }

        return $user->scopeOrganizationIds();
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
