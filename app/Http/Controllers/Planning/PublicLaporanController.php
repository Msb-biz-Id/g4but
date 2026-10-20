<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningTree;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Portal Laporan Publik (MOD-003)
 * Menyajikan dokumen perencanaan Dinas PUPR yang sudah approved ke publik tanpa login.
 */
class PublicLaporanController extends Controller
{
    private const KATEGORI = [
        'perencanaan' => [
            'label' => 'Dokumen Perencanaan',
            'icon' => 'FileText',
            'description' => 'Mencakup Renstra, RKPD, Renja, RKT, Perjanjian Kinerja (PK), DPA, Rencana Aksi, Pohon Kinerja, Cascading, Proses Bisnis, Manajemen Risiko, dan Cross-cutting',
            'types' => [
                'renstra', 'rkpd', 'renja', 'rkt',
                'perjanjian_kinerja', 'dpa', 'rencana_aksi',
                'pohon_kinerja', 'cascading', 'proses_bisnis',
                'manajemen_risiko', 'crosscutting',
            ],
        ],
        'pengukuran' => [
            'label' => 'Pengukuran Kinerja',
            'icon' => 'Gauge',
            'description' => 'Mencakup Indikator Kinerja Utama (IKU) dan Target Capaian Indikator Sasaran',
            'types' => ['iku', 'target_indikator'],
        ],
        'pelaporan' => [
            'label' => 'Laporan Kinerja',
            'icon' => 'BarChart2',
            'description' => 'Mencakup Laporan Kinerja Instansi Pemerintah (LKjIP) dan Laporan Realisasi Kinerja',
            'types' => ['laporan_kinerja', 'laporan_realisasi'],
        ],
        'evaluasi' => [
            'label' => 'Evaluasi Kinerja',
            'icon' => 'ClipboardCheck',
            'description' => 'Mencakup Laporan Hasil Evaluasi (LHE) AKIP oleh Tim Evaluasi Internal',
            'types' => ['evaluasi_sakip'],
        ],
    ];

    private const TYPE_ALIASES = [
        'perjanjian_kinerja' => ['perjanjian_kinerja', 'pk'],
        'pk' => ['perjanjian_kinerja', 'pk'],
        'laporan_kinerja' => ['laporan_kinerja', 'lkjip'],
        'lkjip' => ['laporan_kinerja', 'lkjip'],
        'evaluasi_sakip' => ['evaluasi_sakip', 'lhe'],
        'lhe' => ['evaluasi_sakip', 'lhe'],
    ];

    private const TIPE_LABEL = [
        'rpjmd' => 'Renstra PUPR',
        'renstra' => 'Renstra PUPR',
        'renja' => 'Renja',
        'rkpd' => 'Renja / RKPD',
        'rkt' => 'RKT',
        'dpa' => 'DPA',
        'rencana_aksi' => 'Rencana Aksi',
        'perjanjian_kinerja' => 'Perjanjian Kinerja (PK)',
        'pk' => 'Perjanjian Kinerja (PK)',
        'pohon_kinerja' => 'Pohon Kinerja',
        'cascading' => 'Cascading Kinerja',
        'proses_bisnis' => 'Proses Bisnis',
        'manajemen_risiko' => 'Manajemen Risiko',
        'crosscutting' => 'Cross-cutting',
        'iku' => 'IKU',
        'target_indikator' => 'Target Indikator',
        'laporan_kinerja' => 'LKj / LKjIP',
        'lkjip' => 'LKj / LKjIP',
        'laporan_realisasi' => 'Laporan Realisasi',
        'evaluasi_sakip' => 'Evaluasi SAKIP (LHE)',
        'lhe' => 'Evaluasi SAKIP (LHE)',
    ];

    public function index(Request $request): InertiaResponse
    {
        $kategori = $request->string('kategori', 'perencanaan')->toString();
        $type = $request->string('type')->trim()->toString() ?: null;
        $organizationId = $request->integer('organization_id') ?: null;
        $year = $request->integer('year') ?: null;
        $search = $request->string('search')->trim()->toString();

        if (! array_key_exists($kategori, self::KATEGORI)) {
            $kategori = 'perencanaan';
        }

        $tipes = self::KATEGORI[$kategori]['types'];

        // Normalisasi alias jika ada
        if ($type === 'pk') {
            $type = 'perjanjian_kinerja';
        } elseif ($type === 'lkjip') {
            $type = 'laporan_kinerja';
        } elseif ($type === 'lhe') {
            $type = 'evaluasi_sakip';
        }

        // Validasi: type harus termasuk dalam kategori yang aktif
        if ($type && ! in_array($type, $tipes)) {
            $type = null;
        }

        $expandedTipes = $this->expandTypes($tipes);
        $filterTypes = $type ? $this->expandTypes([$type]) : $expandedTipes;

        $documents = PlanningDocument::query()
            ->with(['organization:id,code,name'])
            ->where('status', 'approved')
            ->whereIn('type', $filterTypes)
            ->when($organizationId, fn ($q) => $q->where('organization_id', $organizationId))
            ->when($year, fn ($q) => $q->where('year', $year))
            ->when($search, fn ($q) => $q->where(function ($sq) use ($search) {
                $sq->where('title', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            }))
            ->orderByDesc('year')
            ->orderBy('type')
            ->orderBy('title')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString()
            ->through(fn ($doc) => [
                'id' => $doc->id,
                'code' => $doc->code,
                'title' => $doc->title,
                'type' => $doc->type,
                'type_label' => self::TIPE_LABEL[$doc->type] ?? strtoupper($doc->type),
                'year' => $doc->year,
                'organization' => $doc->organization
                    ? ['id' => $doc->organization->id, 'code' => $doc->organization->code, 'name' => $doc->organization->name]
                    : null,
                'description' => $doc->description,
                'has_file' => ! empty($doc->file_path) && Storage::exists($doc->file_path),
                'file_size' => ! empty($doc->file_path) && Storage::exists($doc->file_path)
                    ? $this->formatFileSize(Storage::size($doc->file_path))
                    : null,
                'approved_at' => $doc->approved_at?->format('d-m-Y'),
                'download_url' => route('laporan.publik.download', $doc->id),
            ]);

        $organizations = Organization::query()
            ->whereHas('planningDocuments', fn ($q) => $q->where('status', 'approved')->whereIn('type', $expandedTipes)
            )
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $years = PlanningDocument::query()
            ->where('status', 'approved')
            ->whereIn('type', $expandedTipes)
            ->when($organizationId, fn ($q) => $q->where('organization_id', $organizationId))
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year');

        return Inertia::render('Public/LaporanPublik', [
            'documents' => $documents,
            'kategori' => $kategori,
            'activeType' => $type,
            'kategoriList' => collect(self::KATEGORI)->map(fn ($v, $k) => [
                'key' => $k,
                'label' => $v['label'],
                'icon' => $v['icon'],
                'description' => $v['description'] ?? '',
                'subItems' => collect($v['types'])->map(fn ($t) => [
                    'key' => $t,
                    'label' => self::TIPE_LABEL[$t] ?? strtoupper($t),
                ])->values()->all(),
            ])->values(),
            'organizations' => $organizations,
            'years' => $years,
            'filters' => [
                'kategori' => $kategori,
                'type' => $type,
                'organization_id' => $organizationId,
                'year' => $year,
                'search' => $search ?: null,
                'per_page' => $request->input('per_page'),
            ],
        ]);
    }

    public function download(int $id)
    {
        $doc = PlanningDocument::where('status', 'approved')
            ->whereNotNull('file_path')
            ->findOrFail($id);

        if (! Storage::exists($doc->file_path)) {
            abort(404, 'File tidak tersedia.');
        }

        $filename = $doc->code.'_'.$doc->year.'_'.str_replace(' ', '_', $doc->title);
        $ext = pathinfo($doc->file_path, PATHINFO_EXTENSION);

        return Storage::download($doc->file_path, "{$filename}.{$ext}");
    }

    /**
     * Tampilan interaktif Pohon Kinerja untuk akses publik tanpa login.
     */
    public function pohonKinerja(Request $request): InertiaResponse
    {
        $treeLevels = [
            'visi' => 'Visi / Tujuan',
            'outcome' => 'Sasaran Strategis',
            'csf' => 'Strategic Outcome',
            'kondisi_antara' => 'Tactical Outcome',
            'kondisi_operasional' => 'Operational Outcome',
            'output' => 'Output / Kegiatan',
        ];

        $query = PlanningTree::with(['indicator', 'organization:id,code,name,short_name', 'allChildren'])
            ->whereNull('parent_id')
            ->where('is_active', true);

        $selectedOrg = null;
        if ($request->filled('organization')) {
            $selectedOrg = Organization::where('code', $request->organization)
                ->orWhere('id', $request->organization)
                ->first();

            if ($selectedOrg) {
                // Ambil pohon akar milik instansi ini ATAU pohon makro provinsi yang memiliki turunan milik instansi ini
                $query->where(function ($q) use ($selectedOrg) {
                    $q->where('organization_id', $selectedOrg->id)
                        ->orWhereHas('children', function ($cq) use ($selectedOrg) {
                            $cq->where('organization_id', $selectedOrg->id)
                                ->orWhereHas('children', function ($ccq) use ($selectedOrg) {
                                    $ccq->where('organization_id', $selectedOrg->id)
                                        ->orWhereHas('children', function ($cccq) use ($selectedOrg) {
                                            $cccq->where('organization_id', $selectedOrg->id)
                                                ->orWhereHas('children', fn ($ccccq) => $ccccq->where('organization_id', $selectedOrg->id));
                                        });
                                });
                        });
                });
            } else {
                $query->where('organization_id', 0);
            }
        }

        $selectedPeriod = null;
        if ($request->filled('period')) {
            if ((int) $request->period > 2000) {
                $selectedPeriod = PerformancePeriod::where('year', (int) $request->period)->first();
                $query->whereHas('performancePeriod', fn ($q) => $q->where('year', (int) $request->period));
            } else {
                $selectedPeriod = PerformancePeriod::find($request->period);
                if ($selectedPeriod) {
                    $query->where('performance_period_id', $selectedPeriod->id);
                }
            }
        }

        $tree = $query->orderBy('sort_order')->get();
        $organizations = Organization::orderBy('name')->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderBy('year', 'desc')->get(['id', 'year']);

        return Inertia::render('Public/PohonKinerjaPublik', [
            'tree' => $tree,
            'organizations' => $organizations,
            'periods' => $periods,
            'treeLevels' => $treeLevels,
            'filters' => [
                'organization' => $selectedOrg ? (string) $selectedOrg->id : ($request->organization ?: ''),
                'period' => $selectedPeriod ? (string) $selectedPeriod->year : ($request->period ?: ''),
            ],
        ]);
    }

    private function formatFileSize(int $bytes): string
    {
        if ($bytes >= 1_048_576) {
            return round($bytes / 1_048_576, 1).' MB';
        }
        if ($bytes >= 1_024) {
            return round($bytes / 1_024, 1).' KB';
        }

        return $bytes.' B';
    }

    /**
     * Expand canonical type codes into array of accepted database aliases.
     */
    private function expandTypes(array $types): array
    {
        $expanded = [];
        foreach ($types as $t) {
            $aliases = self::TYPE_ALIASES[$t] ?? [$t];
            foreach ($aliases as $alias) {
                $expanded[] = $alias;
            }
        }

        return array_values(array_unique($expanded));
    }
}
