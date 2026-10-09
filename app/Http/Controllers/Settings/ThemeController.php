<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * ThemeController — menyimpan dan mengambil konfigurasi tema visual.
 *
 * Semua key bertipe `theme.*` disimpan di app_configs dan di-share
 * ke semua halaman via HandleInertiaRequests::share().
 */
class ThemeController extends Controller
{
    /** Preset warna yang diizinkan (HSL light / dark). */
    private const PRESETS = [
        'indigo' => ['light' => '243 75% 59%',  'dark' => '243 75% 70%'],
        'blue' => ['light' => '217 91% 60%',  'dark' => '217 91% 70%'],
        'green' => ['light' => '142 71% 45%',  'dark' => '142 71% 55%'],
        'rose' => ['light' => '347 77% 60%',  'dark' => '347 77% 70%'],
        'orange' => ['light' => '25 95% 53%',   'dark' => '25 95% 63%'],
        'purple' => ['light' => '262 83% 58%',  'dark' => '262 83% 68%'],
        'teal' => ['light' => '180 70% 40%',  'dark' => '180 70% 55%'],
        'slate' => ['light' => '215 25% 40%',  'dark' => '215 25% 55%'],
        'custom' => null,
    ];

    private const FONTS_HEADING = ['Inter', 'Poppins', 'Plus Jakarta Sans'];

    private const FONTS_BODY = ['Inter', 'DM Sans', 'Nunito'];

    private const RADIUS_RANGE = [0.0, 0.25, 0.5, 0.75, 1.0, 1.5];

    /**
     * Simpan pengaturan tema.
     */
    public function update(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()?->hasRole('Super Admin'),
            403,
            'Hanya Super Admin yang dapat mengubah tema sistem.'
        );

        $validated = $request->validate([
            'preset' => 'required|in:'.implode(',', array_keys(self::PRESETS)),
            'primary_hsl' => 'nullable|string|max:50',
            'radius' => 'required|numeric|min:0|max:1.5',
            'font_heading' => 'required|in:'.implode(',', self::FONTS_HEADING),
            'font_body' => 'required|in:'.implode(',', self::FONTS_BODY),
        ]);

        $preset = $validated['preset'];
        $isCustom = ($preset === 'custom');

        // Tentukan HSL value berdasarkan preset atau custom input
        if ($isCustom && ! empty($validated['primary_hsl'])) {
            $lightHsl = $validated['primary_hsl'];
            $darkHsl = $validated['primary_hsl']; // sama untuk custom
        } elseif (isset(self::PRESETS[$preset])) {
            $lightHsl = self::PRESETS[$preset]['light'];
            $darkHsl = self::PRESETS[$preset]['dark'];
        } else {
            $lightHsl = '243 75% 59%';
            $darkHsl = '243 75% 70%';
        }

        $updates = [
            'theme.preset' => $preset,
            'theme.primary_hsl' => $lightHsl,
            'theme.primary_hsl_dark' => $darkHsl,
            'theme.radius' => (string) $validated['radius'],
            'theme.font_heading' => $validated['font_heading'],
            'theme.font_body' => $validated['font_body'],
        ];

        foreach ($updates as $key => $value) {
            AppConfig::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'type' => 'string',
                    'group' => 'Tema',
                    'is_secret' => false,
                ]
            );
        }

        Cache::forget('app_theme_config');
        Cache::forget('app_configs.all');
        Cache::forget('app_config_all');

        return back()->with('success', 'Tema berhasil disimpan.');
    }

    /**
     * Reset ke tema default.
     */
    public function reset(Request $request): RedirectResponse
    {
        abort_unless(
            $request->user()?->hasRole('Super Admin'),
            403,
            'Hanya Super Admin yang dapat mereset tema sistem.'
        );

        $defaults = [
            'theme.preset' => 'indigo',
            'theme.primary_hsl' => '243 75% 59%',
            'theme.primary_hsl_dark' => '243 75% 70%',
            'theme.radius' => '0.5',
            'theme.font_heading' => 'Inter',
            'theme.font_body' => 'Inter',
        ];

        foreach ($defaults as $key => $value) {
            AppConfig::where('key', $key)->update(['value' => $value]);
        }

        Cache::forget('app_theme_config');
        Cache::forget('app_configs.all');
        Cache::forget('app_config_all');

        return back()->with('success', 'Tema direset ke default.');
    }
}
