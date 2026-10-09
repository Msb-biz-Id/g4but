<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('action_plans')) {
            // Backfill activity from title where activity is empty or null
            DB::statement("UPDATE action_plans SET activity = title WHERE activity IS NULL OR activity = ''");

            // Backfill performance_period_id where null
            $firstPerfPeriod = DB::table('performance_periods')->where('year', 2026)->value('id')
                ?? DB::table('performance_periods')->value('id');

            if ($firstPerfPeriod) {
                DB::statement("UPDATE action_plans SET performance_period_id = {$firstPerfPeriod} WHERE performance_period_id IS NULL");
            }
        }
    }

    public function down(): void
    {
        // No destructive rollback needed
    }
};
