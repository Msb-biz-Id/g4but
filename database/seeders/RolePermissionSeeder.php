<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    /**
     * Daftar permission: resource + action.
     * Format: [resource, action, module].
     *
     * @var list<array{0: string, 1: string, 2: string}>
     */
    private const PERMISSIONS = [
        // Identity & Access
        ['user', 'view', 'iam'],
        ['user', 'create', 'iam'],
        ['user', 'update', 'iam'],
        ['user', 'deactivate', 'iam'],
        ['user', 'reset_password', 'iam'],
        ['role', 'view', 'iam'],
        ['role', 'assign', 'iam'],
        ['role', 'manage', 'iam'],
        ['permission', 'view', 'iam'],
        ['permission', 'manage', 'iam'],

        // Master Data
        ['organization', 'view', 'master_data'],
        ['organization', 'create', 'master_data'],
        ['organization', 'update', 'master_data'],
        ['organization_unit', 'view', 'master_data'],
        ['organization_unit', 'manage', 'master_data'],
        ['planning_period', 'view', 'master_data'],
        ['planning_period', 'manage', 'master_data'],
        ['measurement_period', 'view', 'master_data'],
        ['measurement_period', 'manage', 'master_data'],
        ['indicator', 'view', 'master_data'],
        ['indicator', 'create', 'master_data'],
        ['indicator', 'update', 'master_data'],
        ['indicator', 'archive', 'master_data'],
        ['indicator', 'version', 'master_data'],
        ['unit', 'view', 'master_data'],
        ['unit', 'manage', 'master_data'],
        ['reference', 'view', 'master_data'],
        ['reference', 'manage', 'master_data'],
        ['import', 'run', 'master_data'],
        ['migration', 'run', 'master_data'],

        // Planning
        ['goal', 'view', 'planning'],
        ['goal', 'manage', 'planning'],
        ['objective', 'view', 'planning'],
        ['objective', 'manage', 'planning'],
        ['target', 'view', 'planning'],
        ['target', 'manage', 'planning'],
        ['performance_node', 'view', 'planning'],
        ['performance_node', 'manage', 'planning'],
        ['agreement', 'view', 'planning'],
        ['agreement', 'manage', 'planning'],
        ['agreement', 'approve', 'planning'],
        ['action_plan', 'view', 'planning'],
        ['action_plan', 'manage', 'planning'],
        ['risk', 'view', 'planning'],
        ['risk', 'manage', 'planning'],
        ['planning', 'submit', 'planning'],
        ['planning', 'review', 'planning'],
        ['planning', 'approve', 'planning'],

        // IKU (Indikator Kinerja Utama)
        ['iku', 'view', 'planning'],
        ['iku', 'create', 'planning'],
        ['iku', 'update', 'planning'],
        ['iku', 'submit', 'planning'],
        ['iku', 'review', 'planning'],
        ['iku', 'finalize', 'planning'],
        ['iku', 'deactivate', 'planning'],
        ['iku', 'delete', 'planning'],
        ['iku', 'export', 'planning'],
        ['iku', 'import', 'planning'],

        // Measurement
        ['realization', 'view', 'measurement'],
        ['realization', 'create', 'measurement'],
        ['realization', 'update', 'measurement'],
        ['realization', 'submit', 'measurement'],
        ['realization', 'approve', 'measurement'],
        ['realization', 'reject', 'measurement'],
        ['realization', 'revision', 'measurement'],
        ['realization', 'reopen', 'measurement'],
        ['evidence', 'view', 'measurement'],
        ['evidence', 'upload', 'measurement'],
        ['evidence', 'download', 'measurement'],

        // Dashboard
        ['dashboard', 'view', 'dashboard'],

        // Reporting
        ['report', 'view', 'reporting'],
        ['report', 'generate', 'reporting'],
        ['report', 'export_pdf', 'reporting'],
        ['report', 'export_xlsx', 'reporting'],
        ['report', 'export_csv', 'reporting'],

        // Evaluation
        ['evaluation', 'view', 'evaluation'],
        ['evaluation', 'manage', 'evaluation'],
        ['evaluation', 'score', 'evaluation'],
        ['evaluation', 'submit', 'evaluation'],
        ['recommendation', 'view', 'evaluation'],
        ['recommendation', 'manage', 'evaluation'],
        ['followup', 'view', 'evaluation'],
        ['followup', 'manage', 'evaluation'],
        ['followup', 'verify', 'evaluation'],

        // Early Warning System
        ['alert', 'view', 'early_warning'],
        ['alert', 'acknowledge', 'early_warning'],
        ['alert', 'resolve', 'early_warning'],
        ['alert_rule', 'view', 'early_warning'],
        ['alert_rule', 'manage', 'early_warning'],

        // Notifications
        ['notification', 'view', 'communication'],
        ['notification', 'send', 'communication'],

        // Audit Trail
        ['audit_log', 'view', 'audit'],

        // Knowledge Management
        ['knowledge', 'view', 'knowledge'],
        ['knowledge', 'manage', 'knowledge'],
        ['knowledge', 'publish', 'knowledge'],

        // AI
        ['ai', 'use', 'ai'],

        // Integration
        ['integration', 'view', 'integration'],

        // Configuration
        ['config', 'view', 'configuration'],
        ['config', 'manage', 'configuration'],
    ];

    /**
     * Pemetaan permission ke 7 role baru Rumah Besar OPD (Matriks 2.3).
     *
     * @var array<string, list<string>>
     */
    private const ROLE_PERMISSIONS = [
        RoleEnum::SuperAdmin->value => ['*'],

        RoleEnum::AdminOpd->value => [
            // IAM internal OPD
            'user', 'role:view', 'permission:view',
            // Master data
            'organization', 'organization_unit', 'planning_period', 'measurement_period',
            'indicator', 'unit', 'reference', 'import', 'migration',
            // Perencanaan Kinerja
            'goal', 'objective', 'target', 'performance_node', 'agreement', 'action_plan', 'risk',
            'planning:submit', 'planning:review',
            // IKU OPD (Maker & Workflow)
            'iku:view', 'iku:create', 'iku:update', 'iku:submit', 'iku:review', 'iku:export', 'iku:import',
            // Pengukuran & Realisasi
            'realization:view', 'realization:create', 'realization:update', 'realization:submit',
            'evidence:view', 'evidence:upload', 'evidence:download',
            // Pelaporan & Dashboard
            'report', 'dashboard:view',
            // Evaluasi SAKIP & PKO per unit
            'evaluation:view', 'evaluation:manage', 'evaluation:score', 'evaluation:submit',
            'recommendation:view', 'recommendation:manage', 'followup:view', 'followup:manage',
            // EWS, Notifikasi, Audit Log, Knowledge, AI, Integrasi, Config
            'alert', 'alert_rule', 'notification', 'audit_log:view', 'knowledge', 'ai:use', 'config', 'integration',
        ],

        RoleEnum::KepalaOpd->value => [
            'dashboard:view', 'ai:use',
            // Read Master Data
            'user:view', 'organization:view', 'organization_unit:view', 'planning_period:view',
            'measurement_period:view', 'indicator:view', 'unit:view', 'reference:view',
            // Pengesahan Perencanaan & Perjanjian Kinerja
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'agreement:approve', 'action_plan:view', 'risk:view',
            'planning:view', 'planning:approve',
            // IKU (Pengesahan Final & Nonaktif)
            'iku:view', 'iku:finalize', 'iku:deactivate', 'iku:export',
            // Pengukuran & Realisasi (Pengesahan/Persetujuan)
            'realization:view', 'realization:approve', 'realization:reject', 'realization:revision',
            'evidence:view', 'evidence:download',
            // Pelaporan
            'report:view', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            // Pengesahan Hasil Evaluasi SAKIP & PKO
            'evaluation:view', 'recommendation:view', 'followup:view', 'followup:manage',
            // EWS, Notifikasi, Pusat Informasi, Audit Log
            'alert:view', 'alert:acknowledge', 'notification:view', 'knowledge:view', 'audit_log:view',
        ],

        RoleEnum::AdminSekretariat->value => [
            // Read Master Data
            'organization:view', 'organization_unit:view', 'planning_period:view', 'measurement_period:view',
            'indicator:view', 'unit:view', 'reference:view',
            // Perencanaan Sekretariat (Maker)
            'goal:view', 'goal:manage', 'objective:view', 'objective:manage',
            'target:view', 'target:manage', 'performance_node:view', 'performance_node:manage',
            'agreement:view', 'agreement:manage', 'action_plan:view', 'action_plan:manage',
            'risk:view', 'risk:manage', 'planning:submit',
            // IKU Unit (Maker)
            'iku:view', 'iku:create', 'iku:update', 'iku:submit', 'iku:export', 'iku:import',
            // Pengukuran & Realisasi (Maker)
            'realization:view', 'realization:create', 'realization:update', 'realization:submit',
            'evidence:view', 'evidence:upload', 'evidence:download',
            // Pelaporan LKIP Unit
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx',
            'dashboard:view',
            // Evaluasi SAKIP/PKO Unit
            'evaluation:view', 'evaluation:manage', 'evaluation:score',
            'recommendation:view', 'followup:view', 'followup:manage',
            // Notifikasi, Knowledge, AI, EWS
            'alert:view', 'alert:acknowledge', 'notification:view', 'notification:send',
            'knowledge:view', 'knowledge:manage', 'ai:use',
        ],

        RoleEnum::KepalaSekretariat->value => [
            'dashboard:view', 'ai:use',
            // Read Master Data
            'organization:view', 'organization_unit:view', 'planning_period:view', 'measurement_period:view',
            'indicator:view', 'unit:view', 'reference:view',
            // Review & Pengesahan Unit Sekretariat (Checker)
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'agreement:approve', 'action_plan:view', 'risk:view',
            'planning:view', 'planning:review',
            // IKU Review Unit
            'iku:view', 'iku:review', 'iku:export',
            // Pengukuran & Realisasi (Checker)
            'realization:view', 'realization:approve', 'realization:reject', 'realization:revision',
            'evidence:view', 'evidence:download',
            // Pelaporan LKIP
            'report:view', 'report:export_pdf', 'report:export_xlsx',
            // Evaluasi SAKIP/PKO Unit (Review/Verify)
            'evaluation:view', 'recommendation:view', 'followup:view', 'followup:verify', 'followup:manage',
            // EWS, Notifikasi, Knowledge
            'alert:view', 'alert:acknowledge', 'notification:view', 'knowledge:view',
        ],

        RoleEnum::AdminBidang->value => [
            // Read Master Data
            'organization:view', 'organization_unit:view', 'planning_period:view', 'measurement_period:view',
            'indicator:view', 'unit:view', 'reference:view',
            // Perencanaan Bidang (Maker)
            'goal:view', 'goal:manage', 'objective:view', 'objective:manage',
            'target:view', 'target:manage', 'performance_node:view', 'performance_node:manage',
            'agreement:view', 'agreement:manage', 'action_plan:view', 'action_plan:manage',
            'risk:view', 'risk:manage', 'planning:submit',
            // IKU Unit (Maker)
            'iku:view', 'iku:create', 'iku:update', 'iku:submit', 'iku:export', 'iku:import',
            // Pengukuran & Realisasi (Maker)
            'realization:view', 'realization:create', 'realization:update', 'realization:submit',
            'evidence:view', 'evidence:upload', 'evidence:download',
            // Pelaporan LKIP Unit
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx',
            'dashboard:view',
            // Usulan PKO / Evaluasi Unit
            'evaluation:view', 'evaluation:manage', 'evaluation:score',
            'recommendation:view', 'followup:view', 'followup:manage',
            // Notifikasi, Knowledge, AI, EWS
            'alert:view', 'alert:acknowledge', 'notification:view', 'notification:send',
            'knowledge:view', 'knowledge:manage', 'ai:use',
        ],

        RoleEnum::KepalaBidang->value => [
            'dashboard:view', 'ai:use',
            // Read Master Data
            'organization:view', 'organization_unit:view', 'planning_period:view', 'measurement_period:view',
            'indicator:view', 'unit:view', 'reference:view',
            // Review & Pengesahan Unit Bidang (Checker)
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'agreement:approve', 'action_plan:view', 'risk:view',
            'planning:view', 'planning:review',
            // IKU Review Unit
            'iku:view', 'iku:review', 'iku:export',
            // Pengukuran & Realisasi (Checker)
            'realization:view', 'realization:approve', 'realization:reject', 'realization:revision',
            'evidence:view', 'evidence:download',
            // Pelaporan LKIP
            'report:view', 'report:export_pdf', 'report:export_xlsx',
            // Evaluasi SAKIP/PKO Unit (Review/Verify)
            'evaluation:view', 'recommendation:view', 'followup:view', 'followup:verify', 'followup:manage',
            // EWS, Notifikasi, Knowledge
            'alert:view', 'alert:acknowledge', 'notification:view', 'knowledge:view',
        ],
    ];

    public function run(): void
    {
        DB::transaction(function () {
            $permissions = [];

            foreach (self::PERMISSIONS as [$resource, $action, $module]) {
                $name = "{$resource}:{$action}";
                $permissions[$name] = Permission::updateOrCreate(
                    ['name' => $name],
                    ['resource' => $resource, 'action' => $action, 'module' => $module],
                );
            }

            foreach (RoleEnum::cases() as $roleEnum) {
                $role = Role::updateOrCreate(
                    ['name' => $roleEnum->value],
                    ['description' => str_replace(' ', '', $roleEnum->value).' role'],
                );

                $allowed = self::ROLE_PERMISSIONS[$roleEnum->value] ?? [];

                $rolePermissions = collect($permissions)->filter(function ($permission) use ($allowed) {
                    if (in_array('*', $allowed, true)) {
                        return true;
                    }

                    return in_array($permission->name, $allowed, true)
                        || in_array($permission->resource, $allowed, true);
                });

                $role->permissions()->sync($rolePermissions->pluck('id')->all());
            }
        });
    }
}
