<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SakipDocumentService
{
    /**
     * Bersihkan cache Dashboard Eksekutif & Dashboard Analitik
     * agar data real-time langsung tampil setelah perubahan/persetujuan dokumen.
     */
    public static function clearDashboardCache(): void
    {
        try {
            if (config('cache.default') === 'database') {
                DB::table('cache')
                    ->where('key', 'like', config('cache.prefix', '').'sakip_dashboard%')
                    ->orWhere('key', 'like', config('cache.prefix', '').'analytics%')
                    ->delete();
            } else {
                Cache::flush();
            }
        } catch (\Throwable) {
            try {
                Cache::flush();
            } catch (\Throwable) {
                // Ignore if cache flush fails
            }
        }
    }

    /**
     * Mengecek keberadaan berkas fisik dokumen secara objektif.
     */
    public function hasPhysicalFile(?PlanningDocument $doc): bool
    {
        if (! $doc || empty($doc->file_path)) {
            return false;
        }

        return Storage::disk('local')->exists($doc->file_path)
            || Storage::disk('public')->exists($doc->file_path)
            || file_exists(storage_path('app/private/'.$doc->file_path))
            || file_exists(storage_path('app/'.$doc->file_path))
            || file_exists(storage_path('app/public/'.$doc->file_path));
    }

    /**
     * Definisi baku 12 Dokumen Wajib SAKIP Perangkat Daerah (Level OPD)
     */
    public function getCanonicalOpdDefinitions(): array
    {
        $activePeriod = PlanningPeriod::where('status', 'active')->first()
            ?? PlanningPeriod::latest('start_year')->first();
        $startYear = $activePeriod?->start_year ?? (int) date('Y');
        $endYear = $activePeriod?->end_year ?? ($startYear + 4);
        $periodLabel = "{$startYear}-{$endYear}";

        return [
            [
                'no' => 1,
                'key' => 'renstra',
                'name' => 'Renstra',
                'aliases' => ['renstra'],
                'period_type' => 'lima_tahunan',
                'start_year' => $startYear,
                'end_year' => $endYear,
                'period_label' => $periodLabel,
            ],
            [
                'no' => 2,
                'key' => 'pohon_kinerja',
                'name' => 'Pohon Kinerja',
                'aliases' => ['pohon_kinerja'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 3,
                'key' => 'sop',
                'name' => 'Proses Bisnis',
                'aliases' => ['sop', 'probis'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 4,
                'key' => 'crosscutting',
                'name' => 'Crosscutting',
                'aliases' => ['crosscutting'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 5,
                'key' => 'cascading',
                'name' => 'Cascading',
                'aliases' => ['cascading'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 6,
                'key' => 'iku',
                'name' => 'IKU',
                'aliases' => ['iku'],
                'period_type' => 'lima_tahunan',
                'start_year' => $startYear,
                'end_year' => $endYear,
                'period_label' => $periodLabel,
            ],
            [
                'no' => 7,
                'key' => 'renja',
                'name' => 'Renja',
                'aliases' => ['renja'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 8,
                'key' => 'dpa',
                'name' => 'DPA',
                'aliases' => ['dpa', 'apbd', 'kua'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 9,
                'key' => 'pk',
                'name' => 'PK',
                'aliases' => ['pk'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 10,
                'key' => 'monev',
                'name' => 'Manajemen Risiko',
                'aliases' => ['monev', 'manajemen_risiko'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 11,
                'key' => 'renaksi',
                'name' => 'Rencana Aksi',
                'aliases' => ['renaksi'],
                'period_type' => 'tahunan',
            ],
            [
                'no' => 12,
                'key' => 'lkjip',
                'name' => 'LKjIP OPD',
                'aliases' => ['lkjip'],
                'period_type' => 'tahunan',
            ],
        ];
    }

    /**
     * Menghitung Matriks 12 Dokumen SAKIP Perangkat Daerah secara dinamis berdasarkan Tahun Evaluasi.
     */
    public function getSakipOpdMatrix(int $tahunEvaluasi, ?int $filterOpdId = null, array $accessibleOrgIds = []): array
    {
        $definitions = $this->getCanonicalOpdDefinitions();
        $docColumns = [];
        foreach ($definitions as $def) {
            $docColumns[$def['key']] = $def['name'];
        }

        $query = Organization::where('type', 'opd')->orderBy('code');
        if ($filterOpdId) {
            $query->where('id', $filterOpdId);
        } elseif (! empty($accessibleOrgIds)) {
            $query->whereIn('id', $accessibleOrgIds);
        }
        $allOpd = $query->get();

        $rows = [];
        $opdLengkapCount = 0;
        $opdBelumLengkapCount = 0;
        $opdBelumTersediaCount = 0;
        $totalMissingDocs = 0;
        $totalRequiredDocs = count($allOpd) * count($definitions);

        $opdIds = $allOpd->pluck('id')->toArray();
        $allDocs = PlanningDocument::whereIn('organization_id', $opdIds)
            ->whereIn('status', ['approved', 'locked'])
            ->get()
            ->groupBy('organization_id');

        foreach ($allOpd as $idx => $opd) {
            $docs = $allDocs->get($opd->id, collect());
            $checks = [];
            $docDetails = [];
            $availCount = 0;

            foreach ($definitions as $def) {
                $isAvailable = false;
                $matchedDoc = null;
                $candidates = $docs->filter(fn ($d) => in_array($d->type, $def['aliases']));

                foreach ($candidates as $cand) {
                    if ($def['period_type'] === 'lima_tahunan') {
                        $start = $cand->start_year ?? ($cand->year ?: ($def['start_year'] ?? 2025));
                        $end = $cand->end_year ?? ($start + 4);
                        if ($end <= $start) {
                            $end = $start + 4;
                        }
                        if ($tahunEvaluasi >= $start && $tahunEvaluasi <= $end) {
                            $isAvailable = true;
                            $matchedDoc = $cand;
                            break;
                        }
                        if ((int) $cand->year === $tahunEvaluasi || $cand->periode_type === '5_tahunan' || $cand->periode_type === 'lima_tahunan') {
                            $isAvailable = true;
                            $matchedDoc = $cand;
                            break;
                        }
                    } else {
                        if ((int) $cand->year === $tahunEvaluasi) {
                            $isAvailable = true;
                            $matchedDoc = $cand;
                            break;
                        }
                    }
                }

                if ($isAvailable) {
                    $availCount++;
                }

                $hasPhysicalFile = $this->hasPhysicalFile($matchedDoc);

                $checks[$def['key']] = $isAvailable;
                $docDetails[$def['key']] = [
                    'is_available' => $isAvailable,
                    'document_id' => $matchedDoc?->id,
                    'has_file' => $hasPhysicalFile,
                    'file_path' => $matchedDoc?->file_path,
                    'title' => $matchedDoc?->title ?? $def['name'],
                    'download_url' => ($isAvailable && $hasPhysicalFile && $matchedDoc) ? route('planning.documents.download', $matchedDoc->id) : null,
                ];
            }

            $totalReq = count($definitions);
            $missingCount = $totalReq - $availCount;
            $totalMissingDocs += $missingCount;

            $pct = round(($availCount / $totalReq) * 100, 2);

            $status = match (true) {
                $pct >= 100 => 'Lengkap',
                $pct > 0 => 'Belum Lengkap',
                default => 'Belum Tersedia',
            };

            if ($status === 'Lengkap') {
                $opdLengkapCount++;
            } elseif ($status === 'Belum Lengkap') {
                $opdBelumLengkapCount++;
            } else {
                $opdBelumTersediaCount++;
            }

            $rows[] = [
                'no' => $idx + 1,
                'organization_id' => $opd->id,
                'organization_code' => $opd->code,
                'organization_name' => $opd->name,
                'checks' => $checks,
                'doc_details' => $docDetails,
                'available_count' => $availCount,
                'missing_count' => $missingCount,
                'total_required' => $totalReq,
                'percentage' => $pct,
                'status' => $status,
            ];
        }

        $totalOpd = count($allOpd);
        $pctOpdLengkap = $totalOpd > 0 ? round(($opdLengkapCount / $totalOpd) * 100, 2) : 0;
        $totalBelumLengkap = $totalOpd - $opdLengkapCount;

        return [
            'total_opd' => $totalOpd,
            'opd_lengkap' => $opdLengkapCount,
            'opd_belum_lengkap' => $totalBelumLengkap,
            'pct_lengkap' => $pctOpdLengkap,
            'missing_docs' => $totalMissingDocs,
            'total_required_docs' => $totalRequiredDocs,
            'available_docs' => $totalRequiredDocs - $totalMissingDocs,
            'columns' => $docColumns,
            'definitions' => $definitions,
            'rows' => $rows,
            'evaluation_year' => $tahunEvaluasi,
            'status_distribution' => [
                'lengkap' => $opdLengkapCount,
                'belum_lengkap' => $opdBelumLengkapCount,
                'belum_tersedia' => $opdBelumTersediaCount,
            ],
        ];
    }
}
