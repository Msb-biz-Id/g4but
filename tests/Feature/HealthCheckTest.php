<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Test suite Fase 3 — Infrastruktur & Operasional (FR-OPS-MON).
 *
 * Memverifikasi:
 *  1. Endpoint /health dapat diakses tanpa autentikasi.
 *  2. /health mengembalikan JSON dengan field yang benar.
 *  3. /health melaporkan status database sebagai 'ok'.
 *  4. /health melaporkan storage sebagai 'ok'.
 *  5. /health mengembalikan HTTP 200 saat semua check lulus.
 *  6. Endpoint /health tidak mengembalikan data sensitif.
 */
class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function health_endpoint_is_publicly_accessible_without_auth(): void
    {
        // Tidak perlu login — uptime monitor eksternal tidak punya session
        $response = $this->getJson('/health');

        $this->assertNotEquals(401, $response->status(), '/health tidak boleh mengembalikan 401');
        $this->assertNotEquals(403, $response->status(), '/health tidak boleh mengembalikan 403');
        $this->assertNotEquals(404, $response->status(), '/health harus terdaftar di routes');
    }

    #[Test]
    public function health_endpoint_returns_json(): void
    {
        $response = $this->getJson('/health');

        $response->assertHeader('Content-Type', 'application/json');
    }

    #[Test]
    public function health_response_contains_required_fields(): void
    {
        $response = $this->getJson('/health');

        $response->assertJsonStructure([
            'status',
            'app',
            'environment',
            'checks' => [
                'database',
                'queue',
                'storage',
            ],
            'timestamp',
        ]);
    }

    #[Test]
    public function health_reports_database_as_ok_when_connected(): void
    {
        // Di test environment, SQLite tersedia — harus 'ok'
        $response = $this->getJson('/health');

        $response->assertJsonPath('checks.database', 'ok');
    }

    #[Test]
    public function health_reports_storage_as_ok_when_writable(): void
    {
        $response = $this->getJson('/health');

        $response->assertJsonPath('checks.storage', 'ok');
    }

    #[Test]
    public function health_returns_http_200_when_all_checks_pass(): void
    {
        $response = $this->getJson('/health');

        // Jika semua check lulus, HTTP status harus 200
        if ($response->json('status') === 'ok') {
            $response->assertStatus(200);
        }
    }

    #[Test]
    public function health_reports_valid_status_value(): void
    {
        $response = $this->getJson('/health');

        $status = $response->json('status');
        $this->assertContains(
            $status,
            ['ok', 'degraded'],
            "Status harus 'ok' atau 'degraded', bukan '$status'"
        );
    }

    #[Test]
    public function health_does_not_expose_sensitive_information(): void
    {
        $response = $this->getJson('/health');

        $body = $response->getContent();

        // Pastikan tidak ada data sensitif yang bocor
        $this->assertStringNotContainsStringIgnoringCase('password', $body);
        $this->assertStringNotContainsStringIgnoringCase('secret', $body);
        $this->assertStringNotContainsStringIgnoringCase('api_key', $body);
        $this->assertStringNotContainsStringIgnoringCase('app_key', $body);
    }

    #[Test]
    public function health_app_name_matches_configured_name(): void
    {
        $response = $this->getJson('/health');

        $response->assertJsonPath('app', config('app.name'));
    }

    #[Test]
    public function health_timestamp_is_valid_iso8601(): void
    {
        $response = $this->getJson('/health');

        $timestamp = $response->json('timestamp');
        $this->assertNotNull($timestamp, 'Timestamp tidak boleh null');

        // Verifikasi format ISO 8601
        $parsed = \DateTime::createFromFormat(\DateTimeInterface::ATOM, $timestamp)
            ?: \DateTime::createFromFormat('Y-m-d\TH:i:s.u\Z', $timestamp)
            ?: \DateTime::createFromFormat('Y-m-d\TH:i:sP', $timestamp);

        $this->assertNotFalse($parsed, "Timestamp '$timestamp' bukan format ISO 8601 yang valid");
    }
}
