<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Indicator;
use App\Models\IntegrationLog;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\Realization;
use App\Services\IntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class IntegrationApiController extends Controller
{
    /**
     * Health check layanan integrasi (BRD §15.4).
     */
    public function health(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'ekasuari',
            'time' => now()->toIso8601String(),
            'version' => '1.0.0',
        ]);
    }

    /**
     * Penerimaan data realisasi dari sistem eksternal (BRD §15.2) secara idempotent.
     */
    public function receiveRealization(Request $request, IntegrationService $integration): JsonResponse
    {
        $request->validate([
            'external_id' => ['required', 'string', 'max:100'],
            'opd_code' => ['required', 'string', 'max:50'],
            'indicator_code' => ['required', 'string', 'max:50'],
            'period' => ['required', 'date_format:Y-m-d'],
            'value' => ['required', 'numeric'],
        ]);

        $idempotencyKey = $request->header('Idempotency-Key') ?: $request->string('external_id')->toString();
        $payload = $request->only(['external_id', 'opd_code', 'indicator_code', 'period', 'value']);

        $previous = IntegrationLog::query()
            ->where('integration_name', 'ekasuari-inbound')
            ->where('request_id', $idempotencyKey)
            ->where('status', 'success')
            ->first();

        if ($previous) {
            $integration->recordInbound(
                'ekasuari-inbound',
                $request->path(),
                $request->method(),
                $payload,
                $previous->response_body ?? ['replayed' => true],
                $idempotencyKey,
            );

            return response()->json([
                'idempotent_replay' => true,
                'data' => $previous->response_body,
            ]);
        }

        $result = $this->storeRealization($payload);

        $integration->recordInbound(
            'ekasuari-inbound',
            $request->path(),
            $request->method(),
            $payload,
            $result,
            $idempotencyKey,
        );

        if (! ($result['ok'] ?? false)) {
            return response()->json(['message' => $result['message'] ?? 'Gagal menyimpan realisasi.'], 422);
        }

        return response()->json(['data' => $result], 201);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function storeRealization(array $payload): array
    {
        $organization = Organization::query()
            ->where('code', $payload['opd_code'])
            ->first();

        if (! $organization) {
            return ['ok' => false, 'message' => "OPD dengan kode {$payload['opd_code']} tidak ditemukan."];
        }

        $indicator = Indicator::query()
            ->where('code', $payload['indicator_code'])
            ->where('owner_organization_id', $organization->id)
            ->first();

        if (! $indicator || ! $indicator->current_version_id) {
            return ['ok' => false, 'message' => "Indikator {$payload['indicator_code']} tidak ditemukan pada {$payload['opd_code']}."];
        }

        $date = Carbon::parse($payload['period']);

        $period = MeasurementPeriod::query()
            ->where('start_date', '<=', $date->toDateString())
            ->where('end_date', '>=', $date->toDateString())
            ->orderByDesc('start_date')
            ->first();

        if (! $period) {
            return ['ok' => false, 'message' => 'Periode pengukuran tidak ditemukan.'];
        }

        $realization = Realization::query()->withTrashed()->updateOrCreate(
            [
                'indicator_version_id' => $indicator->current_version_id,
                'organization_id' => $organization->id,
                'measurement_period_id' => $period->id,
            ],
            [
                'value' => $payload['value'],
                'status' => 'approved',
            ],
        );

        if ($realization->trashed()) {
            $realization->restore();
        }

        return [
            'ok' => true,
            'id' => $realization->id,
            'external_id' => $payload['external_id'],
        ];
    }
}
