<?php

namespace App\Http\Controllers\Audit;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    private const MODULE_MAP = [
        'organization' => 'Master Data',
        'organization_unit' => 'Master Data',
        'planning_period' => 'Master Data',
        'measurement_period' => 'Master Data',
        'indicator' => 'Master Data',
        'measurement_unit' => 'Master Data',
        'reference' => 'Master Data',
        'planning_document' => 'Perencanaan',
        'goal' => 'Perencanaan',
        'objective' => 'Perencanaan',
        'indicator_target' => 'Perencanaan',
        'action_plan' => 'Perencanaan',
        'cascading' => 'Perencanaan',
        'crosscutting' => 'Perencanaan',
        'risk' => 'Perencanaan',
        'agreement' => 'Perencanaan',
        'realization' => 'Pengukuran',
        'evidence' => 'Pengukuran',
        'report' => 'Pelaporan',
        'dashboard' => 'Pelaporan',
        'evaluation' => 'Evaluasi',
        'recommendation' => 'Evaluasi',
        'followup' => 'Evaluasi',
        'user' => 'Auth / Login',
        'role' => 'Auth / Login',
        'permission' => 'Auth / Login',
        'knowledge_document' => 'Pusat Informasi',
        'alert' => 'Early Warning',
        'alert_rule' => 'Early Warning',
        'notification' => 'Early Warning',
        'system_setting' => 'Konfigurasi',
        'setting' => 'Konfigurasi',
        'config' => 'Konfigurasi',
        'ai_insight' => 'AI Assistant',
        'data_migration' => 'Migrasi Data',
        'import_batch' => 'Import Data',
    ];

    public function index(Request $request): InertiaResponse
    {
        $this->authorize('view-audit');

        $defaultDateFrom = now()->subDays(30)->format('Y-m-d');
        $defaultDateTo = now()->format('Y-m-d');

        $dateFrom = $request->filled('date_from') ? $request->date_from : $defaultDateFrom;
        $dateTo = $request->filled('date_to') ? $request->date_to : $defaultDateTo;

        $user = $request->user();
        $query = $this->buildQuery($request, $user, $dateFrom, $dateTo);

        // 30 days total count for current scope
        $scopeBase = AuditLog::where('created_at', '>=', now()->subDays(30));
        if ($this->shouldScopeToOrganization($user)) {
            $orgIds = $user->organizations->pluck('id')->all();
            $scopeBase->where(function ($q) use ($user, $orgIds) {
                $q->whereIn('organization_id', $orgIds)
                    ->orWhere('actor_id', $user->id);
            });
        }
        $totalEntries = $scopeBase->count();

        $perPage = (int) $request->input('per_page', 25);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 25;
        }

        $logs = $query->paginate($perPage)->withQueryString();

        $modules = [
            'Semua',
            'Master Data',
            'Auth / Login',
            'Perencanaan',
            'Pengukuran',
            'Pelaporan',
            'Evaluasi',
            'Pusat Informasi',
            'Early Warning',
            'Konfigurasi',
            'AI Assistant',
        ];

        $activities = [
            'Semua',
            'create',
            'update',
            'delete',
            'login',
            'logout',
            'submit',
            'approve',
            'reject',
            'revision_request',
            'upload',
            'download',
            'publish',
            'score',
            'export',
        ];

        $logsTransformed = $logs->through(function (AuditLog $log) {
            $actor = $log->actor;
            $module = self::MODULE_MAP[$log->resource_type] ?? (
                $log->action === 'login' || $log->action === 'logout' ? 'Auth / Login' : (
                    $log->resource_type ? ucwords(str_replace('_', ' ', $log->resource_type)) : 'Sistem'
                )
            );

            return [
                'id' => $log->id,
                'created_at' => $log->created_at?->toISOString(),
                'formatted_date' => $log->created_at ? $log->created_at->format('d-m-Y H:i') : '-',
                'action' => $log->action ?? 'info',
                'module' => $module,
                'resource_type' => $log->resource_type,
                'resource_id' => $log->resource_id,
                'description' => $this->formatDescription($log),
                'ip_address' => $log->ip_address ?: '127.0.0.1',
                'user' => [
                    'id' => $actor?->id,
                    'name' => $actor?->name ?? 'Sistem',
                    'role' => $actor?->roles->first()?->name ?? 'User',
                    'org_code' => $log->organization?->code ?? $log->organization?->short_name ?? $actor?->defaultOrganization()?->short_name ?? null,
                ],
                'diff' => $log->diff,
            ];
        });

        return Inertia::render('Audit/Index', [
            'logs' => $logsTransformed,
            'filters' => [
                'q' => $request->q ?? '',
                'module' => $request->module ?? '',
                'activity' => $request->activity ?? '',
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'per_page' => $perPage,
            ],
            'defaultDateFrom' => $defaultDateFrom,
            'defaultDateTo' => $defaultDateTo,
            'modules' => $modules,
            'activities' => $activities,
            'totalEntries' => $totalEntries,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('view-audit');

        $defaultDateFrom = now()->subDays(30)->format('Y-m-d');
        $defaultDateTo = now()->format('Y-m-d');

        $dateFrom = $request->filled('date_from') ? $request->date_from : $defaultDateFrom;
        $dateTo = $request->filled('date_to') ? $request->date_to : $defaultDateTo;

        $user = $request->user();
        $query = $this->buildQuery($request, $user, $dateFrom, $dateTo);
        $logs = $query->limit(5000)->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="audit-log-'.now()->format('Y-m-d').'.csv"',
        ];

        return Response::streamDownload(function () use ($logs) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['WAKTU', 'USER', 'ROLE / OPD', 'MODUL', 'AKTIVITAS', 'DESKRIPSI', 'IP']);

            foreach ($logs as $log) {
                $actor = $log->actor;
                $module = self::MODULE_MAP[$log->resource_type] ?? (
                    $log->action === 'login' || $log->action === 'logout' ? 'Auth / Login' : (
                        $log->resource_type ? ucwords(str_replace('_', ' ', $log->resource_type)) : 'Sistem'
                    )
                );

                $userDesc = $actor?->roles->first()?->name ?? ($log->organization?->name ?? '-');

                fputcsv($out, [
                    $log->created_at ? $log->created_at->format('d-m-Y H:i') : '-',
                    $actor?->name ?? 'Sistem',
                    $userDesc,
                    $module,
                    $log->action ?? '-',
                    $this->formatDescription($log),
                    $log->ip_address ?: '127.0.0.1',
                ]);
            }
            fclose($out);
        }, 'audit-log-'.now()->format('Y-m-d').'.csv', $headers);
    }

    private function buildQuery(Request $request, ?User $user, string $dateFrom, string $dateTo)
    {
        $query = AuditLog::with(['actor.roles', 'organization'])
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->latest('created_at');

        if ($this->shouldScopeToOrganization($user)) {
            $orgIds = $user->organizations->pluck('id')->all();
            $query->where(function ($q) use ($user, $orgIds) {
                $q->whereIn('organization_id', $orgIds)
                    ->orWhere('actor_id', $user->id);
            });
        }

        if ($request->filled('q')) {
            $search = trim($request->q);
            $query->where(function ($q) use ($search) {
                $q->where('reason', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('resource_type', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('actor', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('module') && $request->module !== 'Semua') {
            $matchedResources = array_keys(array_filter(self::MODULE_MAP, fn ($m) => strcasecmp($m, $request->module) === 0));
            if (! empty($matchedResources)) {
                $query->whereIn('resource_type', $matchedResources);
            } else {
                $query->where('resource_type', 'like', '%'.$request->module.'%');
            }
        }

        if ($request->filled('activity') && $request->activity !== 'Semua') {
            $query->where('action', $request->activity);
        }

        return $query;
    }

    private function shouldScopeToOrganization(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        // Global OPD Admin and Leadership roles see everything
        if ($user->isOpdAdmin() || $user->isLeadership()) {
            return false;
        }

        return true;
    }

    private function formatDescription(object $log): string
    {
        if (! empty($log->reason)) {
            return $log->reason;
        }

        $resName = $log->resource_type ? ucwords(str_replace('_', ' ', $log->resource_type)) : '';
        $resId = $log->resource_id ? "#{$log->resource_id}" : '';

        return match ($log->action) {
            'login' => 'Login berhasil ke sistem',
            'logout' => 'Logout dari sistem',
            'upload' => "Mengunggah {$resName} {$resId}",
            'download' => "Mengunduh {$resName} {$resId}",
            'delete' => "Menghapus {$resName} {$resId}",
            'create' => "Membuat {$resName} baru {$resId}",
            'update' => "Memperbarui data {$resName} {$resId}",
            'submit' => "Mengajukan {$resName} {$resId}",
            'approve' => "Menyetujui {$resName} {$resId}",
            'reject' => "Menolak {$resName} {$resId}",
            'revision_request' => "Meminta revisi {$resName} {$resId}",
            'publish' => "Mempublikasikan {$resName} {$resId}",
            'unpublish' => "Membatalkan publikasi {$resName} {$resId}",
            'score' => "Memberikan penilaian {$resName} {$resId}",
            'export' => "Mengekspor data {$resName}",
            default => trim("Aktivitas {$log->action} pada {$resName} {$resId}"),
        };
    }
}
