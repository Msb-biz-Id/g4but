<?php

namespace App\Services;

use App\Models\IntegrationLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Integration layer dengan contract ber-versi (BRD §15.1) dan idempotency key (BRD §15.5).
 * Semua panggilan masuk/keluar dicatat ke integration_logs (BRD §14.2).
 */
class IntegrationService
{
    /**
     * Panggil API eksternal dengan idempotency key + pencatatan log.
     *
     * @param  array<string, mixed>  $payload
     * @return array{replayed: bool, request_id: string, status: string, data: mixed}
     */
    public function send(
        string $integrationName,
        string $endpoint,
        string $method,
        array $payload,
        ?string $idempotencyKey = null,
    ): array {
        $requestId = $idempotencyKey ?: (string) Str::uuid();

        $previous = IntegrationLog::query()
            ->where('integration_name', $integrationName)
            ->where('request_id', $requestId)
            ->where('status', 'success')
            ->first();

        if ($previous) {
            return [
                'replayed' => true,
                'request_id' => $requestId,
                'status' => 'success',
                'data' => $previous->response_body,
            ];
        }

        $started = microtime(true);

        try {
            $response = Http::timeout((int) config('ekasuari.integrations.timeout', 15))
                ->withHeaders(['Idempotency-Key' => $requestId])
                ->{$method}($endpoint, $payload);

            $data = $response->json();
            $status = $response->successful() ? 'success' : 'failed';

            $this->record($integrationName, 'out', $endpoint, strtoupper($method), $requestId, $status, $payload, $data, $response->successful() ? null : $response->body());
        } catch (\Throwable $e) {
            $status = 'failed';
            $data = null;
            $this->record($integrationName, 'out', $endpoint, strtoupper($method), $requestId, $status, $payload, null, $e->getMessage());
        }

        return [
            'replayed' => false,
            'request_id' => $requestId,
            'status' => $status,
            'data' => $data,
        ];
    }

    /**
     * Catat panggilan masuk (inbound callback/API) ke log integrasi.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>|null  $response
     */
    public function recordInbound(
        string $integrationName,
        string $endpoint,
        string $method,
        array $payload,
        array $response,
        ?string $requestId = null,
    ): IntegrationLog {
        return $this->record(
            $integrationName,
            'in',
            $endpoint,
            $method,
            $requestId ?: (string) Str::uuid(),
            'success',
            $payload,
            $response,
        );
    }

    /**
     * @param  array<string, mixed>  $requestBody
     * @param  array<string, mixed>|null  $responseBody
     */
    public function record(
        string $integrationName,
        string $direction,
        string $endpoint,
        string $method,
        string $requestId,
        string $status,
        array $requestBody,
        ?array $responseBody,
        ?string $errorMessage = null,
    ): IntegrationLog {
        $previous = IntegrationLog::query()
            ->where('integration_name', $integrationName)
            ->where('request_id', $requestId)
            ->where('status', 'failed')
            ->first();

        return IntegrationLog::create([
            'integration_name' => $integrationName,
            'direction' => $direction,
            'endpoint' => $endpoint,
            'http_method' => $method,
            'request_id' => $requestId,
            'status' => $status,
            'request_body' => $requestBody,
            'response_body' => $responseBody,
            'error_message' => $errorMessage ? Str::limit($errorMessage, 250) : null,
            'retry_count' => $previous ? $previous->retry_count + 1 : 0,
        ]);
    }
}
