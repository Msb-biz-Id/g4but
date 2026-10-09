<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom `short_name` ke organizations.
 *
 * PlanningController (dan controller lain) memilih kolom short_name saat
 * mengambil daftar organisasi, tetapi kolom ini tidak ada di tabel asal.
 * Kolom ini nullable agar baris lama tidak memerlukan nilai awal.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('organizations', 'short_name')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            // Letakkan setelah name
            $table->string('short_name', 100)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (Schema::hasColumn('organizations', 'short_name')) {
                $table->dropColumn('short_name');
            }
        });
    }
};
