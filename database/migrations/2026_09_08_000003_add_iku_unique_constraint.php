<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * IKU FINAL SPEC - Unique constraint pencegahan duplikasi IKU.
 *
 * Kombinasi berikut tidak boleh ganda:
 *   planning_period_id + level + owner_organization_id + strategic_objective_id + name
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        // Hapus unique constraint lama IF EXISTS dengan aman (terutama untuk PostgreSQL agar transaksi tidak abort)
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_name_unique');
            DB::statement('DROP INDEX IF EXISTS indicators_name_unique');
            DB::statement('ALTER TABLE indicators DROP CONSTRAINT IF EXISTS iku_duplicate_prevention');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS indicators_name_unique');
            DB::statement('DROP INDEX IF EXISTS iku_duplicate_prevention');
        } elseif ($driver === 'mysql') {
            try {
                Schema::table('indicators', function (Blueprint $table) {
                    $table->dropUnique('indicators_name_unique');
                });
            } catch (Throwable $e) {
            }
        }

        // Tambah unique constraint baru yang kontekstual
        Schema::table('indicators', function (Blueprint $table) {
            $table->unique(
                ['planning_period_id', 'level', 'owner_organization_id', 'strategic_objective_id', 'name'],
                'iku_duplicate_prevention'
            );
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE indicators DROP CONSTRAINT IF EXISTS iku_duplicate_prevention');
        } else {
            try {
                Schema::table('indicators', function (Blueprint $table) {
                    $table->dropUnique('iku_duplicate_prevention');
                });
            } catch (Throwable $e) {
            }
        }
    }
};
