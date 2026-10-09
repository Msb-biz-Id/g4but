<?php

return [
    'ews' => [
        'good_threshold' => (int) env('EKASUARI_EWS_GOOD_THRESHOLD', 80),
        'warning_threshold' => (int) env('EKASUARI_EWS_WARNING_THRESHOLD', 60),
    ],

    'cache' => [
        'dashboard_ttl' => (int) env('EKASUARI_CACHE_DASHBOARD_TTL', 60),
        'analytics_ttl' => (int) env('EKASUARI_CACHE_ANALYTICS_TTL', 300),
    ],

    'ai' => [
        'provider' => env('EKASUARI_AI_PROVIDER', 'mock'), // mock | http
        'service_url' => env('EKASUARI_AI_SERVICE_URL', 'http://127.0.0.1:8001'),
        'timeout' => (int) env('EKASUARI_AI_TIMEOUT', 50),    // BR-AI-011: max 50 detik
        'daily_quota' => (int) env('EKASUARI_AI_DAILY_QUOTA', 10), // BR-AI-009: default 10/hari per OPD (-1 = unlimited)
        // OpenAI-compatible provider (OpenRouter, OpenAI, dll) — DEC-AI-004: key disimpan di server
        'api_key' => env('OPENAI_API_KEY', ''),
        'base_url' => env('OPENAI_BASE_URL', 'https://openrouter.ai/api/v1'),
        'model' => env('OPENAI_MODEL', 'openai/gpt-4o-mini'),
    ],

    'integrations' => [
        'enabled' => (bool) env('EKASUARI_INTEGRATIONS_ENABLED', true),
        'timeout' => (int) env('EKASUARI_INTEGRATION_TIMEOUT', 15),
    ],

    // FR-IAM-006: Password policy yang dapat dikonfigurasi (tidak hardcode)
    'password_policy' => [
        'min_length' => (int) env('EKASUARI_PASSWORD_MIN_LENGTH', 8),
        'require_uppercase' => (bool) env('EKASUARI_PASSWORD_REQUIRE_UPPERCASE', true),
        'require_numbers' => (bool) env('EKASUARI_PASSWORD_REQUIRE_NUMBERS', true),
        'require_symbols' => (bool) env('EKASUARI_PASSWORD_REQUIRE_SYMBOLS', false),
    ],

    // FR-MSR-007: Enforcement evidence wajib sebelum submit realisasi
    'measurement' => [
        'require_evidence_on_submit' => (bool) env('EKASUARI_REQUIRE_EVIDENCE_ON_SUBMIT', false),
    ],
];
