<?php

use App\Console\Commands\EvaluateAlertRules;
use App\Http\Controllers\Ai\AiController;
use App\Http\Controllers\Analytics\AnalyticsController;
use App\Http\Controllers\Audit\AuditController;
use App\Http\Controllers\Auth\MfaController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\DataMigration\DataMigrationController;
use App\Http\Controllers\Evaluation\EvaluationController;
use App\Http\Controllers\Ews\AlertController;
use App\Http\Controllers\Ews\AlertRuleController;
use App\Http\Controllers\Import\ImportController;
use App\Http\Controllers\Integration\IntegrationController;
use App\Http\Controllers\Knowledge\KnowledgeController;
use App\Http\Controllers\Master\GoalController;
use App\Http\Controllers\Master\IndicatorController;
use App\Http\Controllers\Master\MeasurementUnitController;
use App\Http\Controllers\Master\OrganizationController;
use App\Http\Controllers\Master\PeriodController;
use App\Http\Controllers\Master\TargetController;
use App\Http\Controllers\Measurement\EvidenceController;
use App\Http\Controllers\Measurement\PerformanceMeasurementController;
use App\Http\Controllers\Measurement\RealizationController;
use App\Http\Controllers\Notification\NotificationController;
use App\Http\Controllers\Planning\DocumentRevisionController;
use App\Http\Controllers\Planning\IkuApiController;
use App\Http\Controllers\Planning\IkuController;
use App\Http\Controllers\Planning\IkuImportController;
use App\Http\Controllers\Planning\MonitoringMatrixController;
use App\Http\Controllers\Planning\PlanningController;
use App\Http\Controllers\Planning\PlanningDocumentController;
use App\Http\Controllers\Planning\PublicLaporanController;
use App\Http\Controllers\Prediction\PredictionController;
use App\Http\Controllers\Readiness\ReadinessController;
use App\Http\Controllers\Reporting\ReportController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\ThemeController;
use App\Http\Controllers\User\LoginHistoryController;
use App\Http\Controllers\User\ProfileController;
use App\Http\Controllers\User\RoleController;
use App\Http\Controllers\User\UserController;
use App\Http\Controllers\Whatsapp\WhatsappController;
use App\Http\Controllers\Whatsapp\WhatsappWebhookController;
use App\Models\Indicator;
use App\Models\KnowledgeDocument;
use App\Models\Organization;
use App\Models\Realization;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $safeCount = function (string $model): int {
        try {
            return $model::count();
        } catch (Throwable) {
            return 0;
        }
    };
    $safePublicDocs = function (): int {
        try {
            return KnowledgeDocument::query()
                ->where('status', 'published')
                ->where('access', 'public')
                ->count();
        } catch (Throwable) {
            return 0;
        }
    };

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'stats' => [
            'organizations' => $safeCount(Organization::class),
            'indicators' => $safeCount(Indicator::class),
            'realizations' => $safeCount(Realization::class),
            'public_documents' => $safePublicDocs(),
        ],
    ]);
})->name('home');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

// FR-DASH-003: Drill-down per OPD
Route::get('/dashboard/organizations/{organization}', [DashboardController::class, 'drilldown'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.drilldown');

// FR-DASH-011: Export dashboard ke PDF / CSV
Route::get('/dashboard/export', [DashboardController::class, 'export'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard.export');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // FR-IAM-009: Login history pribadi
    Route::get('/profile/login-history', [LoginHistoryController::class, 'index'])->name('profile.login-history');
    // FR-IAM-008: Revoke semua sesi lain
    Route::post('/profile/revoke-sessions', [LoginHistoryController::class, 'revokeOtherSessions'])->name('profile.revoke-sessions');

    // FR-IAM-007: MFA routes
    Route::get('/mfa/setup', [MfaController::class, 'setupShow'])->name('mfa.setup');
    Route::post('/mfa/setup', [MfaController::class, 'setupConfirm'])->name('mfa.setup.confirm');
    Route::get('/mfa/challenge', [MfaController::class, 'challengeShow'])->name('mfa.challenge');
    Route::post('/mfa/challenge', [MfaController::class, 'challengeVerify'])->name('mfa.challenge.verify');
    Route::post('/mfa/disable', [MfaController::class, 'disable'])->name('mfa.disable');

    Route::middleware(['auth:sanctum', 'mfa'])->group(function () {
        Route::get('users/export', [UserController::class, 'export'])->name('users.export');
        Route::resource('users', UserController::class)->except(['show']);
        Route::post('users/bulk-action', [UserController::class, 'bulkAction'])->name('users.bulk-action');
        Route::post('users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
        Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
        // FR-IAM-009: Admin lihat login history user lain
        Route::get('users/{user}/login-history', [LoginHistoryController::class, 'show'])->name('users.login-history');
        // FR-IAM-008: Admin revoke semua session user tertentu
        Route::post('users/{user}/revoke-sessions', [LoginHistoryController::class, 'revokeUser'])->name('users.revoke-sessions');

        Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
        Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->name('roles.edit');
        Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');

        Route::resource('organizations', OrganizationController::class)->except(['show']);
        Route::post('organizations/{organization}/units', [OrganizationController::class, 'storeUnit'])->name('organizations.units.store');
        Route::delete('organizations/{organization}/units/{unit}', [OrganizationController::class, 'destroyUnit'])->name('organizations.units.destroy');

        Route::get('periods', [PeriodController::class, 'index'])->name('periods.index');
        Route::post('periods', [PeriodController::class, 'storePlanningPeriod'])->name('periods.store');
        Route::put('periods/{period}', [PeriodController::class, 'updatePlanningPeriod'])->name('periods.update');
        Route::delete('periods/{period}', [PeriodController::class, 'destroyPlanningPeriod'])->name('periods.destroy');
        Route::post('periods/{period}/measurement-periods', [PeriodController::class, 'storeMeasurementPeriod'])->name('periods.measurement-periods.store');
        Route::post('periods/{period}/generate-quarters', [PeriodController::class, 'generateQuarterlyPeriods'])->name('periods.generate-quarters');
        Route::put('measurement-periods/{period}', [PeriodController::class, 'updateMeasurementPeriod'])->name('measurement-periods.update');
        Route::delete('measurement-periods/{period}', [PeriodController::class, 'destroyMeasurementPeriod'])->name('measurement-periods.destroy');

        Route::resource('units', MeasurementUnitController::class)->only(['index', 'store', 'update']);

        Route::resource('indicators', IndicatorController::class)->except(['show', 'destroy']);
        Route::post('indicators/{indicator}/activate', [IndicatorController::class, 'activate'])->name('indicators.activate');
        Route::post('indicators/{indicator}/archive', [IndicatorController::class, 'archive'])->name('indicators.archive');

        Route::get('goals', [GoalController::class, 'index'])->name('goals.index');
        Route::post('goals', [GoalController::class, 'store'])->name('goals.store');
        Route::put('goals/{goal}', [GoalController::class, 'update'])->name('goals.update');
        Route::delete('goals/{goal}', [GoalController::class, 'destroy'])->name('goals.destroy');
        Route::post('goals/{goal}/objectives', [GoalController::class, 'storeObjective'])->name('goals.objectives.store');
        Route::put('goals/{goal}/objectives/{objective}', [GoalController::class, 'updateObjective'])->name('goals.objectives.update');
        Route::delete('goals/{goal}/objectives/{objective}', [GoalController::class, 'destroyObjective'])->name('goals.objectives.destroy');

        Route::get('targets', [TargetController::class, 'index'])->name('targets.index');
        Route::get('targets/create', [TargetController::class, 'create'])->name('targets.create');
        Route::post('targets', [TargetController::class, 'store'])->name('targets.store');
        Route::put('targets/{target}', [TargetController::class, 'update'])->name('targets.update');

        Route::get('realizations', [RealizationController::class, 'index'])->name('realizations.index');
        Route::get('realizations/create', [RealizationController::class, 'create'])->name('realizations.create');
        Route::post('realizations', [RealizationController::class, 'store'])->name('realizations.store');
        Route::get('realizations/{realization}/edit', [RealizationController::class, 'edit'])->name('realizations.edit');
        Route::put('realizations/{realization}', [RealizationController::class, 'update'])->name('realizations.update');
        Route::post('realizations/{realization}/submit', [RealizationController::class, 'submit'])->name('realizations.submit');
        Route::post('realizations/{realization}/approve', [RealizationController::class, 'approve'])->name('realizations.approve');
        Route::post('realizations/{realization}/revision', [RealizationController::class, 'requestRevision'])->name('realizations.revision');
        // FR-MSR-016: Reopen terkendali
        Route::post('realizations/{realization}/reopen', [RealizationController::class, 'reopen'])->name('realizations.reopen');

        Route::post('realizations/{realization}/evidences', [EvidenceController::class, 'store'])->name('evidences.store');
        Route::get('realizations/{realization}/evidences/{evidence}/download', [EvidenceController::class, 'download'])->name('evidences.download');
        Route::delete('realizations/{realization}/evidences/{evidence}', [EvidenceController::class, 'destroy'])->name('evidences.destroy');

        // Pengukuran Kinerja (Modul 4)
        Route::prefix('measurement')->name('measurement.')->group(function () {
            // 4.3 Realisasi OPD (Masing2 PD)
            Route::get('realization/opd', [PerformanceMeasurementController::class, 'opdIndex'])->name('realization.opd');
            Route::post('realization/opd', [PerformanceMeasurementController::class, 'opdStore'])->name('realization.opd.store');
            Route::put('realization/opd/{item}', [PerformanceMeasurementController::class, 'opdUpdate'])->name('realization.opd.update');
            Route::delete('realization/opd/{item}', [PerformanceMeasurementController::class, 'opdDestroy'])->name('realization.opd.destroy');
            Route::post('realization/opd/batch', [PerformanceMeasurementController::class, 'opdBatch'])->name('realization.opd.batch');

            // 4.4 Monitoring Kinerja Fisik / Output (Masing2 PD)
            Route::get('monitoring/output', [PerformanceMeasurementController::class, 'outputIndex'])->name('monitoring.output');
            Route::post('monitoring/output', [PerformanceMeasurementController::class, 'outputStore'])->name('monitoring.output.store');
            Route::put('monitoring/output/{item}', [PerformanceMeasurementController::class, 'outputUpdate'])->name('monitoring.output.update');
            Route::delete('monitoring/output/{item}', [PerformanceMeasurementController::class, 'outputDestroy'])->name('monitoring.output.destroy');
            Route::post('monitoring/output/batch', [PerformanceMeasurementController::class, 'outputBatch'])->name('monitoring.output.batch');

            // 4.5 Monitoring Kinerja Anggaran (Masing2 PD)
            Route::get('monitoring/budget', [PerformanceMeasurementController::class, 'budgetIndex'])->name('monitoring.budget');
            Route::post('monitoring/budget', [PerformanceMeasurementController::class, 'budgetStore'])->name('monitoring.budget.store');
            Route::put('monitoring/budget/{item}', [PerformanceMeasurementController::class, 'budgetUpdate'])->name('monitoring.budget.update');
            Route::delete('monitoring/budget/{item}', [PerformanceMeasurementController::class, 'budgetDestroy'])->name('monitoring.budget.destroy');
            Route::post('monitoring/budget/batch', [PerformanceMeasurementController::class, 'budgetBatch'])->name('monitoring.budget.batch');

            // Export PDF
            Route::get('realization/opd/export-pdf', [PerformanceMeasurementController::class, 'opdExportPdf'])->name('realization.opd.export-pdf');
            Route::get('monitoring/output/export-pdf', [PerformanceMeasurementController::class, 'outputExportPdf'])->name('monitoring.output.export-pdf');
            Route::get('monitoring/budget/export-pdf', [PerformanceMeasurementController::class, 'budgetExportPdf'])->name('monitoring.budget.export-pdf');
        });

        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::post('reports/upload', [ReportController::class, 'upload'])->name('reports.upload');
        Route::get('reports/preview/{id}', [ReportController::class, 'preview'])->name('reports.preview');
        Route::get('reports/download-file/{id}', [ReportController::class, 'downloadFile'])->name('reports.file-download');
        Route::delete('reports/{id}', [ReportController::class, 'destroy'])->name('reports.destroy');
        Route::post('reports/generate', [ReportController::class, 'generate'])->name('reports.generate');
        Route::get('reports/{report}/download', [ReportController::class, 'download'])->name('reports.download');
        Route::get('reports/{report}/download-pdf', [ReportController::class, 'downloadPdf'])->name('reports.download-pdf');

        Route::get('evaluations', [EvaluationController::class, 'index'])->name('evaluations.index');
        Route::post('evaluations', [EvaluationController::class, 'store'])->name('evaluations.store');
        Route::post('evaluations/sakip', [EvaluationController::class, 'saveSakip'])->name('evaluations.sakip.save');
        Route::post('evaluations/sakip/lhe', [EvaluationController::class, 'uploadLhe'])->name('evaluations.sakip.upload-lhe');
        Route::post('evaluations/pko/indicators', [EvaluationController::class, 'savePkoIndicator'])->name('evaluations.pko.indicators.save');
        Route::delete('evaluations/pko/indicators/{indicator}', [EvaluationController::class, 'deletePkoIndicator'])->name('evaluations.pko.indicators.destroy');
        Route::delete('evaluations/{evaluation}', [EvaluationController::class, 'destroy'])->name('evaluations.destroy');
        Route::get('evaluations/{evaluation}', [EvaluationController::class, 'show'])->name('evaluations.show');
        Route::post('evaluations/{evaluation}/scores', [EvaluationController::class, 'storeScore'])->name('evaluations.scores.store');
        Route::post('evaluations/{evaluation}/recommendations', [EvaluationController::class, 'storeRecommendation'])->name('evaluations.recommendations.store');
        // FR-EVL-009: Verifikasi tindak lanjut
        Route::post('evaluations/{evaluation}/recommendations/{recommendation}/followups', [EvaluationController::class, 'storeFollowup'])->name('evaluations.followups.store');
        Route::patch('evaluations/{evaluation}/recommendations/{recommendation}/followups/{followup}/verify', [EvaluationController::class, 'verifyFollowup'])->name('evaluations.followups.verify');
        // FR-EVL-010: Update status rekomendasi
        Route::patch('evaluations/{evaluation}/recommendations/{recommendation}/status', [EvaluationController::class, 'updateRecommendationStatus'])->name('evaluations.recommendations.status');
        // FR-EVL-004: Evidence review
        Route::post('evaluations/{evaluation}/review-evidence', [EvaluationController::class, 'reviewEvidence'])->name('evaluations.evidence.review');
        // FR-EVL-011: Histori evaluasi
        Route::get('evaluations/{evaluation}/history', [EvaluationController::class, 'history'])->name('evaluations.history');
        // FR-EVL-012: Export PDF evaluasi
        Route::get('evaluations/{evaluation}/export-pdf', [EvaluationController::class, 'exportPdf'])->name('evaluations.export-pdf');
        // Export PDF Rekap SAKIP & PKO
        Route::get('evaluations/export/sakip-pdf', [EvaluationController::class, 'exportSakipPdf'])->name('evaluations.export-sakip-pdf');
        Route::get('evaluations/export/pko-pdf', [EvaluationController::class, 'exportPkoPdf'])->name('evaluations.export-pko-pdf');

        Route::get('alerts', [AlertController::class, 'index'])->name('alerts.index');
        Route::post('alerts/{alert}/acknowledge', [AlertController::class, 'acknowledge'])->name('alerts.acknowledge');
        Route::post('alerts/{alert}/resolve', [AlertController::class, 'resolve'])->name('alerts.resolve');
        // FR-EWS: manual trigger — delegate ke EvaluateAlertRules command (method generate tidak ada di controller)
        Route::post('ews/generate', function () {
            Artisan::call(EvaluateAlertRules::class);

            return redirect()->route('alerts.index')->with('success', 'EWS evaluation selesai dijalankan.');
        })->name('ews.generate');
        Route::get('alert-rules', [AlertRuleController::class, 'index'])->name('alert-rules.index');
        Route::post('alert-rules', [AlertRuleController::class, 'store'])->name('alert-rules.store');
        Route::post('alert-rules/{rule}/toggle', [AlertRuleController::class, 'toggle'])->name('alert-rules.toggle');
        Route::delete('alert-rules/{rule}', [AlertRuleController::class, 'destroy'])->name('alert-rules.destroy');

        // Audit Trail — BRD §20
        Route::get('audit', [AuditController::class, 'index'])->name('audit.index');
        Route::get('audit/export', [AuditController::class, 'export'])->name('audit.export');

        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
        Route::post('notifications/send', [NotificationController::class, 'send'])->name('notifications.send');

        Route::get('imports', [ImportController::class, 'index'])->name('imports.index');
        Route::post('imports/upload', [ImportController::class, 'upload'])->middleware('throttle:import')->name('imports.upload');
        Route::get('imports/batches/{batch}', [ImportController::class, 'preview'])->name('imports.preview');
        Route::post('imports/batches/{batch}/commit', [ImportController::class, 'commit'])->name('imports.commit');
        Route::post('imports/batches/{batch}/cancel', [ImportController::class, 'cancel'])->name('imports.cancel');
        Route::get('imports/batches/{batch}/report', [ImportController::class, 'report'])->name('imports.report');
        // FR-MD-010: Download template Excel untuk setiap tipe import
        Route::get('imports/template', [ImportController::class, 'downloadTemplate'])->name('imports.template');

        Route::get('migrations', [DataMigrationController::class, 'index'])->name('migrations.index');
        Route::post('migrations', [DataMigrationController::class, 'store'])->name('migrations.store');
        Route::get('migrations/{migration}', [DataMigrationController::class, 'show'])->name('migrations.show');
        Route::post('migrations/{migration}/validate', [DataMigrationController::class, 'validateSteps'])->name('migrations.validate');
        Route::post('migrations/{migration}/reconcile', [DataMigrationController::class, 'reconcile'])->name('migrations.reconcile');
        Route::post('migrations/{migration}/approve', [DataMigrationController::class, 'approve'])->name('migrations.approve');
        Route::post('migrations/{migration}/load', [DataMigrationController::class, 'load'])->name('migrations.load');
        Route::get('migrations/{migration}/report', [DataMigrationController::class, 'report'])->name('migrations.report');

        Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics.index');
        Route::get('analytics/export', [AnalyticsController::class, 'export'])->name('analytics.export');
        Route::get('analytics/export-pdf', [AnalyticsController::class, 'exportPdf'])->name('analytics.export-pdf');
        // FR-MSR-014: Data completeness monitoring per OPD
        Route::get('analytics/completeness', [AnalyticsController::class, 'completeness'])->name('analytics.completeness');
        // FR-MSR-015: Monitoring keterlambatan pengiriman realisasi
        Route::get('analytics/late-submissions', [AnalyticsController::class, 'lateSubmissions'])->name('analytics.late-submissions');

        Route::get('knowledge', [KnowledgeController::class, 'index'])->name('knowledge.index');
        Route::get('knowledge/create', [KnowledgeController::class, 'create'])->name('knowledge.create');
        Route::post('knowledge', [KnowledgeController::class, 'store'])->name('knowledge.store');
        Route::get('knowledge/{document}/edit', [KnowledgeController::class, 'edit'])->name('knowledge.edit');
        Route::put('knowledge/{document}', [KnowledgeController::class, 'update'])->name('knowledge.update');
        Route::post('knowledge/{document}/publish', [KnowledgeController::class, 'publish'])->name('knowledge.publish');
        Route::post('knowledge/{document}/unpublish', [KnowledgeController::class, 'unpublish'])->name('knowledge.unpublish');
        Route::delete('knowledge/{document}', [KnowledgeController::class, 'destroy'])->name('knowledge.destroy');
        Route::get('knowledge/{document}/download', [KnowledgeController::class, 'download'])->name('knowledge.download');

        Route::get('ai', [AiController::class, 'index'])->name('ai.index');
        Route::post('ai/executive-summary', [AiController::class, 'executiveSummary'])->middleware('throttle:ai')->name('ai.executive-summary');
        Route::post('ai/insight', [AiController::class, 'insight'])->middleware('throttle:ai')->name('ai.insight');
        Route::post('ai/prediction', [AiController::class, 'prediction'])->middleware('throttle:ai')->name('ai.prediction');
        Route::post('ai/recommendation', [AiController::class, 'recommendation'])->middleware('throttle:ai')->name('ai.recommendation');
        Route::post('ai/opd-status', [AiController::class, 'opdStatus'])->middleware('throttle:ai')->name('ai.opd-status');
        Route::post('ai/chat', [AiController::class, 'chat'])->middleware('throttle:ai')->name('ai.chat');
        Route::post('ai/executive-brief', [AiController::class, 'executiveBrief'])->middleware('throttle:ai')->name('ai.executive-brief');
        Route::post('ai/export-pdf', [AiController::class, 'exportPdf'])->name('ai.export-pdf');
        Route::post('ai/insights/{insight}/review', [AiController::class, 'review'])->name('ai.insights.review');
        Route::get('ai/templates', [AiController::class, 'templates'])->name('ai.templates');
        Route::post('ai/templates', [AiController::class, 'storeTemplate'])->name('ai.templates.store');
        Route::post('ai/templates/{template}/activate', [AiController::class, 'activateTemplate'])->name('ai.templates.activate');
        // MOD-AI-006: Manajemen kuota harian per OPD (Super Admin only)
        Route::get('ai/quota', [AiController::class, 'quotaIndex'])->name('ai.quota.index');
        Route::put('ai/quota/{organization}', [AiController::class, 'quotaUpdate'])->name('ai.quota.update');

        Route::get('predictions', [PredictionController::class, 'index'])->name('predictions.index');
        Route::post('predictions/generate', [PredictionController::class, 'generate'])->name('predictions.generate');

        Route::get('integrations', [IntegrationController::class, 'index'])->name('integrations.index');

        Route::get('readiness', [ReadinessController::class, 'index'])->name('readiness.index');
        Route::post('readiness/{item}/update', [ReadinessController::class, 'update'])->name('readiness.update');

        // Planning Module (FR-PLN)
        Route::prefix('planning')->name('planning.')->group(function () {
            Route::get('/', [PlanningController::class, 'index'])->name('index');

            // Documents
            Route::get('documents', [PlanningController::class, 'documents'])->name('documents.index');
            Route::post('documents', [PlanningController::class, 'storeDocument'])->name('documents.store');
            Route::match(['put', 'post'], 'documents/{document}', [PlanningController::class, 'updateDocument'])->name('documents.update');
            Route::post('documents/{document}/upload', [PlanningController::class, 'uploadDocument'])->name('documents.upload');
            Route::post('documents/{document}/submit', [PlanningController::class, 'submitDocument'])->name('documents.submit');
            Route::post('documents/{document}/approve', [PlanningController::class, 'approveDocument'])->name('documents.approve');
            Route::post('documents/{document}/reject', [PlanningController::class, 'rejectDocument'])->name('documents.reject');
            Route::post('documents/{document}/lock', [PlanningController::class, 'lockDocument'])->name('documents.lock');
            Route::get('documents/{document}/preview', [PlanningController::class, 'previewDocument'])->name('documents.preview');
            Route::get('documents/{document}/download', [PlanningController::class, 'downloadDocument'])->name('documents.download');
            Route::delete('documents/{document}', [PlanningController::class, 'destroyDocument'])->name('documents.destroy');

            // Agreements (Perjanjian Kinerja)
            Route::get('agreements', [PlanningController::class, 'agreements'])->name('agreements.index');
            Route::post('agreements', [PlanningController::class, 'storeAgreement'])->name('agreements.store');
            Route::put('agreements/{agreement}', [PlanningController::class, 'updateAgreement'])->name('agreements.update');
            Route::post('agreements/{agreement}/upload', [PlanningController::class, 'uploadAgreement'])->name('agreements.upload');
            Route::post('agreements/{agreement}/submit', [PlanningController::class, 'submitAgreement'])->name('agreements.submit');
            Route::post('agreements/{agreement}/approve', [PlanningController::class, 'approveAgreement'])->name('agreements.approve');
            Route::post('agreements/{agreement}/reject', [PlanningController::class, 'rejectAgreement'])->name('agreements.reject');
            Route::post('agreements/{agreement}/lock', [PlanningController::class, 'lockAgreement'])->name('agreements.lock');
            Route::get('agreements/{agreement}/download', [PlanningController::class, 'downloadAgreement'])->name('agreements.download');
            Route::delete('agreements/{agreement}', [PlanningController::class, 'destroyAgreement'])->name('agreements.destroy');

            // Action Plans (Rencana Aksi)
            Route::get('action-plans', [PlanningController::class, 'actionPlans'])->name('action-plans.index');
            Route::post('action-plans', [PlanningController::class, 'storeActionPlan'])->name('action-plans.store');
            Route::put('action-plans/{plan}', [PlanningController::class, 'updateActionPlan'])->name('action-plans.update');
            Route::post('action-plans/{plan}/advance', [PlanningController::class, 'advanceActionPlan'])->name('action-plans.advance');
            Route::match(['put', 'post'], 'action-plans/{plan}/progress', [PlanningController::class, 'advanceActionPlan'])->name('action-plans.progress');
            Route::delete('action-plans/{plan}', [PlanningController::class, 'destroyActionPlan'])->name('action-plans.destroy');

            // Trees (Pohon Kinerja) — FR-PLN-008, 009 (Master CRUD & Tree Canvas Builder)
            Route::get('trees', [PlanningController::class, 'trees'])->name('trees.index');
            Route::get('trees/builder/macro', [PlanningController::class, 'treeMacroBuilder'])->name('trees.builder.macro');
            Route::get('trees/{tree}/builder', [PlanningController::class, 'treeBuilder'])->name('trees.builder');
            Route::post('trees', [PlanningController::class, 'storeTree'])->name('trees.store');
            Route::put('trees/{tree}', [PlanningController::class, 'updateTree'])->name('trees.update');
            Route::delete('trees/{tree}', [PlanningController::class, 'destroyTree'])->name('trees.destroy');

            // Cascading — FR-PLN-010
            Route::get('cascading', [PlanningController::class, 'cascading'])->name('cascading.index');
            Route::post('cascading', [PlanningController::class, 'storeCascading'])->name('cascading.store');
            Route::delete('cascading/{cascading}', [PlanningController::class, 'destroyCascading'])->name('cascading.destroy');

            // Crosscutting — FR-PLN-011
            Route::get('crosscutting', [PlanningController::class, 'crosscutting'])->name('crosscutting.index');
            Route::post('crosscutting', [PlanningController::class, 'storeCrosscutting'])->name('crosscutting.store');
            Route::delete('crosscutting/{crosscutting}', [PlanningController::class, 'destroyCrosscutting'])->name('crosscutting.destroy');

            // ── IKU (Indikator Kinerja Utama) — FINAL SPEC ────────────────────────
            Route::prefix('iku')->name('iku.')->group(function () {
                Route::get('/', [IkuController::class, 'index'])->name('index');
                Route::get('/create', [IkuController::class, 'create'])->name('create');
                Route::post('/', [IkuController::class, 'store'])->name('store');
                Route::get('/{iku}', [IkuController::class, 'show'])->name('show');
                Route::get('/{iku}/edit', [IkuController::class, 'edit'])->name('edit');
                Route::put('/{iku}', [IkuController::class, 'update'])->name('update');
                Route::delete('/{iku}', [IkuController::class, 'destroy'])->name('destroy');

                // Workflow transitions
                Route::post('/{iku}/submit', [IkuController::class, 'submit'])->name('submit');
                Route::post('/{iku}/review', [IkuController::class, 'review'])->name('review');
                Route::post('/{iku}/return', [IkuController::class, 'returnRevision'])->name('return');
                Route::post('/{iku}/finalize', [IkuController::class, 'finalize'])->name('finalize');
                Route::post('/{iku}/deactivate', [IkuController::class, 'deactivate'])->name('deactivate');

                // Export
                Route::get('/export/excel', [IkuController::class, 'exportExcel'])->name('export.excel');
                Route::get('/export/pdf-rekap', [IkuController::class, 'exportPdfRekap'])->name('export.pdf-rekap');
                Route::get('/{iku}/export/pdf', [IkuController::class, 'exportPdf'])->name('export.pdf');

                // Import
                Route::post('/import/upload', [IkuImportController::class, 'upload'])->name('import.upload');
                Route::post('/import/commit', [IkuImportController::class, 'commit'])->name('import.commit');
                Route::get('/import/template', [IkuImportController::class, 'downloadTemplate'])->name('import.template');
            });

            // Risks (Manajemen Risiko) — FR-PLN-016
            Route::get('risks', [PlanningController::class, 'risks'])->name('risks.index');
            Route::post('risks', [PlanningController::class, 'storeRisk'])->name('risks.store');
            Route::put('risks/{risk}', [PlanningController::class, 'updateRisk'])->name('risks.update');
            Route::delete('risks/{risk}', [PlanningController::class, 'destroyRisk'])->name('risks.destroy');

            // FR-PLN-021: Export pohon kinerja (PDF / CSV)
            Route::get('trees/export', [PlanningController::class, 'exportTree'])->name('trees.export');
        });
    });

    // WhatsApp AI Chatbot — FR-WA
    Route::prefix('whatsapp')->name('whatsapp.')->group(function () {
        Route::get('/', [WhatsappController::class, 'index'])->name('index');
        Route::post('/register', [WhatsappController::class, 'register'])->name('register');
        Route::post('/{whatsapp}/verify', [WhatsappController::class, 'verify'])->name('verify');
        Route::post('/{whatsapp}/toggle', [WhatsappController::class, 'toggle'])->name('toggle');
        Route::delete('/{whatsapp}', [WhatsappController::class, 'destroy'])->name('destroy');
        Route::post('/handoffs/{handoff}/resolve', [WhatsappController::class, 'resolveHandoff'])->name('handoffs.resolve');
    });

    // Settings (Konfigurasi Sistem)
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingsController::class, 'index'])->name('index');
        Route::post('/upload-asset', [SettingsController::class, 'uploadAsset'])->name('upload-asset');
        Route::post('/slider-logo/upload', [SettingsController::class, 'uploadSliderLogo'])->name('slider-logo.upload');
        Route::post('/slider-logos', [SettingsController::class, 'saveSliderLogos'])->name('slider-logos.save');
        Route::post('/batch', [SettingsController::class, 'updateBatch'])->name('batch');
        Route::put('/{config}', [SettingsController::class, 'update'])->name('update');
        Route::post('/{config}/reset', [SettingsController::class, 'reset'])->name('reset');
    });

    // Dokumen Perencanaan: RPJMD / Renstra / Renja (FR-PLN-001/002/003)
    // Menggunakan prefix nama 'planning.docs' untuk menghindari konflik dengan
    // route 'planning.documents.*' yang sudah didaftarkan di PlanningController group di atas.
    Route::resource('planning/docs', PlanningDocumentController::class)
        ->names('planning.docs')
        ->except(['create', 'edit', 'show']);
    Route::post('planning/docs/{doc}/approve', [PlanningDocumentController::class, 'approve'])
        ->name('planning.docs.approve');

    // Monitoring Matrix kelengkapan dokumen OPD (MOD-003 / AC-007)
    // Hanya Super Admin — gated by 'view-planning-docs' di controller
    Route::get('planning/monitoring-matrix', [MonitoringMatrixController::class, 'index'])
        ->name('planning.monitoring-matrix');

    // BR-006: Catatan revisi dokumen (Super Admin → OPD, satu arah)
    // Super Admin kirim catatan → Admin OPD notif + revisi wajib
    Route::post('planning/documents/{document}/revisions', [DocumentRevisionController::class, 'store'])
        ->name('planning.documents.revisions.store');
    Route::patch('planning/revisions/{revision}/acknowledge', [DocumentRevisionController::class, 'acknowledge'])
        ->name('planning.revisions.acknowledge');
    Route::patch('planning/revisions/{revision}/resolve', [DocumentRevisionController::class, 'resolve'])
        ->name('planning.revisions.resolve');

    // G-14: Upload berkas statis pohon kinerja (AC-015 fallback)
    Route::post('planning/trees/upload-static', [PlanningController::class, 'uploadStaticTree'])
        ->name('planning.trees.upload-static');

    // G-18: Halaman cetak pohon kinerja horizontal (tanpa sidebar)
    Route::get('planning/trees/print', [PlanningController::class, 'printTree'])
        ->name('planning.trees.print');

    // API IKU Cascaded Dropdown (Goals, Objectives, Period-Years)
    Route::prefix('api/v1/iku')->group(function () {
        Route::get('/goals', [IkuApiController::class, 'goals']);
        Route::get('/objectives', [IkuApiController::class, 'objectives']);
        Route::get('/period-years', [IkuApiController::class, 'periodYears']);
    });
    Route::prefix('api/iku')->group(function () {
        Route::get('/goals', [IkuApiController::class, 'goals']);
        Route::get('/objectives', [IkuApiController::class, 'objectives']);
        Route::get('/period-years', [IkuApiController::class, 'periodYears']);
    });
});

Route::prefix('informasi')->group(function () {
    Route::get('/', [KnowledgeController::class, 'publicIndex'])->name('knowledge.public.index');
    Route::get('{document}/download', [KnowledgeController::class, 'publicDownload'])->name('knowledge.public.download');
    Route::get('{document}', [KnowledgeController::class, 'publicShow'])->name('knowledge.public.show');
});

Route::redirect('/regulasi', '/informasi?kategori=regulasi');

// ── Portal Laporan Publik — MOD-003 (Baseline) ─────────────────────────────
// Dokumen perencanaan OPD yang sudah approved, bisa diakses publik tanpa login.
// Filter: kategori (perencanaan/pengukuran/pelaporan/evaluasi), OPD, tahun.
// Navigasi tab tanpa reload halaman (Inertia preserveState di frontend).
Route::prefix('laporan')->name('laporan.publik.')->group(function () {
    Route::get('/', [PublicLaporanController::class, 'index'])->name('index');
    Route::get('pohon-kinerja', [PublicLaporanController::class, 'pohonKinerja'])->name('pohon-kinerja');
    Route::get('{id}/download', [PublicLaporanController::class, 'download'])->name('download');
});

// WhatsApp Webhook — public endpoint, verified via X-Webhook-Secret header (FR-WA-001)
Route::post('/whatsapp/webhook', WhatsappWebhookController::class)->name('whatsapp.webhook');

// Theme — hanya Super Admin yang dapat mengubah (auth required)
Route::middleware(['auth'])->group(function () {
    Route::post('/theme/update', [ThemeController::class, 'update'])->name('theme.update');
    Route::post('/theme/reset', [ThemeController::class, 'reset'])->name('theme.reset');
});

// ── Health Check (FR-OPS-MON) ──────────────────────────────────────────────
// Endpoint publik untuk uptime monitoring eksternal (UptimeRobot, dll.).
// Tidak memerlukan autentikasi. Tidak dicatat ke access log (via Nginx config).
Route::get('/health', function () {
    $checks = [];
    $status = 'ok';

    // Cek koneksi database
    try {
        DB::connection()->getPdo();
        $checks['database'] = 'ok';
    } catch (Throwable) {
        $checks['database'] = 'fail';
        $status = 'degraded';
    }

    // Cek queue driver terkonfigurasi (tidak test koneksi agar cepat)
    $checks['queue'] = config('queue.default', 'sync') !== 'sync' ? 'ok' : 'warn';

    // Cek storage writable
    try {
        $testFile = storage_path('framework/.health-check');
        file_put_contents($testFile, now()->toISOString());
        unlink($testFile);
        $checks['storage'] = 'ok';
    } catch (Throwable) {
        $checks['storage'] = 'fail';
        $status = 'degraded';
    }

    $httpStatus = $status === 'ok' ? 200 : 503;

    return response()->json([
        'status' => $status,
        'app' => config('app.name'),
        'environment' => config('app.env'),
        'checks' => $checks,
        'timestamp' => now()->toISOString(),
    ], $httpStatus);
})->name('health');

// ── SEO Dynamic XML Sitemap ──────────────────────────────────────────────────
Route::get('/sitemap.xml', function () {
    $baseUrl = url('/');

    $publicDocs = KnowledgeDocument::query()
        ->where('status', 'published')
        ->where('access', 'public')
        ->select('id', 'updated_at')
        ->orderByDesc('updated_at')
        ->get();

    $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

    // Beranda
    $xml .= "    <url>\n";
    $xml .= "        <loc>{$baseUrl}</loc>\n";
    $xml .= "        <changefreq>daily</changefreq>\n";
    $xml .= "        <priority>1.0</priority>\n";
    $xml .= "    </url>\n";

    // Pusat Informasi Publik
    $xml .= "    <url>\n";
    $xml .= "        <loc>{$baseUrl}/informasi</loc>\n";
    $xml .= "        <changefreq>daily</changefreq>\n";
    $xml .= "        <priority>0.9</priority>\n";
    $xml .= "    </url>\n";

    // Portal Laporan Kinerja Publik
    $xml .= "    <url>\n";
    $xml .= "        <loc>{$baseUrl}/laporan</loc>\n";
    $xml .= "        <changefreq>daily</changefreq>\n";
    $xml .= "        <priority>0.9</priority>\n";
    $xml .= "    </url>\n";

    // Pohon Kinerja Publik
    $xml .= "    <url>\n";
    $xml .= "        <loc>{$baseUrl}/laporan/pohon-kinerja</loc>\n";
    $xml .= "        <changefreq>weekly</changefreq>\n";
    $xml .= "        <priority>0.8</priority>\n";
    $xml .= "    </url>\n";

    // Detail Dokumen Informasi Publik
    foreach ($publicDocs as $doc) {
        $lastmod = $doc->updated_at ? $doc->updated_at->toIso8601String() : now()->toIso8601String();
        $xml .= "    <url>\n";
        $xml .= "        <loc>{$baseUrl}/informasi/{$doc->id}</loc>\n";
        $xml .= "        <lastmod>{$lastmod}</lastmod>\n";
        $xml .= "        <changefreq>weekly</changefreq>\n";
        $xml .= "        <priority>0.7</priority>\n";
        $xml .= "    </url>\n";
    }

    $xml .= '</urlset>';

    return response($xml, 200)->header('Content-Type', 'application/xml');
})->name('sitemap');

require __DIR__.'/auth.php';
