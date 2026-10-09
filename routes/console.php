<?php

use App\Console\Commands\CleanAuditLogs;
use App\Console\Commands\EvaluateAlertRules;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// FR-EWS: Evaluasi alert rule aktif 1 kali sehari setiap hari kerja pukul 08:00 WIT (Senin - Jumat)
Schedule::command(EvaluateAlertRules::class)
    ->weekdays()
    ->dailyAt('08:00')
    ->timezone('Asia/Jayapura')
    ->withoutOverlapping()
    ->name('ews:evaluate-daily');

// Pembersihan otomatis Audit Log > 30 hari (dijalankan setiap tengah malam)
Schedule::command(CleanAuditLogs::class)
    ->daily()
    ->at('00:00')
    ->timezone('Asia/Jayapura')
    ->name('audit-logs:clean-30-days');
