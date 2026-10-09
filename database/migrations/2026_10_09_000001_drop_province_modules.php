<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Drop modul tabel provinsi
        Schema::dropIfExists('realization_rpjmd_items');
        Schema::dropIfExists('realization_iku_items');

        // 2. Drop kolom spesifik provinsi di organizations
        if (Schema::hasTable('organizations')) {
            $colsToDrop = [];
            if (Schema::hasColumn('organizations', 'is_bappeda')) {
                $colsToDrop[] = 'is_bappeda';
            }
            if (Schema::hasColumn('organizations', 'is_pilot_project')) {
                $colsToDrop[] = 'is_pilot_project';
            }
            if (! empty($colsToDrop)) {
                Schema::table('organizations', function (Blueprint $table) use ($colsToDrop) {
                    $table->dropColumn($colsToDrop);
                });
            }

            // Hapus data organisasi level provinsi
            DB::table('organizations')->where('type', 'province')->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back columns if needed
        if (Schema::hasTable('organizations')) {
            Schema::table('organizations', function (Blueprint $table) {
                if (! Schema::hasColumn('organizations', 'is_bappeda')) {
                    $table->boolean('is_bappeda')->default(false)->after('is_active');
                }
                if (! Schema::hasColumn('organizations', 'is_pilot_project')) {
                    $table->boolean('is_pilot_project')->default(false)->after('is_bappeda');
                }
            });
        }
    }
};
