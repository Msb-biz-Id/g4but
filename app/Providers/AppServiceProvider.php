<?php

namespace App\Providers;

use App\Services\AchievementCalculator;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use App\Services\PdfService;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AuthorizationService::class);
        $this->app->singleton(AuditService::class);
        $this->app->singleton(AchievementCalculator::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        app(AuthorizationService::class)->boot();

        $this->configureRateLimiting();

        // Menyediakan logo dinamis (Base64) & konfigurasi umum untuk seluruh template PDF / cetak
        View::composer(['pdf.*', 'reports.*'], function ($view) {
            $view->with([
                'logoBase64'   => PdfService::getLogoBase64(),
                'provinceName' => PdfService::getProvinceName(),
                'appName'      => PdfService::getAppName(),
            ]);
        });
    }

    /**
     * Configure rate limiters for sensitive routes (NFR-SEC-003).
     *
     * - login:  5 attempts/minute per IP  — brute-force protection
     * - ai:    20 requests/minute per user — prevent AI cost abuse
     * - import: 10 requests/minute per user — bulk-upload throttle
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $maxAttempts = app()->environment('local', 'testing') ? 100 : 15;
            return Limit::perMinute($maxAttempts)
                ->by($request->ip())
                ->response(fn () => response()->json([
                    'message' => 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
                ], 429));
        });

        RateLimiter::for('ai', function (Request $request): Limit {
            return Limit::perMinute(20)
                ->by($request->user()?->id ?: $request->ip())
                ->response(fn () => back()->with('error', 'Batas permintaan AI tercapai (20/menit). Tunggu sebentar.'));
        });

        RateLimiter::for('import', function (Request $request): Limit {
            return Limit::perMinute(10)
                ->by($request->user()?->id ?: $request->ip())
                ->response(fn () => back()->with('error', 'Batas upload import tercapai (10/menit). Coba lagi nanti.'));
        });
    }
}
