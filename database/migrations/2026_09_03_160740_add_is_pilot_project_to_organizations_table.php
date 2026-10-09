<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * G-11: Tambah flag is_pilot_project ke organizations.
 * Menandai 4 OPD Pilot Phase 1: Bappeda, Inspektorat, Koperasi & UKM, PUPR.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (! Schema::hasColumn('organizations', 'is_pilot_project')) {
                $table->boolean('is_pilot_project')->default(false)->after('is_bappeda')
                    ->comment('G-11: true = OPD Pilot Phase 1 (4 OPD sesuai baseline §11)');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (Schema::hasColumn('organizations', 'is_pilot_project')) {
                $table->dropColumn('is_pilot_project');
            }
        });
    }
};
