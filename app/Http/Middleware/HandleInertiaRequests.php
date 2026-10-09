<?php

namespace App\Http\Middleware;

use App\Models\AppConfig;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'job_title' => $user->job_title,
                    'roles' => $user->roles()->get(['roles.id', 'roles.name'])->map(
                        fn ($role) => [
                            'id' => $role->id,
                            'name' => $role->name,
                        ],
                    ),
                    'permissions' => $user->permissions()
                        ->pluck('name')
                        ->merge($user->roles()->with('permissions')->get()->pluck('permissions.*.name')->flatten())
                        ->unique()
                        ->values(),
                    'organizations' => $user->organizations()->get(['id', 'code', 'name'])->map(
                        fn ($org) => [
                            'id' => $org->id,
                            'code' => $org->code,
                            'name' => $org->name,
                            'is_default' => (bool) $org->pivot->is_default,
                        ],
                    ),
                ] : null,
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'ai_result' => session('ai_result'),
            ],
            'systemNotifications' => $user ? $this->resolveNotifications($user->id) : null,
            'theme' => $this->resolveTheme(),
            'appConfig' => $this->resolveAppConfig(),
        ];
    }

    /**
     * Load recent notifications and unread count for the authenticated user.
     *
     * @return array{unread_count: int, recent: array}
     */
    private function resolveNotifications(int $userId): array
    {
        try {
            $unreadCount = AppNotification::where('user_id', $userId)
                ->whereNull('read_at')
                ->count();

            $recent = AppNotification::where('user_id', $userId)
                ->latest('id')
                ->limit(15)

                ->get(['id', 'event', 'title', 'message', 'resource_type', 'resource_id', 'read_at', 'created_at'])
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'event' => $n->event,
                    'title' => $n->title,
                    'message' => $n->message,
                    'resource_type' => $n->resource_type,
                    'resource_id' => $n->resource_id,
                    'read_at' => $n->read_at?->toIso8601String(),
                    'created_at' => $n->created_at?->toIso8601String(),
                    'time_ago' => $n->created_at?->diffForHumans() ?? '',
                ])
                ->toArray();

            return compact('unreadCount', 'recent');
        } catch (\Throwable) {
            return ['unreadCount' => 0, 'recent' => []];
        }
    }

    /**
     * Load theme configuration from cache / app_configs table.
     *
     * @return array<string, string>
     */
    private function resolveTheme(): array
    {
        try {
            return Cache::remember('app_theme_config', 300, function () {
                $configs = AppConfig::whereIn('key', [
                    'theme.preset',
                    'theme.primary_hsl',
                    'theme.primary_hsl_dark',
                    'theme.radius',
                    'theme.font_heading',
                    'theme.font_body',
                ])->pluck('value', 'key')->toArray();

                return [
                    'preset' => $configs['theme.preset'] ?? 'indigo',
                    'primaryHsl' => $configs['theme.primary_hsl'] ?? '243 75% 59%',
                    'primaryHslDark' => $configs['theme.primary_hsl_dark'] ?? '243 75% 70%',
                    'radius' => $configs['theme.radius'] ?? '0.5',
                    'fontHeading' => $configs['theme.font_heading'] ?? 'Inter',
                    'fontBody' => $configs['theme.font_body'] ?? 'Inter',
                ];
            });
        } catch (\Throwable) {
            // Fallback default jika DB belum ready
            return [
                'preset' => 'indigo',
                'primaryHsl' => '243 75% 59%',
                'primaryHslDark' => '243 75% 70%',
                'radius' => '0.5',
                'fontHeading' => 'Inter',
                'fontBody' => 'Inter',
            ];
        }
    }

    /**
     * Load general app configuration (logo, favicon, images, name, description).
     *
     * @return array<string, string>
     */
    private function resolveAppConfig(): array
    {
        try {
            return Cache::remember('app_general_config', 300, function () {
                $configs = AppConfig::whereIn('key', [
                    'app_name', 'app_description', 'app_logo', 'app_favicon',
                    'ui_headline_image', 'ui_login_image',
                    'ui_headline_title', 'ui_headline_subtitle',
                ])->pluck('value', 'key')->toArray();

                return [
                    'appName' => $configs['app_name'] ?? 'e-KASUARI',
                    'appDescription' => $configs['app_description'] ?? 'Sistem Akuntabilitas Kinerja',
                    'logoUrl' => $configs['app_logo'] ?? '/logo.webp',
                    'faviconUrl' => $configs['app_favicon'] ?? '/favicon.ico',
                    'headlineImageUrl' => $configs['ui_headline_image'] ?? '/images/hero-banner.webp',
                    'loginImageUrl' => $configs['ui_login_image'] ?? '/images/login-bg.webp',
                    'headlineTitle' => $configs['ui_headline_title'] ?? '',
                    'headlineSubtitle' => $configs['ui_headline_subtitle'] ?? '',
                ];
            });
        } catch (\Throwable) {
            return [
                'appName' => 'e-KASUARI',
                'appDescription' => 'Sistem Akuntabilitas Kinerja',
                'logoUrl' => '/logo.webp',
                'faviconUrl' => '/favicon.ico',
                'headlineImageUrl' => '/images/hero-banner.webp',
                'loginImageUrl' => '/images/login-bg.webp',
                'headlineTitle' => '',
                'headlineSubtitle' => '',
            ];
        }
    }
}
