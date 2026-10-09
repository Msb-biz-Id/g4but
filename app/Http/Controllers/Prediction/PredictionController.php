<?php

namespace App\Http\Controllers\Prediction;

use App\Http\Controllers\Controller;
use App\Models\Indicator;
use App\Models\Organization;
use App\Services\AuthorizationService;
use App\Services\TrendPredictor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PredictionController extends Controller
{
    public function __construct(
        private readonly TrendPredictor $predictor,
        private readonly AuthorizationService $authorization,
    ) {}

    public function index(): Response
    {
        $this->authorize('use-ai');

        $user = request()->user();
        $organizationIds = $this->authorization->accessibleOrganizationIds($user);
        $isOpdWide = $user && ($user->isSuperAdmin() || $user->isOpdAdmin() || $user->hasRole('Kepala OPD'));

        $indicators = Indicator::query()
            ->where('status', 'active')
            ->when(! $isOpdWide, function ($q) use ($organizationIds) {
                $q->where(function ($sub) use ($organizationIds) {
                    $sub->whereIn('owner_organization_id', $organizationIds)
                        ->orWhereNull('owner_organization_id');
                });
            })
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'is_iku']);

        return Inertia::render('Predictions/Index', [
            'indicators' => $indicators,
            'organizations' => Organization::query()
                ->whereIn('type', ['opd', 'sekretariat', 'bidang'])
                ->when(! $isOpdWide, fn ($q) => $q->whereIn('id', $organizationIds))
                ->orderByRaw("CASE type WHEN 'opd' THEN 1 WHEN 'sekretariat' THEN 2 WHEN 'bidang' THEN 3 ELSE 4 END")
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'type']),
            'predictions' => $this->predictor->dashboard(),
        ]);
    }

    public function generate(Request $request): RedirectResponse
    {
        $this->authorize('use-ai');

        $validated = $request->validate([
            'indicator_id' => ['required', 'integer', 'exists:indicators,id'],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'periods_ahead' => ['nullable', 'integer', 'min:1', 'max:4'],
        ]);

        $indicator = Indicator::query()->findOrFail((int) $validated['indicator_id']);

        $this->authorization->canAccessOrganization(
            $request->user(),
            (int) ($validated['organization_id'] ?? $indicator->owner_organization_id ?? 0),
        ) ?: abort(403);

        $prediction = $this->predictor->predict(
            (int) $validated['indicator_id'],
            isset($validated['organization_id']) ? (int) $validated['organization_id'] : null,
            (int) ($validated['periods_ahead'] ?? 1),
        );

        return back()->with('prediction', $prediction);
    }
}
