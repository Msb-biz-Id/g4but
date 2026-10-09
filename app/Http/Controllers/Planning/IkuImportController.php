<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Services\IkuImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IkuImportController extends Controller
{
    public function __construct(private readonly IkuImportService $importService) {}

    /**
     * Upload Excel → validasi → tampilkan preview.
     */
    public function upload(Request $request): RedirectResponse|Response
    {
        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        abort_unless($user && ($user->hasPermission('iku:import') || $isProvincialAdmin), 403, 'Tidak memiliki izin untuk impor IKU.');

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:5120'],
        ]);

        $result = $this->importService->preview($request->file('file'), $user);

        // Simpan hasil preview di session untuk tahap commit
        session(['iku_import_preview' => $result]);

        return Inertia::render('Planning/Iku/ImportPreview', [
            'validRows'  => $result['valid_rows'],
            'errorRows'  => $result['error_rows'],
            'totalRows'  => $result['total_rows'],
        ]);
    }

    /**
     * Commit baris valid ke database.
     */
    public function commit(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        abort_unless($user && ($user->hasPermission('iku:import') || $isProvincialAdmin), 403, 'Tidak memiliki izin untuk impor IKU.');

        $preview = session('iku_import_preview');

        if (! $preview || empty($preview['valid_rows'])) {
            return redirect()->route('planning.iku.index')
                ->with('error', 'Tidak ada data valid untuk diimpor. Silakan upload ulang.');
        }

        $imported = $this->importService->commit($preview['valid_rows'], $user);

        session()->forget('iku_import_preview');

        return redirect()->route('planning.iku.index')
            ->with('success', "Berhasil mengimpor {$imported} IKU baru.");
    }

    /**
     * Download template Excel IKU.
     */
    public function downloadTemplate()
    {
        return $this->importService->generateTemplate();
    }
}
