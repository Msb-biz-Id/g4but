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

        // IKU (Indikator Kinerja Utama) — FINAL SPEC
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

        // Reporting
        ['report', 'view', 'reporting'],
        ['report', 'generate', 'reporting'],
        ['report', 'export_pdf', 'reporting'],
        ['report', 'export_xlsx', 'reporting'],
        ['report', 'export_csv', 'reporting'],
        ['dashboard', 'view', 'reporting'],

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
        ['alert', 'view', 'ews'],
        ['alert', 'acknowledge', 'ews'],
        ['alert', 'resolve', 'ews'],
        ['alert_rule', 'view', 'ews'],
        ['alert_rule', 'manage', 'ews'],

        // Notification
        ['notification', 'view', 'notification'],
        ['notification', 'send', 'notification'],

        // Audit
        ['audit_log', 'view', 'audit'],

        // Knowledge
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
     * Pemetaan permission ke role sesuai TUPOKSI SAKIP.
     * Format: bisa berupa exact permission "resource:action" atau wildcard resource "*".
     *
     * @var array<string, list<string>>
     */
    private const ROLE_PERMISSIONS = [
        RoleEnum::SuperAdmin->value => ['*'],

        RoleEnum::AdminProvinsi->value => [
            // Master Data & IAM se-Provinsi
            'user', 'role', 'permission', 'organization', 'organization_unit', 'planning_period',
            'measurement_period', 'indicator', 'unit', 'reference', 'import', 'migration',
            // Planning & IKU
            'goal', 'objective', 'target', 'performance_node', 'agreement', 'action_plan', 'risk',
            'planning:submit', 'planning:review', 'planning:approve',
            'iku:view', 'iku:create', 'iku:update', 'iku:submit', 'iku:review', 'iku:finalize',
            'iku:deactivate', 'iku:delete', 'iku:export', 'iku:import',
            // Measurement & Reporting (Biro Organisasi)
            'realization:view', 'realization:create', 'realization:update', 'realization:submit',
            'evidence:view', 'evidence:upload', 'evidence:download',
            'report', 'dashboard:view',
            // Pengelolaan Evaluasi SAKIP se-Provinsi (Biro Organisasi / Tim Evaluator)
            'evaluation:view', 'evaluation:manage', 'evaluation:score', 'evaluation:submit',
            'recommendation:view', 'recommendation:manage', 'followup:view',
            'alert', 'alert_rule', 'notification', 'audit_log:view', 'knowledge', 'ai', 'config',
            'integration',
        ],

        RoleEnum::AdminOpd->value => [
            // IAM internal OPD — dibatasi mengelola akun staf/pejabat OPD sendiri
            'user:view', 'user:create', 'user:update', 'user:reset_password',
            // Perencanaan Kinerja OPD
            'goal:view', 'goal:manage', 'objective:view', 'objective:manage',
            'target:view', 'target:manage', 'performance_node:view', 'performance_node:manage',
            'agreement:view', 'agreement:manage', 'action_plan:view', 'action_plan:manage',
            'risk:view', 'risk:manage', 'planning:submit',
            // IKU OPD (input & submit, review/finalize adalah wewenang Bappeda)
            'iku:view', 'iku:create', 'iku:update', 'iku:submit', 'iku:export', 'iku:import',
            // Pengukuran & Realisasi internal OPD (Input, Update, Submit & Evidence)
            'realization:view', 'realization:create', 'realization:update', 'realization:submit',
            'evidence:view', 'evidence:upload', 'evidence:download',
            // Pelaporan Internal OPD
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            'dashboard:view',
            // Evaluasi SAKIP — OPD melihat hasil evaluasi, mengelola SAKIP & PKO OPD-nya sendiri, serta mengisi Tindak Lanjut Rekomendasi (followup)
            'evaluation:view', 'evaluation:manage', 'recommendation:view', 'followup:view', 'followup:manage',
            // EWS, Notifikasi, Knowledge, AI
            'alert:view', 'alert:acknowledge', 'notification:view', 'notification:send',
            'knowledge:view', 'ai:use',
        ],

        RoleEnum::OperatorOpd->value => [
            // Perencanaan Kinerja OPD (Maker / Input Dokumen)
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'action_plan:view', 'action_plan:manage', 'risk:view',
            'planning:submit',
            // IKU (Input Draft & Submit)
            'iku:view', 'iku:create', 'iku:update', 'iku:submit', 'iku:export',
            // Pengukuran Kinerja (Maker — Input, Edit Draft, Submit & Upload Evidence)
            // STRICTLY NO realization:approve / reject (Maker-Checker segregation)
            'realization:view', 'realization:create', 'realization:update', 'realization:submit',
            'evidence:view', 'evidence:upload', 'evidence:download',
            // Pelaporan & Evaluasi OPD (Read-only)
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx',
            'evaluation:view', 'recommendation:view', 'followup:view',
            // Notifikasi, Pusat Informasi, Dashboard
            'notification:view', 'knowledge:view', 'dashboard:view',
        ],

        RoleEnum::ValidatorOpd->value => [
            // Perencanaan Kinerja OPD (Checker / Review)
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'action_plan:view', 'risk:view',
            // IKU
            'iku:view', 'iku:export',
            // Pengukuran Kinerja (Checker — Verifikasi, Approve, Reject, Minta Revisi)
            // STRICTLY NO realization:create / update (tidak menginput data teknis)
            'realization:view', 'realization:approve', 'realization:reject', 'realization:revision',
            'evidence:view', 'evidence:download',
            // Pelaporan & Evaluasi OPD (Read-only)
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx',
            'evaluation:view', 'recommendation:view', 'followup:view',
            // Notifikasi, Pusat Informasi, Dashboard
            'notification:view', 'notification:send', 'knowledge:view', 'dashboard:view',
        ],

        RoleEnum::KepalaOpd->value => [
            'dashboard:view', 'ai:use',
            // Pengesahan Perjanjian Kinerja OPD
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'agreement:approve', 'action_plan:view', 'risk:view',
            'iku:view', 'iku:export',
            // Monitoring Realisasi Kinerja OPD
            'realization:view', 'evidence:view', 'evidence:download',
            // Pelaporan OPD
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            // Monitoring Evaluasi & Tindak Lanjut LHE
            'evaluation:view', 'recommendation:view', 'followup:view', 'followup:manage',
            // EWS, Notifikasi, Pusat Informasi
            'alert:view', 'alert:acknowledge', 'notification:view', 'knowledge:view',
        ],

        RoleEnum::EvaluatorProvinsi->value => [
            'dashboard:view', 'ai:use',
            // Asistensi, Monitoring & Review Perencanaan Seluruh OPD
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'action_plan:view', 'risk:view', 'planning:review',
            // Review & Finalisasi IKU OPD se-Provinsi
            'iku:view', 'iku:review', 'iku:finalize', 'iku:export',
            // Monitoring Realisasi & Evidence Seluruh OPD
            'realization:view', 'evidence:view', 'evidence:download',
            // Laporan Kinerja se-Provinsi
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            // Tim Evaluator SAKIP: Input Nilai LKE, 4 Komponen SAKIP, Rekomendasi, LHE, TL
            'evaluation:view', 'evaluation:manage', 'evaluation:score', 'evaluation:submit',
            'recommendation:view', 'recommendation:manage', 'followup:view', 'followup:manage',
            // EWS, Notifikasi, Pusat Informasi
            'alert:view', 'alert:acknowledge', 'notification:view', 'notification:send',
            'knowledge:view',
        ],

        RoleEnum::Inspektorat->value => [
            'dashboard:view', 'ai:use',
            // Pengawasan Perencanaan Seluruh OPD
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'action_plan:view', 'risk:view', 'risk:manage', 'planning:review',
            'iku:view', 'iku:export',
            // Pengawasan Pengukuran & Realisasi
            'realization:view', 'realization:revision', 'evidence:view', 'evidence:download',
            // Wewenang Khusus APIP: Evaluasi SAKIP Independen, Nilai AKIP, LHE, Verifikasi TL
            'evaluation:view', 'evaluation:manage', 'evaluation:score', 'evaluation:submit',
            'recommendation:view', 'recommendation:manage',
            'followup:view', 'followup:verify',
            // Pelaporan, Audit Trail Log, EWS, Notifikasi, Pusat Informasi
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            'audit_log:view',
            'alert:view', 'alert:acknowledge', 'notification:view', 'notification:send',
            'knowledge:view',
        ],

        RoleEnum::PimpinanProvinsi->value => [
            // Executive Decision Maker (Gubernur, Wagub, Sekda) — Read-Only Eksekutif
            'dashboard:view', 'ai:use',
            // Monitoring Perencanaan Seluruh OPD & Matriks Monitoring
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'action_plan:view', 'planning:review',
            'iku:view', 'iku:export',
            // Monitoring Realisasi & Evidence
            'realization:view', 'evidence:view', 'evidence:download',
            // Pelaporan & Evaluasi Eksekutif
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            'evaluation:view', 'recommendation:view', 'followup:view',
            // EWS, Notifikasi, Pusat Informasi
            'alert:view', 'alert:acknowledge', 'notification:view',
            'knowledge:view',
        ],

        RoleEnum::Auditor->value => [
            // Pemeriksa Eksternal (BPK, BPKP, KemenPAN-RB) — 100% Read-Only Pemeriksaan
            'dashboard:view',
            // Perencanaan (Read-Only)
            'goal:view', 'objective:view', 'target:view', 'performance_node:view',
            'agreement:view', 'action_plan:view', 'risk:view',
            'iku:view', 'iku:export',
            // Realisasi & Evidence (Read-Only)
            'realization:view', 'evidence:view', 'evidence:download',
            // Pelaporan & Evaluasi (Read-Only)
            'report:view', 'report:generate', 'report:export_pdf', 'report:export_xlsx', 'report:export_csv',
            'evaluation:view', 'recommendation:view', 'followup:view',
            // Audit Log & Pusat Informasi
            'audit_log:view', 'knowledge:view',
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

                    // Cocok jika match exact "resource:action" atau match nama resource
                    return in_array($permission->name, $allowed, true)
                        || in_array($permission->resource, $allowed, true);
                });

                $role->permissions()->sync($rolePermissions->pluck('id')->all());
            }
        });
    }
}
