<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\PlanningDocument;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Monitoring Matrix Kelengkapan Dokumen OPD (MOD-003 / AC-007)
 *
 * Halaman eksklusif Super Admin dan Admin OPD untuk memantau
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
        'renstra' => 'Renstra',
        'renja' => 'Renja',
        'rkpd' => 'RKPD',
        'perjanjian_kinerja' => 'PK',
        'laporan_kinerja' => 'LKj',
        'evaluasi_sakip' => 'Evaluasi',
    ];

    private const TYPE_ALIASES = [
        'perjanjian_kinerja' => ['perjanjian_kinerja', 'pk'],
        'laporan_kinerja' => ['laporan_kinerja', 'lkjip'],
        'evaluasi_sakip' => ['evaluasi_sakip', 'lhe'],
    ];

    public function index(Request $request): Response
    {
        $this->authorize('view-planning-monitoring');

        $year = $request->integer('year', now()->year);

        // Semua OPD aktif
        $organizations = Organization::query()
            ->where('is_active', true)
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type']);

        $searchedTypes = [];
        foreach (array_keys(self::MATRIX_TYPES) as $t) {
            $searchedTypes = array_merge($searchedTypes, self::TYPE_ALIASES[$t] ?? [$t]);
        }
        $searchedTypes = array_values(array_unique($searchedTypes));

        // Ambil semua dokumen yang relevan untuk tahun evaluasi:
        $documents = PlanningDocument::query()
            ->whereIn('type', $searchedTypes)
            ->get(['id', 'organization_id', 'type', 'status', 'approved_at', 'year', 'start_year', 'end_year', 'periode_type'])
            ->filter(function ($doc) use ($year) {
                $isLimaTahunan = in_array($doc->type, ['renstra'], true)
                    || $doc->periode_type === '5_tahunan'
                    || $doc->periode_type === 'lima_tahunan';

                if ($isLimaTahunan) {
                    $start = $doc->start_year ?: $doc->year;
                    $end = $doc->end_year ?: ($start + 4);
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

        // Bangun baris matrix per OPD
        $matrix = $organizations->map(function (Organization $org) use ($documents) {
            $orgDocs = $documents->get($org->id, collect());

            $cells = collect(self::MATRIX_TYPES)->map(function ($label, $type) use ($orgDocs) {
                $aliases = self::TYPE_ALIASES[$type] ?? [$type];
                /** @var PlanningDocument|null $doc */
                $doc = $orgDocs->first(fn ($d) => in_array($d->type, $aliases, true));

                if (! $doc) {
                    return ['status' => 'missing', 'id' => null, 'approved_at' => null];
                }

                return [
                    'status' => $doc->status,
                    'id' => $doc->id,
                    'approved_at' => $doc->approved_at?->format('d-m-Y'),
                ];
            });

            // Hitung skor kelengkapan
            $total = count(self::MATRIX_TYPES);
            $approved = $cells->filter(fn ($c) => $c['status'] === 'approved')->count();
            $draft = $cells->filter(fn ($c) => $c['status'] === 'draft')->count();
            $missing = $total - $approved - $draft;

            return [
                'organization' => [
                    'id' => $org->id,
                    'code' => $org->code,
                    'name' => $org->name,
                    'type' => $org->type,
                ],
                'cells' => $cells,
                'score' => [
                    'approved' => $approved,
                    'draft' => $draft,
                    'missing' => $missing,
                    'total' => $total,
                    'pct' => $total > 0 ? round(($approved / $total) * 100) : 0,
                ],
            ];
        });

        // Ringkasan provinsi keseluruhan
        $summary = [
            'total_org' => $organizations->count(),
            'fully_complete' => $matrix->filter(fn ($r) => $r['score']['missing'] === 0)->count(),
            'avg_completion_pct' => $matrix->isEmpty() ? 0 : round($matrix->avg(fn ($r) => $r['score']['pct'])),
        ];

        // Tahun yang tersedia (untuk dropdown filter)
        $availableYears = PlanningDocument::query()
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year');

        return Inertia::render('Planning/MonitoringMatrix', [
            'matrix' => $matrix->values(),
            'types' => collect(self::MATRIX_TYPES)->map(fn ($label, $key) => compact('key', 'label'))->values(),
            'year' => $year,
            'years' => $availableYears,
            'summary' => $summary,
        ]);
    }
}
