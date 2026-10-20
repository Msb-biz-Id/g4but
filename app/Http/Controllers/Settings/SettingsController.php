<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AppConfig;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /** Kunci yang diizinkan untuk upload aset file. */
    private const ASSET_KEYS = [
        'app_logo' => ['dest' => 'logo.webp',              'public' => '/logo.webp'],
        'app_favicon' => ['dest' => 'favicon.ico',           'public' => '/favicon.ico'],
        'ui_headline_image' => ['dest' => 'images/hero-banner.webp', 'public' => '/images/hero-banner.webp'],
        'ui_login_image' => ['dest' => 'images/login-bg.webp',   'public' => '/images/login-bg.webp'],
    ];

    public function index(Request $request): Response
    {
        $this->authorize('config:manage');

        $configs = AppConfig::orderBy('group')->orderBy('key')->get();
        $groups = $configs->pluck('group')->unique()->filter()->values()->toArray();

        return Inertia::render('Settings/Index', [
            'configs' => $configs,
            'groups' => $groups,
            'canManage' => $request->user()->hasPermissionTo('config:manage'),
        ]);
    }

    public function updateBatch(Request $request): RedirectResponse
    {
        $this->authorize('config:manage');

        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        $themeChanged = false;
        $generalChanged = false;
        $updatedKeys = [];

        foreach ($validated['settings'] as $keyOrId => $value) {
            $config = is_numeric($keyOrId)
                ? AppConfig::find($keyOrId)
                : AppConfig::where('key', $keyOrId)->first();

            if (! $config) {
                continue;
            }

            if ($config->type === 'boolean') {
                $val = filter_var($value ?? false, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
            } else {
                $val = $value !== null ? (string) $value : null;
            }

            $config->update(['value' => $val]);
            $updatedKeys[] = $config->key;

            if (str_starts_with($config->key, 'theme.')) {
                $themeChanged = true;
            }
            if (str_starts_with($config->key, 'app_') || str_starts_with($config->key, 'ui_') || str_starts_with($config->key, 'app.')) {
                $generalChanged = true;
            }
        }

        if ($themeChanged) {
            Cache::forget('app_theme_config');
        }
        if ($generalChanged) {
            Cache::forget('app_general_config');
        }
        Cache::forget('app_configs.all');
        Cache::forget('app_config_all');

        app(AuditService::class)->log(
            'config_batch_updated', 'app_config', null, null,
            ['keys' => $updatedKeys]
        );

        return back()->with('success', 'Semua pengaturan pada tab ini berhasil disimpan.');
    }

    public function update(Request $request, $config): RedirectResponse
    {
        $this->authorize('config:manage');

        $configModel = $config instanceof AppConfig
            ? $config
            : (is_numeric($config) ? AppConfig::findOrFail($config) : AppConfig::where('key', $config)->firstOrFail());

        $data = $request->validate(['value' => 'nullable']);

        if ($configModel->type === 'boolean') {
            $val = filter_var($data['value'] ?? false, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
        } else {
            $val = $data['value'] !== null ? (string) $data['value'] : null;
        }

        $configModel->update(['value' => $val]);

        // Hapus cache tema jika config tema yang diubah
        if (str_starts_with($configModel->key, 'theme.')) {
            Cache::forget('app_theme_config');
        }
        if (str_starts_with($configModel->key, 'app_') || str_starts_with($configModel->key, 'ui_')) {
            Cache::forget('app_general_config');
        }

        app(AuditService::class)->log(
            'config_updated', 'app_config', $configModel->id, null,
            ['key' => $configModel->key, 'value' => $val]
        );

        $label = $configModel->label ?: $configModel->key;

        return back()->with('success', "Konfigurasi '{$label}' berhasil disimpan.");
    }

    public function reset($config): RedirectResponse
    {
        $this->authorize('config:manage');

        $configModel = $config instanceof AppConfig
            ? $config
            : (is_numeric($config) ? AppConfig::findOrFail($config) : AppConfig::where('key', $config)->firstOrFail());

        $configModel->update(['value' => $configModel->default_value]);

        Cache::forget('app_theme_config');
        Cache::forget('app_general_config');

        app(AuditService::class)->log(
            'config_reset', 'app_config', $configModel->id, null,
            ['key' => $configModel->key]
        );

        $label = $configModel->label ?: $configModel->key;

        return back()->with('success', "Konfigurasi '{$label}' dikembalikan ke nilai default.");
    }

    public function uploadAsset(Request $request): RedirectResponse
    {
        $this->authorize('config:manage');

        $request->validate([
            'asset_key' => 'required|string|in:'.implode(',', array_keys(self::ASSET_KEYS)),
            'file' => 'required|file|mimes:jpg,jpeg,png,gif,ico,svg,webp|max:3072',
        ]);

        $key = $request->input('asset_key');
        $meta = self::ASSET_KEYS[$key];
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: 'webp');

        if ($key === 'app_logo') {
            $destFile = "logo.{$ext}";
            $dest = public_path($destFile);
            $publicPath = "/{$destFile}";
        } else {
            $dest = public_path($meta['dest']);
            $publicPath = $meta['public'];
        }

        // Pastikan direktori tujuan ada
        $dir = dirname($dest);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Pindahkan file ke public path (overwrite)
        $file->move($dir, basename($dest));

        // Sinkronisasi fallback salinan jika upload logo
        if ($key === 'app_logo') {
            if ($dest !== public_path('logo.webp') && is_file($dest)) {
                @copy($dest, public_path('logo.webp'));
            }
            if ($dest !== public_path('images/logo.png') && is_file($dest)) {
                @copy($dest, public_path('images/logo.png'));
            }
        }

        // Perbarui nilai di app_configs (tambah cache-bust querystring)
        AppConfig::where('key', $key)->update([
            'value' => $publicPath.'?v='.time(),
            'updated_at' => now(),
        ]);

        Cache::forget('app_general_config');
        Cache::forget('app_configs.all');
        Cache::forget('app_config_all');

        app(AuditService::class)->log(
            'asset_uploaded', 'app_config', null, null, ['key' => $key]
        );

        return back()->with('success', "Aset '{$key}' berhasil diunggah.");
    }

    /**
     * Upload gambar logo untuk slide logo mitra di beranda.
     */
    public function uploadSliderLogo(Request $request)
    {
        $this->authorize('config:manage');

        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,gif,ico,svg,webp|max:3072',
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        $filename = 'slider_' . time() . '_' . \Illuminate\Support\Str::random(6) . '.' . $ext;
        $dir = public_path('uploads/slider-logos');

        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $file->move($dir, $filename);

        return response()->json([
            'success' => true,
            'url' => '/uploads/slider-logos/' . $filename,
        ]);
    }

    /**
     * Simpan seluruh daftar slide logo mitra dari pengaturan.
     */
    public function saveSliderLogos(Request $request): RedirectResponse
    {
        $this->authorize('config:manage');

        $validated = $request->validate([
            'logos' => 'required|array',
            'logos.*.id' => 'nullable|string',
            'logos.*.name' => 'required|string|max:150',
            'logos.*.image' => 'required|string',
            'logos.*.url' => 'nullable|string|max:255',
            'logos.*.active' => 'nullable|boolean',
        ]);

        AppConfig::updateOrCreate(
            ['key' => 'ui_logo_slider'],
            [
                'group' => 'UI',
                'label' => 'Slide Logo Mitra & Terkait',
                'description' => 'Daftar logo instansi, mitra, dan tautan yang tampil pada slider beranda di bawah headline.',
                'type' => 'json',
                'value' => json_encode($validated['logos'], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
                'default_value' => '[]',
                'is_secret' => false,
            ]
        );

        Cache::forget('app_general_config');
        Cache::forget('app_configs.all');
        Cache::forget('app_config_all');

        app(AuditService::class)->log(
            'slider_logos_updated', 'app_config', null, null,
            ['count' => count($validated['logos'])]
        );

        return back()->with('success', 'Pengaturan slide logo beranda berhasil disimpan.');
    }
}
