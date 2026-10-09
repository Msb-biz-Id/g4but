<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppConfig extends Model
{
    protected $fillable = [
        'group',
        'key',
        'value',
        'default_value',
        'label',
        'description',
        'type',
        'is_secret',
    ];

    protected $casts = [
        'value' => 'string',
        'default_value' => 'string',
        'is_secret' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saved(function () {
            Cache::forget('app_configs.all');
            Cache::forget('app_config_all');
            Cache::forget('app_theme_config');
        });
        static::deleted(function () {
            Cache::forget('app_configs.all');
            Cache::forget('app_config_all');
            Cache::forget('app_theme_config');
        });
    }

    /**
     * Ambil nilai konfigurasi dari database dengan per-request caching.
     * Kompatibel dengan pola SystemConfig::value() dari proyek JSX.
     */
    public static function value(string $key, mixed $default = null): mixed
    {
        $all = Cache::remember('app_configs.all', 3600, function () {
            return static::query()->get();
        });

        $aliases = [
            'app.name' => 'app_name',
            'app_name' => 'app.name',
            'session_lifetime_minutes' => 'security.session_lifetime',
            'security.session_lifetime' => 'session_lifetime_minutes',
            'max_login_attempts' => 'security.max_login_attempts',
            'security.max_login_attempts' => 'max_login_attempts',
            'ai_model' => 'ai.model',
            'ai.model' => 'ai_model',
            'ai_max_tokens' => 'ai.max_tokens',
            'ai.max_tokens' => 'ai_max_tokens',
        ];

        $config = $all->firstWhere('key', $key);
        if (! $config && isset($aliases[$key])) {
            $config = $all->firstWhere('key', $aliases[$key]);
        }

        if (! $config || ($config->value === null || $config->value === '')) {
            return $default;
        }

        return match ($config->type) {
            'boolean' => filter_var($config->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $config->value,
            'json' => json_decode($config->value ?? '{}', true),
            default => (string) $config->value,
        };
    }
}
