<?php

/**
 * Bootstrap file untuk shared hosting subfolder deployment.
 *
 * File ini menggantikan kebutuhan mod_rewrite dari root ke /public/.
 * Semua request dari Apache diarahkan ke sini melalui .htaccess,
 * kemudian file ini secara langsung men-bootstrap aplikasi Laravel
 * dari folder public/ tanpa melewati redirect HTTP ke direktori fisik.
 */

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Set working directory ke folder public agar asset path laravel benar
$_SERVER['SCRIPT_FILENAME'] = __DIR__.'/public/index.php';

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
