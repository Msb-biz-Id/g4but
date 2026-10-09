<?php

namespace App\Http\Controllers\Readiness;

use App\Http\Controllers\Controller;
use App\Models\GoLiveReadiness;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReadinessController extends Controller
{
    /**
     * Checklist pre-go-live (BRD §32.1). Item disinkronkan agar selalu lengkap.
     */
    private const ITEMS = [
        ['brd_baseline_approved', 'BRD baseline approved', 'Dokumen'],
        ['srs_approved', 'SRS approved', 'Dokumen'],
        ['uat_sign_off', 'UAT sign-off', 'Dokumen'],
        ['security_test_done', 'Security test selesai', 'Keamanan'],
        ['critical_vuln_closed', 'Critical vulnerability ditutup', 'Keamanan'],
        ['backup_success', 'Backup berhasil', 'Infrastruktur'],
        ['restore_test_success', 'Restore test berhasil', 'Infrastruktur'],
        ['monitoring_active', 'Monitoring aktif', 'Infrastruktur'],
        ['alert_operational_active', 'Alert operasional aktif', 'Infrastruktur'],
        ['prod_secrets_available', 'Production secret tersedia', 'Infrastruktur'],
        ['dns_tls_ready', 'DNS/TLS siap', 'Infrastruktur'],
        ['sop_admin_available', 'SOP admin tersedia', 'Operasional'],
        ['user_guide_available', 'User guide tersedia', 'Operasional'],
        ['support_contact_available', 'Support contact tersedia', 'Operasional'],
        ['rollback_plan_available', 'Rollback plan tersedia', 'Operasional'],
        ['migration_reconciled', 'Data migration reconciliation selesai', 'Migrasi'],
        ['po_approval', 'Product owner menyetujui go-live', 'Persetujuan'],
    ];

    public function index(): Response
    {
        $this->authorize('view-readiness');

        $this->syncItems();

        $items = GoLiveReadiness::query()
            ->with('checkedBy:id,name')
            ->orderBy('category')
            ->orderBy('id')
            ->get();

        $total = $items->count();
        $checked = $items->where('checked', true)->count();

        return Inertia::render('Readiness/Index', [
            'items' => $items,
            'progress' => [
                'total' => $total,
                'checked' => $checked,
                'percent' => $total > 0 ? (int) round(($checked / $total) * 100) : 0,
                'is_ready' => $total > 0 && $checked === $total,
            ],
        ]);
    }

    public function update(Request $request, GoLiveReadiness $item): RedirectResponse
    {
        $this->authorize('manage-readiness');

        $validated = $request->validate([
            'checked' => ['required', 'boolean'],
        ]);

        $item->update([
            'checked' => $validated['checked'],
            'checked_by' => $validated['checked'] ? $request->user()->id : null,
            'checked_at' => $validated['checked'] ? now() : null,
        ]);

        return back()->with('success', $validated['checked']
            ? 'Item checklist ditandai selesai.'
            : 'Item checklist dibatalkan.');
    }

    private function syncItems(): void
    {
        foreach (self::ITEMS as [$key, $label, $category]) {
            GoLiveReadiness::firstOrCreate(
                ['item_key' => $key],
                ['label' => $label, 'category' => $category],
            );
        }
    }
}
