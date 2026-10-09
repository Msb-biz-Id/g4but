<?php

namespace App\Http\Controllers\Measurement;

use App\Http\Controllers\Controller;
use App\Models\Evidence;
use App\Models\Realization;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenceController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly AuthorizationService $authorization,
    ) {}

    public function store(Request $request, Realization $realization): RedirectResponse
    {
        $this->authorize('upload-evidences');

        $this->authorization->canAccessOrganization($request->user(), (int) $realization->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if (! in_array($realization->status, ['draft', 'revision_required'], true)) {
            return back()->withErrors(['evidence' => 'Evidence hanya dapat diunggah pada status draft/revisi.']);
        }

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,xlsx,xls,doc,docx,csv'],
        ]);

        $file = $validated['file'];
        $extension = $file->getClientOriginalExtension();
        $key = sprintf(
            'evidences/%s/%s_%s.%s',
            $realization->id,
            now()->format('YmdHis'),
            substr(md5(uniqid((string) mt_rand(), true)), 0, 12),
            $extension,
        );

        Storage::disk('local')->put($key, $file->get());

        try {
            DB::transaction(function () use ($realization, $key, $file, $request) {
                Evidence::create([
                    'realization_id' => $realization->id,
                    'object_key' => $key,
                    'file_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'checksum' => hash_file('sha256', $file->getRealPath()),
                    'uploader_id' => $request->user()->id,
                    'uploaded_at' => now(),
                    'status' => 'active',
                ]);

                $this->audit->log('upload', 'evidence', null, $realization->organization_id);
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($key);
            throw $e;
        }

        return back()->with('success', 'Evidence berhasil diunggah.');
    }

    public function destroy(Request $request, Realization $realization, Evidence $evidence): RedirectResponse
    {
        $this->authorize('upload-evidences');

        $this->authorization->canAccessOrganization($request->user(), (int) $realization->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($evidence->realization_id !== $realization->id) {
            abort(404);
        }

        if (! in_array($realization->status, ['draft', 'revision_required'], true)) {
            return back()->withErrors(['evidence' => 'Evidence hanya dapat dihapus pada status draft/revisi.']);
        }

        DB::transaction(function () use ($evidence, $realization) {
            $evidence->delete();
            $this->audit->log('delete', 'evidence', $evidence->id, $realization->organization_id);
        });

        Storage::disk('local')->delete($evidence->object_key);

        return back()->with('success', 'Evidence dihapus.');
    }

    public function download(Request $request, Realization $realization, Evidence $evidence): StreamedResponse
    {
        $this->authorize('view-evidences');

        $this->authorization->canAccessOrganization($request->user(), (int) $realization->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($evidence->realization_id !== $realization->id) {
            abort(404);
        }

        if (! Storage::disk('local')->exists($evidence->object_key)) {
            abort(404);
        }

        $this->audit->log('download', 'evidence', $evidence->id, $realization->organization_id);

        return Storage::disk('local')->download($evidence->object_key, $evidence->file_name);
    }
}
