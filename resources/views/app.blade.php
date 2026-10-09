<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="e-KASUARI - Sistem Informasi Akuntabilitas Kinerja Terintegrasi Pemerintah Provinsi Papua Barat. Portal perencanaan, pengukuran kinerja SAKIP, dan keterbukaan informasi publik.">
        <meta name="keywords" content="e-kasuari, sakip papua barat, akuntabilitas kinerja, pemprov papua barat, iku, rpjmd, informasi publik papua barat, regulasi kinerja daerah">
        <meta name="author" content="Pemerintah Provinsi Papua Barat">
        <meta name="robots" content="index, follow">

        <!-- Open Graph / Facebook -->
        <meta property="og:site_name" content="e-KASUARI Papua Barat">
        <meta property="og:locale" content="id_ID">
        <meta property="og:type" content="website">
        <meta property="og:image" content="{{ asset('favicon-32x32.png') }}">

        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image">

        <script>
            (function () {
                var theme = localStorage.getItem('ekasuari-theme') || 'system';
                var dark = theme === 'dark' ||
                    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (dark) document.documentElement.classList.add('dark');
            })();
        </script>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32x32.png') }}">
        <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicon-16x16.png') }}">
        <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}">
        <link rel="manifest" href="{{ asset('site.webmanifest') }}">
        <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">
        <meta name="theme-color" content="#4f46e5">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
