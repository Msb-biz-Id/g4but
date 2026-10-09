<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\PlanningDocument;
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
                    ->where('key', 'like', config('cache.prefix', '') . 'sakip_dashboard%')
                    ->orWhere('key', 'like', config('cache.prefix', '') . 'analytics%')
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
        if (!$doc || empty($doc->file_path)) {
            return false;
        }

        return Storage::disk('local')->exists($doc->file_path)
            || Storage::disk('public')->exists($doc->file_path)
            || file_exists(storage_path('app/private/' . $doc->file_path))
            || file_exists(storage_path('app/' . $doc->file_path))
            || file_exists(storage_path('app/public/' . $doc->file_path));
    }

    /**
     * Definisi baku 13 Parameter Dokumen SAKIP Pemerintah Daerah
     */
    public function getCanonicalPemdaDefinitions(): array
    {
        return [
            [
                'no'           => 1,
                'name'         => 'RPJMD',
                'type'         => 'rpjmd',
                'aliases'      => ['rpjmd'],
                'period_type'  => 'lima_tahunan',
                'start_year'   => 2025,
                'end_year'     => 2029,
                'period_label' => '2025-2029',
            ],
            [
                'no'           => 2,
                'name'         => 'Pohon Kinerja Pemerintah Daerah',
                'type'         => 'pohon_kinerja',
                'aliases'      => ['pohon_kinerja'],
                'period_type'  => 'tahunan',
                'period_label' => null, // Dynamic to evaluation year
            ],
            [
                'no'           => 3,
                'name'         => 'Proses Bisnis Pemerintah Daerah',
                'type'         => 'sop',
                'aliases'      => ['sop', 'probis'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 4,
                'name'         => 'Crosscutting Kinerja Pemerintah Daerah',
                'type'         => 'crosscutting',
                'aliases'      => ['crosscutting'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 5,
                'name'         => 'Cascading Kinerja Pemerintah Daerah',
                'type'         => 'cascading',
                'aliases'      => ['cascading'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 6,
                'name'         => 'IKU Pemerintah Daerah',
                'type'         => 'iku',
                'aliases'      => ['iku'],
                'period_type'  => 'lima_tahunan',
                'start_year'   => 2025,
                'end_year'     => 2029,
                'period_label' => '2025-2029',
            ],
            [
                'no'           => 7,
                'name'         => 'RKPD',
                'type'         => 'rkpd',
                'aliases'      => ['rkpd'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 8,
                'name'         => 'Dokumen Anggaran/DPA Terkait',
                'type'         => 'dpa',
                'aliases'      => ['dpa', 'apbd', 'kua'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 9,
                'name'         => 'Perjanjian Kinerja Pemerintah Daerah',
                'type'         => 'pk',
                'aliases'      => ['pk'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 10,
                'name'         => 'Manajemen Risiko Pemerintah Daerah',
                'type'         => 'monev',
                'aliases'      => ['monev', 'manajemen_risiko'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 11,
                'name'         => 'Rencana Aksi Kinerja Pemerintah Daerah',
                'type'         => 'renaksi',
                'aliases'      => ['renaksi'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 12,
                'name'         => 'Pedoman Teknis Perencanaan Kinerja',
                'type'         => 'pedoman_teknis',
                'aliases'      => ['pedoman_teknis', 'pedoman', 'juknis', 'monev_tw1'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
            [
                'no'           => 13,
                'name'         => 'LKjIP Pemerintah Daerah',
                'type'         => 'lkjip',
                'aliases'      => ['lkjip'],
                'period_type'  => 'tahunan',
                'period_label' => null,
            ],
        ];
    }

    /**
     * Mendapatkan organisasi Pemda (Provinsi)
     */
    public function getProvinceOrganization(): ?Organization
    {
        return Organization::where('code', 'PROV-PAPBAR')->first()
            ?? Organization::where('type', 'province')->first();
    }

    /**
     * Menghitung Matriks 13 Dokumen SAKIP Pemda secara dinamis berdasarkan Tahun Evaluasi.
     *
     * @param int $tahunEvaluasi
     * @return array
     */
    public function getSakipPemdaMatrix(int $tahunEvaluasi): array
    {
        $prov = $this->getProvinceOrganization();
        $definitions = $this->getCanonicalPemdaDefinitions();

        $rows = [];
        $availCount = 0;

        // Ambil ID organisasi terkait Pemda:
        // 1. Pemprov Papua Barat (type: province / code: PROV-PAPBAR)
        // 2. Bappeda (is_bappeda: true / type: bappeda / code: BAPPEDA-PB) yang ditugaskan mengunggah RPJMD & RKPD (BR-003)
        // 3. Biro Organisasi (code: BIRO-ORG-PB) untuk probis, pedoman teknis, dsb.
        $pemdaOrgIds = Organization::where(function ($q) {
            $q->where('type', 'province')
              ->orWhere('code', 'PROV-PAPBAR')
              ->orWhere('is_bappeda', true)
              ->orWhere('type', 'bappeda')
              ->orWhere('code', 'BAPPEDA-PB')
              ->orWhere('code', 'BIRO-ORG-PB');
        })->pluck('id')->toArray();

        if ($prov && !in_array($prov->id, $pemdaOrgIds, true)) {
            $pemdaOrgIds[] = $prov->id;
        }

        // Ambil semua dokumen approved/locked milik Pemda/Bappeda/Biro Organisasi
        // Serta dokumen bertipe khusus Pemda (seperti rpjmd & rkpd) tanpa memandang ID unit pengunggahnya
        $docs = PlanningDocument::whereIn('status', ['approved', 'locked'])
            ->where(function ($q) use ($pemdaOrgIds) {
                if (!empty($pemdaOrgIds)) {
                    $q->whereIn('organization_id', $pemdaOrgIds);
                }
                $q->orWhereIn('type', ['rpjmd', 'rkpd']);
            })
            ->get();

        foreach ($definitions as $item) {
            $periodLabel = $item['period_label'] ?? (string) $tahunEvaluasi;
            $isAvailable = false;
            $matchedDoc = null;

            // Cari dokumen yang bertipe sama / alias
            $candidates = $docs->filter(fn ($d) => in_array($d->type, $item['aliases'], true));

            foreach ($candidates as $cand) {
                if ($item['period_type'] === 'lima_tahunan') {
                    // Dokumen lima tahunan: valid jika tahun evaluasi berada dalam rentang berlakunya
                    $start = $cand->start_year ?? ($cand->year ?: ($item['start_year'] ?? 2025));
                    $end   = $cand->end_year ?? ($start + 4);
                    if ($end <= $start) {
                        $end = $start + 4;
                    }
                    if ($tahunEvaluasi >= $start && $tahunEvaluasi <= $end) {
                        $isAvailable = true;
                        $matchedDoc = $cand;
                        $periodLabel = "{$start}-{$end}";
                        break;
                    }
                    // Fallback jika periode_type 5_tahunan atau year == tahunEvaluasi
                    if ((int) $cand->year === $tahunEvaluasi || $cand->periode_type === '5_tahunan' || $cand->periode_type === 'lima_tahunan') {
                        $isAvailable = true;
                        $matchedDoc = $cand;
                        $periodLabel = "{$start}-{$end}";
                        break;
                    }
                } else {
                    // Dokumen tahunan: valid hanya jika year == tahunEvaluasi
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

            $rows[] = [
                'no'              => $item['no'],
                'name'            => $item['name'],
                'type'            => $item['type'],
                'period'          => $periodLabel,
                'period_type'     => $item['period_type'],
                'is_available'    => $isAvailable,
                'status'          => $isAvailable ? 'Tersedia' : 'Belum Tersedia',
                'document_id'     => $matchedDoc?->id,
                'document_title'  => $matchedDoc?->title,
                'document_number' => $matchedDoc?->document_number,
                'approved_at'     => $matchedDoc?->approved_at?->format('d/m/Y'),
                'file_path'       => $matchedDoc?->file_path,
                'has_file'        => $hasPhysicalFile,
                'download_url'    => ($isAvailable && $hasPhysicalFile && $matchedDoc) ? route('planning.documents.download', $matchedDoc->id) : null,
            ];
        }

        $totalReq = count($definitions);
        $missingCount = $totalReq - $availCount;
        $pct = round(($availCount / $totalReq) * 100, 2);

        // Status otomatis: 100% Lengkap, >0% Belum Lengkap, 0% Belum Tersedia
        $status = match (true) {
            $pct >= 100 => 'Lengkap',
            $pct > 0    => 'Belum Lengkap',
            default     => 'Belum Tersedia',
        };

        return [
            'total_required' => $totalReq,
            'available'      => $availCount,
            'missing'        => $missingCount,
            'percentage'     => $pct,
            'status'         => $status,
            'rows'           => $rows,
            'evaluation_year'=> $tahunEvaluasi,
        ];
    }

    /**
     * Definisi baku 12 Dokumen Wajib SAKIP Perangkat Daerah (Level OPD)
     */
    public function getCanonicalOpdDefinitions(): array
    {
        return [
            [
                'no'           => 1,
                'key'          => 'renstra',
                'name'         => 'Renstra',
                'aliases'      => ['renstra'],
                'period_type'  => 'lima_tahunan',
                'start_year'   => 2025,
                'end_year'     => 2029,
                'period_label' => '2025-2029',
            ],
            [
                'no'           => 2,
                'key'          => 'pohon_kinerja',
                'name'         => 'Pohon Kinerja',
                'aliases'      => ['pohon_kinerja'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 3,
                'key'          => 'sop',
                'name'         => 'Proses Bisnis',
                'aliases'      => ['sop', 'probis'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 4,
                'key'          => 'crosscutting',
                'name'         => 'Crosscutting',
                'aliases'      => ['crosscutting'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 5,
                'key'          => 'cascading',
                'name'         => 'Cascading',
                'aliases'      => ['cascading'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 6,
                'key'          => 'iku',
                'name'         => 'IKU',
                'aliases'      => ['iku'],
                'period_type'  => 'lima_tahunan',
                'start_year'   => 2025,
                'end_year'     => 2029,
                'period_label' => '2025-2029',
            ],
            [
                'no'           => 7,
                'key'          => 'renja',
                'name'         => 'Renja',
                'aliases'      => ['renja'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 8,
                'key'          => 'dpa',
                'name'         => 'DPA',
                'aliases'      => ['dpa', 'apbd', 'kua'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 9,
                'key'          => 'pk',
                'name'         => 'PK',
                'aliases'      => ['pk'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 10,
                'key'          => 'monev',
                'name'         => 'Manajemen Risiko',
                'aliases'      => ['monev', 'manajemen_risiko'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 11,
                'key'          => 'renaksi',
                'name'         => 'Rencana Aksi',
                'aliases'      => ['renaksi'],
                'period_type'  => 'tahunan',
            ],
            [
                'no'           => 12,
                'key'          => 'lkjip',
                'name'         => 'LKjIP OPD',
                'aliases'      => ['lkjip'],
                'period_type'  => 'tahunan',
            ],
        ];
    }

    /**
     * Menghitung Matriks 12 Dokumen SAKIP Perangkat Daerah secara dinamis berdasarkan Tahun Evaluasi.
     *
     * @param int $tahunEvaluasi
     * @param int|null $filterOpdId
     * @param array $accessibleOrgIds
     * @return array
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
        } elseif (!empty($accessibleOrgIds)) {
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
                        $end   = $cand->end_year ?? ($start + 4);
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
                    'document_id'  => $matchedDoc?->id,
                    'has_file'     => $hasPhysicalFile,
                    'file_path'    => $matchedDoc?->file_path,
                    'title'        => $matchedDoc?->title ?? $def['name'],
                    'download_url' => ($isAvailable && $hasPhysicalFile && $matchedDoc) ? route('planning.documents.download', $matchedDoc->id) : null,
                ];
            }

            $totalReq = count($definitions);
            $missingCount = $totalReq - $availCount;
            $totalMissingDocs += $missingCount;

            $pct = round(($availCount / $totalReq) * 100, 2);

            $status = match (true) {
                $pct >= 100 => 'Lengkap',
                $pct > 0    => 'Belum Lengkap',
                default     => 'Belum Tersedia',
            };

            if ($status === 'Lengkap') {
                $opdLengkapCount++;
            } elseif ($status === 'Belum Lengkap') {
                $opdBelumLengkapCount++;
            } else {
                $opdBelumTersediaCount++;
            }

            $rows[] = [
                'no'                => $idx + 1,
                'organization_id'   => $opd->id,
                'organization_code' => $opd->code,
                'organization_name' => $opd->name,
                'checks'            => $checks,
                'doc_details'       => $docDetails,
                'available_count'   => $availCount,
                'missing_count'     => $missingCount,
                'total_required'    => $totalReq,
                'percentage'        => $pct,
                'status'            => $status,
            ];
        }

        $totalOpd = count($allOpd);
        $pctOpdLengkap = $totalOpd > 0 ? round(($opdLengkapCount / $totalOpd) * 100, 2) : 0;
        $totalBelumLengkap = $totalOpd - $opdLengkapCount;

        return [
            'total_opd'           => $totalOpd,
            'opd_lengkap'         => $opdLengkapCount,
            'opd_belum_lengkap'   => $totalBelumLengkap,
            'pct_lengkap'         => $pctOpdLengkap,
            'missing_docs'        => $totalMissingDocs,
            'total_required_docs' => $totalRequiredDocs,
            'available_docs'      => $totalRequiredDocs - $totalMissingDocs,
            'columns'             => $docColumns,
            'definitions'         => $definitions,
            'rows'                => $rows,
            'evaluation_year'     => $tahunEvaluasi,
            'status_distribution' => [
                'lengkap'        => $opdLengkapCount,
                'belum_lengkap'  => $opdBelumLengkapCount,
                'belum_tersedia' => $opdBelumTersediaCount,
            ],
        ];
    }
}
