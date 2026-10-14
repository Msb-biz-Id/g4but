<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiInsight;
use App\Models\AiOpdQuota;
use App\Models\AiPromptTemplate;
use App\Models\AiUseLog;
use App\Models\AppConfig;
use App\Models\Indicator;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Services\Ai\AiContextBuilder;
use App\Services\Ai\AiQuotaService;
use App\Services\Ai\AiService;
use App\Services\AuditService;
use App\Services\PdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AiController extends Controller
{
    public function __construct(
        private readonly AiService $ai,
        private readonly AiContextBuilder $contextBuilder,
        private readonly AiQuotaService $quotaService,
    ) {}

    public function index(): Response
    {
        $this->authorize('use-ai');

        $user = request()->user();
        $orgId = AiQuotaService::resolveOrganizationId($user);
        $kuota = $orgId ? $this->quotaService->infoKuota($orgId) : null;

        // Untuk pimpinan & admin tingkat OPD, kirim daftar unit kerja yang dapat dipilih
        $isLintasOpd = $user->isSuperAdmin() || $user->isOpdAdmin() || $user->hasRole('Kepala OPD');
        $organizations = $isLintasOpd
            ? Organization::query()
                ->whereIn('type', ['opd', 'sekretariat', 'bidang'])
                ->where('is_active', true)
                ->orderByRaw("CASE type WHEN 'opd' THEN 1 WHEN 'sekretariat' THEN 2 WHEN 'bidang' THEN 3 ELSE 4 END")
                ->orderBy('name')
                ->get(['id', 'name', 'short_name', 'code', 'type'])
            : $user->organizations()->get(['organizations.id', 'name', 'short_name', 'code', 'type']);

        return Inertia::render('Ai/Index', [
            'periods' => MeasurementPeriod::query()
                ->orderByDesc('end_date')
                ->get(['id', 'code', 'name', 'type']),
            'indicators' => Indicator::query()
                ->where('status', 'active')
                ->with('currentVersion:id,indicator_id,name')
                ->orderBy('code')
                ->get(['id', 'code', 'is_iku']),
            'provider' => app()->runningUnitTests()
                ? (string) config('ekasuari.ai.provider', 'mock')
                : (string) (AppConfig::value('ai.provider') ?: config('ekasuari.ai.provider')),
            'logs' => AiUseLog::query()
                ->with('user:id,name')
                ->latest('id')
                ->limit(10)
                ->get(),
            'insights' => AiInsight::query()
                ->with(['user:id,name', 'reviewer:id,name'])
                ->latest('id')
                ->limit(15)
                ->get(),
            'canManage' => $user->can('manage-ai'),
            'isLintasOpd' => $isLintasOpd,
            'organizations' => $organizations,
            // P1-F + P3-A: Info kuota untuk ditampilkan di UI (BR-AI-009)
            'kuotaHarian' => $kuota,
            'aiResult' => session('ai_result'),
        ]);
    }

    /**
     * Generate Ringkasan Executive Summary (FR-AI-001).
     * P1-D: Cek data kosong sebelum panggil AI (BR-AI-005).
     * P1-F: Cek dan konsumsi kuota harian OPD (BR-AI-009).
     */
    public function executiveSummary(Request $request): RedirectResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'period_id' => ['nullable', 'exists:measurement_periods,id'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
        ]);

        $user = $request->user();
        $orgId = AiQuotaService::resolveOrganizationId($user, $validated['organization_id'] ?? null);
        $periodId = $validated['period_id'] ?? null;

        // ── P1-F: Cek kuota harian OPD (BR-AI-009) ───────────────────────────
        if ($orgId !== null) {
            $kuotaCheck = $this->quotaService->check($orgId);
            if (! $kuotaCheck['ok']) {
                // MOD-AI-004: Catat kejadian RATE_LIMITED ke log (BR-AI-008)
                AiUseLog::create([
                    'user_id' => $request->user()->id,
                    'organization_id' => $orgId,
                    'feature' => 'executive_summary',
                    'provider' => 'none',
                    'status' => 'rate_limited',
                    'error_message' => $kuotaCheck['pesan'],
                    'latency_ms' => 0,
                ]);

                return back()->with('error', $kuotaCheck['pesan']);
            }
        }

        $context = $this->contextBuilder->executiveSummary($periodId, $orgId);

        // ── P1-D: Cek data kosong (BR-AI-005) ────────────────────────────────
        if ($context['data_empty']) {
            return back()->with('error', 'Data tervalidasi belum tersedia untuk periode dan OPD yang dipilih. AI tidak dipanggil.');
        }

        $periode = $context['period'] ?? null;

        try {
            $result = $this->ai->generate(
                'executive_summary',
                '',
                $context,
                sources: ['scope' => $context['scope'], 'period' => $context['period']],
                organizationId: $orgId,
                periode: $periode,
            );
        } catch (\Throwable $e) {
            // P1 (BR-AI-008): Pesan error timeout tetap sesuai spec §7, tidak bocorkan detail teknis ke user
            $isTimeout = str_contains(strtolower($e->getMessage()), 'timeout') || str_contains(strtolower($e->getMessage()), 'timed out');
            $pesanUser = $isTimeout
                ? 'Pemanggilan API AI gagal (Timeout). Silakan coba lagi atau hubungi Administrator.'
                : 'Pemanggilan API AI gagal. Silakan coba lagi atau hubungi Administrator.';

            return back()->with('error', $pesanUser);
        }

        // ── P1-F: Konsumsi kuota setelah berhasil ────────────────────────────
        if ($orgId !== null) {
            $this->quotaService->consume($orgId);
        }

        return back()
            ->with('ai_result', $result)
            ->with('success', 'Ringkasan eksekutif dibuat (hasil sistem).');
    }

    public function insight(Request $request): RedirectResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'period_id' => ['nullable', 'exists:measurement_periods,id'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
            'indicator_id' => ['nullable', 'exists:indicators,id'],
        ]);

        $user = $request->user();
        $orgId = AiQuotaService::resolveOrganizationId($user, $validated['organization_id'] ?? null);
        $periodId = $validated['period_id'] ?? null;

        $context = $this->contextBuilder->insightContext($validated['indicator_id'] ?? null, $orgId, $periodId);

        try {
            $result = $this->ai->generate(
                'insight',
                '',
                $context,
                sources: ['indicator' => $context['indicator_code'], 'scope' => $context['scope'], 'period' => $context['period']],
                organizationId: $orgId,
                periode: $context['period'] ?? null,
            );
        } catch (\Throwable $e) {
            return back()->with('error', 'Pemanggilan API AI gagal: '.$e->getMessage());
        }

        return back()->with('ai_result', $result)->with('success', 'Insight dibuat (hasil sistem).');
    }

    public function recommendation(Request $request): RedirectResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'period_id' => ['nullable', 'exists:measurement_periods,id'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
        ]);

        $user = $request->user();
        $orgId = AiQuotaService::resolveOrganizationId($user, $validated['organization_id'] ?? null);
        $periodId = $validated['period_id'] ?? null;

        // Cek kuota juga untuk rekomendasi
        if ($orgId !== null) {
            $kuotaCheck = $this->quotaService->check($orgId);
            if (! $kuotaCheck['ok']) {
                return back()->with('error', $kuotaCheck['pesan']);
            }
        }

        $context = $this->contextBuilder->recommendationContext($orgId, $periodId);

        try {
            $result = $this->ai->generate(
                'recommendation',
                '',
                $context,
                sources: ['scope' => $context['scope'], 'period' => $context['period']],
                organizationId: $orgId,
                periode: $context['period'] ?? null,
            );
        } catch (\Throwable $e) {
            return back()->with('error', 'Pemanggilan API AI gagal: '.$e->getMessage());
        }

        if ($orgId !== null) {
            $this->quotaService->consume($orgId);
        }

        return back()->with('ai_result', $result)->with('success', 'Rekomendasi tindak lanjut berhasil disusun.');
    }

    public function prediction(Request $request): RedirectResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'period_id' => ['nullable', 'exists:measurement_periods,id'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
            'indicator_id' => ['nullable', 'exists:indicators,id'],
        ]);

        $user = $request->user();
        $orgId = AiQuotaService::resolveOrganizationId($user, $validated['organization_id'] ?? null);
        $periodId = $validated['period_id'] ?? null;

        if ($orgId !== null) {
            $kuotaCheck = $this->quotaService->check($orgId);
            if (! $kuotaCheck['ok']) {
                return back()->with('error', $kuotaCheck['pesan']);
            }
        }

        $context = $this->contextBuilder->predictionContext($validated['indicator_id'] ?? null, $orgId, $periodId);

        try {
            $result = $this->ai->generate(
                'prediction',
                '',
                $context,
                sources: ['scope' => $context['scope'], 'period' => $context['period']],
                organizationId: $orgId,
                periode: $context['period'] ?? null,
            );
        } catch (\Throwable $e) {
            return back()->with('error', 'Pemanggilan AI Prediksi gagal: '.$e->getMessage());
        }

        if ($orgId !== null) {
            $this->quotaService->consume($orgId);
        }

        return back()->with('ai_result', $result)->with('success', 'Prediksi capaian akhir tahun berhasil dibuat.');
    }

    public function unitStatus(Request $request): RedirectResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'period_id' => ['nullable', 'exists:measurement_periods,id'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
        ]);

        $user = $request->user();
        $orgId = AiQuotaService::resolveOrganizationId($user, $validated['organization_id'] ?? null);
        $periodId = $validated['period_id'] ?? null;

        $context = $this->contextBuilder->unitStatusContext($orgId, $periodId);

        try {
            $result = $this->ai->generate(
                'unit_status',
                '',
                $context,
                sources: ['scope' => $context['scope'], 'period' => $context['period']],
                organizationId: $orgId,
                periode: $context['period'] ?? null,
            );
        } catch (\Throwable $e) {
            return back()->with('error', 'Pemanggilan analisis status unit kerja gagal: '.$e->getMessage());
        }

        return back()->with('ai_result', $result)->with('success', 'Status kinerja per unit kerja berhasil dievaluasi.');
    }

    public function opdStatus(Request $request): RedirectResponse
    {
        return $this->unitStatus($request);
    }

    public function chat(Request $request): RedirectResponse|JsonResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'history' => ['nullable', 'array', 'max:20'],
            'history.*.role' => ['required_with:history', 'string', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $orgId = AiQuotaService::resolveOrganizationId($user);

        // Cek kuota harian OPD (Super Admin dan Admin OPD memiliki akses bebas kuota/unlimited)
        $isUnlimitedUser = $user->isSuperAdmin() || $user->isOpdAdmin();
        if ($orgId !== null && ! $isUnlimitedUser) {
            $kuotaCheck = $this->quotaService->check($orgId);
            if (! $kuotaCheck['ok']) {
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => false,
                        'message' => $kuotaCheck['pesan'],
                    ], 429);
                }

                return back()->with('error', $kuotaCheck['pesan']);
            }
        }

        $context = $this->contextBuilder->chatContext($validated['message'], $validated['history'] ?? []);

        try {
            $result = $this->ai->generate(
                'chat',
                $validated['message'],
                $context,
                sources: ['message' => $validated['message']],
            );
        } catch (\RuntimeException $e) {
            // Guardrail memblokir prompt (misal: prompt injection atau kata sensitif)
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->with('error', $e->getMessage());
        } catch (\Throwable $e) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Layanan Asisten AI sedang tidak dapat dijangkau: '.$e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Pemanggilan API AI gagal: '.$e->getMessage());
        }

        if ($orgId !== null) {
            $this->quotaService->consume($orgId);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => $result['output'],
                'sources' => $result['sources'] ?? null,
                'provider' => $result['provider'] ?? 'AI Engine',
                'generated_at' => $result['generated_at'] ?? now()->toIso8601String(),
            ]);
        }

        return back()->with('ai_result', $result)->with('success', 'Asisten menjawab berdasarkan data berizin (AIG-008).');
    }

    public function executiveBrief(): RedirectResponse
    {
        $this->authorize('use-ai');

        $user = request()->user();
        $orgId = AiQuotaService::resolveOrganizationId($user);

        if ($orgId !== null) {
            $kuotaCheck = $this->quotaService->check($orgId);
            if (! $kuotaCheck['ok']) {
                return back()->with('error', $kuotaCheck['pesan']);
            }
        }

        $context = $this->contextBuilder->executiveSummary();
        $sources = ['scope' => $context['scope'], 'period' => $context['period']];

        if ($context['data_empty']) {
            return back()->with('error', 'Data tervalidasi belum tersedia. AI tidak dipanggil.');
        }

        try {
            $summary = $this->ai->generate('executive_summary', '', $context, sources: $sources, organizationId: $orgId, periode: $context['period'] ?? null);
            $recommendation = $this->ai->generate('recommendation', '', $context, sources: $sources, organizationId: $orgId, periode: $context['period'] ?? null);
        } catch (\Throwable $e) {
            return back()->with('error', 'Pemanggilan API AI gagal: '.$e->getMessage());
        }

        if ($orgId !== null) {
            $this->quotaService->consume($orgId);
        }

        $brief = "EXECUTIVE BRIEF (dihasilkan sistem)\n=================================\n\n"
            .'Periode: '.($context['period'] ?? 'terkini')."\n"
            .'Waktu generate: '.now()->toIso8601String()."\n\n"
            .$summary['output']."\n\n"
            .$recommendation['output']."\n\n"
            .'Sumber: realisasi & target tervalidasi sesuai hak akses.';

        $result = $summary;
        $result['output'] = $brief;
        $result['status'] = 'executive_brief';
        $result['generated_at'] = now()->toIso8601String();
        $result['insight_id'] = $recommendation['insight_id'];

        app(AuditService::class)->log('ai_executive_brief', 'ai_insight', $recommendation['insight_id']);

        return back()->with('ai_result', $result)->with('success', 'Executive brief dibuat (FR-DASH-010).');
    }

    /**
     * Review hasil AI oleh manusia (FR-AI-010, AIG-011): terima/tolak + rating opsional.
     */
    public function review(Request $request, AiInsight $insight): RedirectResponse
    {
        $this->authorize('use-ai');

        abort_unless(
            $insight->user_id === $request->user()->id || $request->user()->can('manage-ai'),
            403,
        );

        $validated = $request->validate([
            'decision' => ['required', 'in:accepted,rejected'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $insight->update([
            'status' => $validated['decision'],
            'rating' => $validated['rating'] ?? null,
            'review_comment' => $validated['comment'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        app(AuditService::class)->log('ai_insight_reviewed', 'ai_insight', $insight->id, null, [
            'decision' => $validated['decision'],
            'rating' => $validated['rating'] ?? null,
        ]);

        return back()->with(
            'success',
            $validated['decision'] === 'accepted'
                ? 'Hasil AI diterima dan tercatat (AIG-011).'
                : 'Hasil AI ditolak dan tetap tercatat untuk audit.',
        );
    }

    /**
     * Halaman kelola prompt template ber-versi (FR-AI-007, AIG-006).
     */
    public function templates(): Response
    {
        $this->authorize('manage-ai');

        return Inertia::render('Ai/Templates', [
            'templates' => AiPromptTemplate::query()
                ->with('creator:id,name')
                ->orderBy('feature')
                ->orderBy('version')
                ->get(),
            'features' => [
                ['value' => 'executive_summary', 'label' => 'Executive Summary'],
                ['value' => 'insight',           'label' => 'Performance Insight'],
                ['value' => 'recommendation',    'label' => 'Recommendation Draft'],
                ['value' => 'chat',              'label' => 'Chat Assistant'],
            ],
        ]);
    }

    /**
     * Membuat versi baru template prompt (AIG-006).
     */
    public function storeTemplate(Request $request): RedirectResponse
    {
        $this->authorize('manage-ai');

        $validated = $request->validate([
            'feature' => ['required', 'in:executive_summary,insight,recommendation,chat'],
            'name' => ['nullable', 'string', 'max:200'],
            'content' => ['required', 'string', 'min:10', 'max:4000'],
        ]);

        $template = $this->ai->createTemplateVersion(
            $validated['feature'],
            $validated['content'],
            $validated['name'] ?? null,
        );

        app(AuditService::class)->log(
            'ai_template_created',
            'ai_prompt_template',
            $template->id,
            null,
            ['feature' => $validated['feature'], 'version' => $template->version],
        );

        return back()->with(
            'success',
            'Versi '.$template->version.' template '.$template->feature.' dibuat dan diaktifkan.',
        );
    }

    /**
     * Mengaktifkan versi template tertentu dan menonaktifkan versi lain pada fitur yang sama.
     */
    public function activateTemplate(Request $request, AiPromptTemplate $template): RedirectResponse
    {
        $this->authorize('manage-ai');

        $this->ai->activateTemplate($template);

        app(AuditService::class)->log(
            'ai_template_activated',
            'ai_prompt_template',
            $template->id,
            null,
            ['feature' => $template->feature, 'version' => $template->version],
        );

        return back()->with(
            'success',
            'Template '.$template->feature.' v'.$template->version.' diaktifkan.',
        );
    }

    // ─── P3-B: Manajemen Kuota Harian per OPD (MOD-AI-006) ──────────────────────

    /**
     * Halaman manajemen kuota harian AI per OPD untuk Super Admin / Admin OPD.
     * Menampilkan daftar semua OPD aktif beserta kuota hari ini (atau default jika belum ada record).
     */
    public function quotaIndex(): Response
    {
        $this->authorize('manage-ai');

        $today = today()->toDateString();

        $defaultQuota = (int) (AppConfig::value('ai.daily_quota') ?: config('ekasuari.ai.daily_quota', 10));

        $organizations = Organization::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name', 'code'])
            ->map(function ($org) use ($today, $defaultQuota) {
                // Ambil kuota hari ini jika ada, tanpa membuat record baru
                $quota = AiOpdQuota::query()
                    ->where('organization_id', $org->id)
                    ->where('tanggal', $today)
                    ->first();

                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'short_name' => $org->short_name,
                    'code' => $org->code,
                    'kuota_hari_ini' => $quota ? [
                        'kuota_maksimal' => $quota->kuota_maksimal,
                        'terpakai' => $quota->terpakai,
                        'sisa' => $quota->sisa(),
                    ] : null,
                    'kuota_default' => $defaultQuota,
                ];
            });

        return Inertia::render('Ai/Quota', [
            'organizations' => $organizations,
            'kuota_default' => $defaultQuota,
            'today' => $today,
        ]);
    }

    /**
     * Update kuota maksimal harian AI untuk satu OPD (MOD-AI-006).
     * Membuat atau memperbarui record ai_opd_quota untuk hari ini.
     * Nilai -1 berarti unlimited.
     */
    public function quotaUpdate(Request $request, Organization $organization): RedirectResponse
    {
        $this->authorize('manage-ai');

        $validated = $request->validate([
            'kuota_maksimal' => ['required', 'integer', 'min:-1', 'max:1000'],
        ]);

        $quota = AiOpdQuota::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'tanggal' => today()->toDateString(),
            ],
            [
                'kuota_maksimal' => $validated['kuota_maksimal'],
            ]
        );

        app(AuditService::class)->log(
            'ai_quota_updated',
            'ai_opd_quota',
            $quota->id,
            null,
            [
                'organization' => $organization->name,
                'kuota_maksimal' => $validated['kuota_maksimal'],
                'tanggal' => today()->toDateString(),
            ]
        );

        return back()->with(
            'success',
            'Kuota AI '.$organization->short_name.' diperbarui menjadi '.
            ($validated['kuota_maksimal'] === -1 ? 'unlimited' : $validated['kuota_maksimal'].'/hari').'.'
        );
    }

    /**
     * Export Hasil Analisis AI sebagai Dokumen Resmi PDF e-SAKIP.
     */
    public function exportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'title' => ['required', 'string'],
            'feature' => ['nullable', 'string'],
            'scope' => ['nullable', 'string'],
            'output' => ['required', 'string'],
            'raw_output' => ['nullable', 'string'],
            'parsed_json' => ['nullable', 'string'],
        ]);

        $title = $validated['title'];
        $feature = $validated['feature'] ?? 'analisis';
        $scope = $validated['scope'] ?? (AppConfig::where('key', 'instansi_name')->value('value') ?: 'Pemerintah Daerah');
        $output = $validated['output'];
        $user = $request->user();
        $generatedAt = now()->format('d/m/Y H:i');

        // Ekstraksi parsed structured data untuk summary eksekutif
        $parsed = null;
        if (! empty($validated['parsed_json'])) {
            $decoded = json_decode($validated['parsed_json'], true);
            if (is_array($decoded) && (! empty($decoded['ringkasan']) || ! empty($decoded['perhatian']) || ! empty($decoded['rekomendasi']))) {
                $parsed = $decoded;
            }
        }

        if (! $parsed && ! empty($validated['raw_output'])) {
            $parsed = app(AiService::class)->parseExecutiveSummaryJson($validated['raw_output']);
        }

        if (! $parsed) {
            $parsed = app(AiService::class)->parseExecutiveSummaryJson($output);
        }

        // Fallback ekstraksi jika output berupa teks hasil getFormattedOutputText()
        if (! $parsed && (str_contains($output, 'Catatan Perhatian Khusus:') || str_contains($output, 'Rekomendasi Tindak Lanjut:'))) {
            $parts = preg_split('/(?=Catatan Perhatian Khusus:|Rekomendasi Tindak Lanjut:)/i', $output);
            $ringkasan = '';
            $perhatian = [];
            $rekomendasi = [];
            foreach ($parts as $part) {
                $partTrimmed = trim($part);
                if (stripos($partTrimmed, 'Catatan Perhatian Khusus:') === 0) {
                    $lines = explode("\n", substr($partTrimmed, strlen('Catatan Perhatian Khusus:')));
                    foreach ($lines as $l) {
                        $c = trim(ltrim(trim($l), '-•* '));
                        if (! empty($c) && ! str_starts_with(strtolower($c), 'sumber:')) {
                            $perhatian[] = ['catatan' => $c];
                        }
                    }
                } elseif (stripos($partTrimmed, 'Rekomendasi Tindak Lanjut:') === 0) {
                    $lines = explode("\n", substr($partTrimmed, strlen('Rekomendasi Tindak Lanjut:')));
                    foreach ($lines as $l) {
                        $c = trim(ltrim(trim($l), '-•* '));
                        if (! empty($c) && ! str_starts_with(strtolower($c), 'sumber:')) {
                            $rekomendasi[] = ['tindakan' => $c];
                        }
                    }
                } else {
                    $cleanPart = preg_replace('/Sumber:\s*analisis\s*otomatis.*$/i', '', $partTrimmed);
                    $ringkasan .= ($ringkasan ? "\n\n" : '').trim($cleanPart);
                }
            }
            if (! empty($ringkasan) || ! empty($perhatian) || ! empty($rekomendasi)) {
                $parsed = [
                    'ringkasan' => trim($ringkasan),
                    'perhatian' => $perhatian,
                    'rekomendasi' => $rekomendasi,
                ];
            }
        }

        $formattedContent = $this->formatOutputForPdf($output);

        $pdf = Pdf::loadView('pdf.ai-report', [
            'title' => $title,
            'feature' => $feature,
            'scope' => $scope,
            'output' => $output,
            'parsed' => $parsed,
            'formattedContent' => $formattedContent,
            'userName' => $user->name,
            'generatedAt' => $generatedAt,
            'logoBase64' => PdfService::getLogoBase64(),
            'provinceName' => PdfService::getProvinceName(),
            'appName' => PdfService::getAppName(),
        ])->setPaper('a4', 'portrait');

        $slug = Str::slug($feature.'-'.now()->format('Ymd-His'));

        return $pdf->download("laporan-analisis-ai-{$slug}.pdf");
    }

    private function formatOutputForPdf(string $text): string
    {
        // Jika teks masih dalam format JSON mentah, konversi ke narasi terstruktur terlebih dahulu
        if (AiService::isJsonLike($text)) {
            $text = AiService::convertJsonStringToNarrative($text);
        }

        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $lines = explode("\n", $text);

        $html = '';
        $inTable = false;
        $tableRows = [];

        foreach ($lines as $line) {
            $trimmed = trim($line);

            // Table rows (contains |)
            if (str_starts_with($trimmed, '|') && str_ends_with($trimmed, '|')) {
                if (preg_match('/^\|[\s\-:|]+\|$/', $trimmed)) {
                    continue; // Skip markdown separator row
                }
                $rawCells = explode('|', $trimmed);
                // Remove first and last empty elements
                array_shift($rawCells);
                array_pop($rawCells);
                $cells = array_map('trim', $rawCells);

                if (! $inTable) {
                    $inTable = true;
                    $tableRows = [];
                }
                $tableRows[] = $cells;

                continue;
            } else {
                if ($inTable) {
                    $html .= $this->renderHtmlTable($tableRows);
                    $inTable = false;
                    $tableRows = [];
                }
            }

            if ($trimmed === '') {
                $html .= '<div style="height: 5px;"></div>';

                continue;
            }

            // Divider line
            if (preg_match('/^[\-=]{3,}$/', $trimmed)) {
                $html .= '<hr style="border: none; border-top: 1px solid #cbd5e1; margin: 6px 0;" />';

                continue;
            }

            // Section title (starts with ### or contains — Pemerintah or 1. PILAR)
            if (str_starts_with($trimmed, '###') || preg_match('/^[0-9]+\.\s+PILAR/i', $trimmed) || str_contains($trimmed, ' — Pemerintah')) {
                $clean = ltrim($trimmed, '#- ');
                $html .= '<div class="section-title">'.htmlspecialchars($clean, ENT_QUOTES, 'UTF-8').'</div>';

                continue;
            }

            // Callout / Alert
            if (str_starts_with(strtolower($trimmed), 'kesimpulan') || str_starts_with(strtolower($trimmed), 'catatan') || str_starts_with(strtolower($trimmed), 'sumber:')) {
                $html .= '<div class="callout-box"><strong>'.$this->formatMarkdownInline($trimmed).'</strong></div>';

                continue;
            }

            // Numbered list
            if (preg_match('/^([0-9]+)\.\s+(.+)$/', $trimmed, $m)) {
                $html .= '<div class="list-item"><span class="list-num">'.$m[1].'.</span><span class="list-text">'.$this->formatMarkdownInline($m[2]).'</span></div>';

                continue;
            }

            // Bullet list
            if (str_starts_with($trimmed, '-') || str_starts_with($trimmed, '•') || str_starts_with($trimmed, '*')) {
                $clean = ltrim($trimmed, '-•* ');
                $html .= '<div class="list-item"><span class="list-bullet">•</span><span class="list-text">'.$this->formatMarkdownInline($clean).'</span></div>';

                continue;
            }

            // Regular paragraph
            $html .= '<p class="paragraph">'.$this->formatMarkdownInline($trimmed).'</p>';
        }

        if ($inTable) {
            $html .= $this->renderHtmlTable($tableRows);
        }

        return $html;
    }

    private function formatMarkdownInline(string $text): string
    {
        $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        $escaped = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $escaped);
        $escaped = preg_replace('/\*(.+?)\*/', '<em>$1</em>', $escaped);

        return $escaped;
    }

    private function renderHtmlTable(array $rows): string
    {
        if (empty($rows)) {
            return '';
        }
        $html = '<table class="data-table"><thead><tr>';
        $header = array_shift($rows);
        foreach ($header as $th) {
            $html .= '<th>'.$this->formatMarkdownInline($th).'</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $td) {
                $html .= '<td>'.$this->formatMarkdownInline($td).'</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';

        return $html;
    }
}
