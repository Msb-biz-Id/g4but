<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('code') - @yield('title') | e-SAKIP</title>
    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32x32.png') }}">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicon-16x16.png') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('site.webmanifest') }}">
    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">

    @php
        $themeConfig = \Illuminate\Support\Facades\Cache::get('app_theme_config');
        if (!$themeConfig) {
            try {
                $themeConfig = \App\Models\AppConfig::where('key', 'theme_config')->value('value');
                if ($themeConfig && is_string($themeConfig)) {
                    $themeConfig = json_decode($themeConfig, true);
                }
            } catch (\Throwable $e) {
                $themeConfig = null;
            }
        }
        $primaryColor = $themeConfig['primary_color'] ?? '#3b82f6';
    @endphp

    <meta name="theme-color" content="{{ $primaryColor }}">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600,700,800&display=swap" rel="stylesheet" />
    <style>
        :root {
            --primary: {{ $primaryColor }};
        }
        *, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            position: relative;
            overflow-x: hidden;
        }
        .glow-1 {
            position: absolute;
            top: -100px;
            left: -100px;
            width: 400px;
            height: 400px;
            background: var(--primary);
            opacity: 0.15;
            filter: blur(100px);
            border-radius: 50%;
            pointer-events: none;
        }
        .glow-2 {
            position: absolute;
            bottom: -100px;
            right: -100px;
            width: 400px;
            height: 400px;
            background: rgba(245, 158, 11, 0.12);
            filter: blur(100px);
            border-radius: 50%;
            pointer-events: none;
        }
        .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(51, 65, 85, 0.8);
            border-radius: 1.25rem;
            padding: 2.5rem 2rem;
            max-width: 32rem;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 10;
        }
        .brand {
            display: inline-flex;
            align-items: center;
            gap: 0.625rem;
            margin-bottom: 1.5rem;
        }
        .brand img {
            width: 36px;
            height: 36px;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .brand-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.025em;
        }
        .brand-badge {
            background: rgba(255, 255, 255, 0.1);
            color: var(--primary);
            padding: 0.15rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.7rem;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .code-display {
            font-size: 5rem;
            font-weight: 900;
            line-height: 1;
            margin-bottom: 0.5rem;
            color: var(--primary);
            font-family: monospace;
        }
        .status-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.08);
            color: #f8fafc;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 9999px;
            padding: 0.25rem 0.875rem;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        .title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.75rem;
            line-height: 1.3;
        }
        .message {
            color: #94a3b8;
            font-size: 0.9375rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            justify-content: center;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            border-radius: 0.625rem;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }
        .btn-primary {
            background: var(--primary);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        }
        .btn-primary:hover {
            filter: brightness(0.9);
            transform: translateY(-1px);
        }
        .btn-secondary {
            background: rgba(51, 65, 85, 0.6);
            color: #e2e8f0;
            border: 1px solid rgba(71, 85, 105, 0.6);
        }
        .btn-secondary:hover {
            background: rgba(71, 85, 105, 0.8);
        }
        .footer {
            margin-top: 1.75rem;
            font-size: 0.75rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="glow-1"></div>
    <div class="glow-2"></div>

    <div class="card">
        <div class="brand">
            <img src="{{ file_exists(public_path('logo.webp')) ? asset('logo.webp') : asset('logo.png') }}" alt="Logo PUPR Mimika">
            <span class="brand-title">e-SAKIP</span>
            <span class="brand-badge">Pemerintah Kabupaten Mimika</span>
        </div>

        <div class="code-display">@yield('code')</div>
        <div class="status-badge">Status @yield('code')</div>

        <h1 class="title">@yield('title')</h1>
        <p class="message">@yield('message')</p>

        <div class="actions">
            <a href="{{ url('/') }}" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Ke Beranda
            </a>
            <button onclick="window.location.reload()" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                Muat Ulang
            </button>
            <button onclick="window.history.back()" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                Kembali
            </button>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} Biro Organisasi Sekretariat Daerah Kabupaten Mimika. Hak Cipta Dilindungi.
        </div>
    </div>
</body>
</html>
