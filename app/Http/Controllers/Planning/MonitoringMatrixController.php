<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\PlanningDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Monitoring Matrix Kelengkapan Dokumen OPD (MOD-003 / AC-007)
 *
 * Halaman eksklusif Super Admin dan Admin Provinsi untuk memantau
 * kelengkapan upload dokumen perencanaan per OPD secara sekilas
 * dalam bentuk tabel matriks (OPD × Tipe Dokumen).
 *
 * Setiap sel menampilkan:
 *   ✓ approved  — hijau
 *   ~ draft     — kuning
 *   ✗ missing   — merah / abu
 */
class MonitoringMatrixController extends Controller
{
    // Tipe dokumen yang dipantau di matrix (subset dari 12, prioritas MVP)
    private const MATRIX_TYPES = [
        'rpjmd'              => 'RPJMD',
        'renstra'            => 'Renstra',
        'renja'              => 'Renja',
        'rkpd'               => 'RKPD',
        'perjanjian_kinerja' => 'PK',
        'laporan_kinerja'    => 'LKj',
        'evaluasi_sakip'     => 'Evaluasi',
    ];

    private const TYPE_ALIASES = [
        'perjanjian_kinerja' => ['perjanjian_kinerja', 'pk'],
        'laporan_kinerja'    => ['laporan_kinerja', 'lkjip'],
        'evaluasi_sakip'     => ['evaluasi_sakip', 'lhe'],
    ];

    public function index(Request $request): Response
    {
        $this->authorize('view-planning-monitoring');

        $year = $request->integer('year', now()->year);

        // Semua OPD aktif
        $organizations = Organization::query()
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type', 'is_bappeda']);

        $searchedTypes = [];
        foreach (array_keys(self::MATRIX_TYPES) as $t) {
            $searchedTypes = array_merge($searchedTypes, self::TYPE_ALIASES[$t] ?? [$t]);
        }
        $searchedTypes = array_values(array_unique($searchedTypes));

        // Ambil semua dokumen yang relevan untuk tahun evaluasi:
        // Dokumen tahunan: year == $year
        // Dokumen 5 tahunan (renstra, rpjmd, dll): tahun evaluasi berada dalam rentang berlakunya
        $documents = PlanningDocument::query()
            ->whereIn('type', $searchedTypes)
            ->get(['id', 'organization_id', 'type', 'status', 'approved_at', 'year', 'start_year', 'end_year', 'periode_type'])
            ->filter(function ($doc) use ($year) {
                $isLimaTahunan = in_array($doc->type, ['rpjmd', 'renstra'], true)
                    || $doc->periode_type === '5_tahunan'
                    || $doc->periode_type === 'lima_tahunan';

                if ($isLimaTahunan) {
                    $start = $doc->start_year ?: $doc->year;
                    $end   = $doc->end_year ?: ($start + 4);
                    if ($end <= $start) {
                        $end = $start + 4;
                    }
                    if ($year >= $start && $year <= $end) {
                        return true;
                    }
                    return (int) $doc->year === $year;
                }

                return (int) $doc->year === $year;
            })
            ->groupBy('organization_id');

        // Dokumen Pemda tingkat Provinsi (RPJMD dan RKPD)
        $provOrgIds = Organization::where('type', 'province')
            ->orWhere('code', 'PROV-PAPBAR')
            ->orWhere('is_bappeda', true)
            ->orWhere('type', 'bappeda')
            ->orWhere('code', 'BAPPEDA-PB')
            ->pluck('id')
            ->toArray();

        $pemdaDocs = PlanningDocument::whereIn('type', ['rpjmd', 'rkpd'])
            ->whereIn('status', ['approved', 'locked'])
            ->get(['id', 'organization_id', 'type', 'status', 'approved_at', 'year', 'start_year', 'end_year', 'periode_type'])
            ->filter(function ($doc) use ($year) {
                $start = $doc->start_year ?: $doc->year;
                $end   = $doc->end_year ?: ($start + 4);
                if ($end <= $start) {
                    $end = $start + 4;
                }
                return ($year >= $start && $year <= $end) || (int) $doc->year === $year;
            });

        // Bangun baris matrix per OPD
        $matrix = $organizations->map(function (Organization $org) use ($documents, $pemdaDocs, $provOrgIds) {
            $orgDocs = $documents->get($org->id, collect());
            $isBappeda = (bool) (
                $org->is_bappeda
                || strtolower($org->type ?? '') === 'bappeda'
                || str_contains(strtolower($org->name), 'bappeda')
                || in_array($org->id, $provOrgIds, true)
            );

            $cells = collect(self::MATRIX_TYPES)->map(function ($label, $type) use ($orgDocs, $pemdaDocs, $isBappeda) {
                $aliases = self::TYPE_ALIASES[$type] ?? [$type];
                /** @var PlanningDocument|null $doc */
                $doc = $orgDocs->first(fn ($d) => in_array($d->type, $aliases, true));

                // Khusus Bappeda / Pemprov: jika dokumen RPJMD atau RKPD belum ada di unit ini, fallback ke dokumen Pemda yang sudah disetujui
                if (! $doc && $isBappeda && in_array($type, ['rpjmd', 'rkpd'], true)) {
                    $doc = $pemdaDocs->first(fn ($d) => in_array($d->type, $aliases, true));
                }

                if (! $doc) {
                    return ['status' => 'missing', 'id' => null, 'approved_at' => null];
                }

                return [
                    'status'      => $doc->status,
                    'id'          => $doc->id,
                    'approved_at' => $doc->approved_at?->format('d-m-Y'),
                ];
            });

            // Hitung skor kelengkapan
            $total    = count(self::MATRIX_TYPES);
            $approved = $cells->filter(fn ($c) => $c['status'] === 'approved')->count();
            $draft    = $cells->filter(fn ($c) => $c['status'] === 'draft')->count();
            $missing  = $total - $approved - $draft;

            return [
                'organization' => [
                    'id'         => $org->id,
                    'code'       => $org->code,
                    'name'       => $org->name,
                    'type'       => $org->type,
                    'is_bappeda' => $org->is_bappeda,
                ],
                'cells'        => $cells,
                'score'        => [
                    'approved' => $approved,
                    'draft'    => $draft,
                    'missing'  => $missing,
                    'total'    => $total,
                    'pct'      => $total > 0 ? round(($approved / $total) * 100) : 0,
                ],
            ];
        });

        // Ringkasan provinsi keseluruhan
        $summary = [
            'total_org'          => $organizations->count(),
            'fully_complete'     => $matrix->filter(fn ($r) => $r['score']['missing'] === 0)->count(),
            'avg_completion_pct' => $matrix->isEmpty() ? 0 : round($matrix->avg(fn ($r) => $r['score']['pct'])),
        ];

        // Tahun yang tersedia (untuk dropdown filter)
        $availableYears = PlanningDocument::query()
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year');

        return Inertia::render('Planning/MonitoringMatrix', [
            'matrix'     => $matrix->values(),
            'types'      => collect(self::MATRIX_TYPES)->map(fn ($label, $key) => compact('key', 'label'))->values(),
            'year'       => $year,
            'years'      => $availableYears,
            'summary'    => $summary,
        ]);
    }
}
