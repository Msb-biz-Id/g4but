<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\DocumentRevision;
use App\Models\Organization;
use App\Models\PlanningDocument;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * BR-006: Catatan revisi dokumen perencanaan (satu arah: Biro → OPD).
 *
 * Biro Organisasi / Super Admin mengirim catatan perbaikan ke dokumen OPD.
 * Admin OPD menerima notifikasi in-app dan wajib melakukan revisi.
 * Biro tidak bisa mengedit dokumen OPD secara langsung.
 */
class DocumentRevisionController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly AuthorizationService $authorization,
    ) {}

    /**
     * Kirim catatan revisi dokumen perencanaan.
     */
    public function store(Request $request, PlanningDocument $document): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        $user = $request->user();
        $isOpdAuthority = $user && ($user->isOpdAdmin() || $user->isLeadership());
        $canSendRevision = $user && (
            $isOpdAuthority
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve')
        );
        if (! $canSendRevision) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengirim catatan revisi dokumen.');
        }

        if (! $isOpdAuthority && ! $this->authorization->canAccessOrganization($user, (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $validated = $request->validate([
            'note' => ['required', 'string', 'min:10', 'max:2000'],
        ], [
            'note.required' => 'Catatan revisi tidak boleh kosong.',
            'note.min' => 'Catatan revisi minimal 10 karakter.',
        ]);

        // Buat catatan revisi
        $revision = DocumentRevision::create([
            'planning_document_id' => $document->id,
            'note' => $validated['note'],
            'status' => 'pending',
            'created_by' => $request->user()->id,
        ]);

        // Ubah status dokumen kembali ke draft agar OPD sadar perlu revisi
        if ($document->status === 'approved') {
            $document->update(['status' => 'draft', 'approved_by' => null, 'approved_at' => null]);
        }

        // Kirim notifikasi in-app ke semua Admin di OPD terkait
        $this->notifyOpdAdmins($document, $revision, $validated['note']);

        $this->audit->log('revision_sent', 'planning_document', $document->id, $document->organization_id);

        return back()->with('success', 'Catatan revisi berhasil dikirim ke Admin OPD.');
    }

    /**
     * Admin OPD konfirmasi sudah membaca catatan revisi.
     */
    public function acknowledge(Request $request, DocumentRevision $revision): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        $revision->loadMissing('planningDocument');
        $this->authorization->canAccessOrganization($request->user(), (int) $revision->planningDocument?->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($revision->status !== 'pending') {
            return back()->withErrors(['status' => 'Catatan ini sudah dikonfirmasi.']);
        }

        $revision->update([
            'status' => 'acknowledged',
            'acknowledged_by' => $request->user()->id,
            'acknowledged_at' => now(),
        ]);

        return back()->with('success', 'Catatan revisi telah dikonfirmasi. Silakan perbaiki dokumen.');
    }

    /**
     * Admin OPD tandai revisi sudah diselesaikan.
     */
    public function resolve(Request $request, DocumentRevision $revision): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        $revision->loadMissing('planningDocument');
        $this->authorization->canAccessOrganization($request->user(), (int) $revision->planningDocument?->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $revision->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Revisi ditandai selesai.');
    }

    // ── Private ────────────────────────────────────────────────────────────────

    private function notifyOpdAdmins(PlanningDocument $document, DocumentRevision $revision, string $note): void
    {
        if (! $document->organization_id) {
            return;
        }

        // Ambil users yang terhubung ke OPD ini
        $org = Organization::with('users:id,name')->find($document->organization_id);
        if (! $org) {
            return;
        }

        foreach ($org->users as $user) {
            AppNotification::create([
                'user_id' => $user->id,
                'event' => 'revision',
                'channel' => 'in_app',
                'title' => "Catatan Revisi: {$document->title}",
                'message' => "Biro Organisasi mengirimkan catatan perbaikan untuk dokumen \"{$document->title}\". "
                    .'Silakan buka halaman Dokumen Perencanaan untuk melihat detail dan melakukan perbaikan.',
                'resource_type' => 'planning_document',
                'resource_id' => $document->id,
                'metadata' => [
                    'revision_id' => $revision->id,
                    'note_preview' => mb_substr($note, 0, 120),
                ],
                'delivery_status' => 'sent',
            ]);
        }
    }
}
