<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('indicator_targets', function (Blueprint $table) {
            if (! Schema::hasColumn('indicator_targets', 'year')) {
                $table->smallInteger('year')->nullable()->after('planning_period_id');
                $table->index('year');
            }
        });

        $driver = DB::getDriverName();

        // Drop unique constraint lama IF EXISTS dengan aman (PostgreSQL & SQLite safe)
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE indicator_targets DROP CONSTRAINT IF EXISTS indicator_targets_indicator_version_id_organization_id_planning_period_id_unique');
            DB::statement('DROP INDEX IF EXISTS indicator_targets_indicator_version_id_organization_id_planning_period_id_unique');
            DB::statement('ALTER TABLE indicator_targets DROP CONSTRAINT IF EXISTS indicator_targets_version_org_period_year_unique');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS indicator_targets_indicator_version_id_organization_id_planning_period_id_unique');
            DB::statement('DROP INDEX IF EXISTS indicator_targets_version_org_period_year_unique');
        } else {
            try {
                Schema::table('indicator_targets', function (Blueprint $table) {
                    $table->dropUnique(['indicator_version_id', 'organization_id', 'planning_period_id']);
                });
            } catch (\Throwable $e) {}
        }

        // Tambah unique constraint baru yang mencakup kolom year
        Schema::table('indicator_targets', function (Blueprint $table) {
            $table->unique(
                ['indicator_version_id', 'organization_id', 'planning_period_id', 'year'],
                'indicator_targets_version_org_period_year_unique'
            );
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE indicator_targets DROP CONSTRAINT IF EXISTS indicator_targets_version_org_period_year_unique');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS indicator_targets_version_org_period_year_unique');
        } else {
            try {
                Schema::table('indicator_targets', function (Blueprint $table) {
                    $table->dropUnique('indicator_targets_version_org_period_year_unique');
                });
            } catch (\Throwable $e) {}
        }

        Schema::table('indicator_targets', function (Blueprint $table) {
            if (Schema::hasColumn('indicator_targets', 'year')) {
                $table->dropColumn('year');
            }
        });
    }
};
