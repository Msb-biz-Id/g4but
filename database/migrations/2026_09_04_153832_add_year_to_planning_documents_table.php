<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom `year` ke planning_documents.
 *
 * Kolom ini diperlukan oleh PublicLaporanController (dan controller lain) yang
 * melakukan query/order berdasarkan `year`. Tabel yang dibuat oleh migration
 * 2026_08_24 hanya menyimpan start_year / end_year, sehingga kolom `year`
 * perlu ditambahkan secara terpisah.
 *
 * Nilai default diisi dari start_year (fallback 0) agar baris lama tidak NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('planning_documents', 'year')) {
            return;
        }

        Schema::table('planning_documents', function (Blueprint $table) {
            // Letakkan setelah kolom title agar urutan kolom intuitif
            $table->smallInteger('year')->default(0)->after('title');
        });

        // Isi nilai year dari start_year yang sudah ada (best-effort)
        DB::statement('UPDATE planning_documents SET year = start_year WHERE start_year IS NOT NULL AND year = 0');
    }

    public function down(): void
    {
        Schema::table('planning_documents', function (Blueprint $table) {
            if (Schema::hasColumn('planning_documents', 'year')) {
                $table->dropColumn('year');
            }
        });
    }
};
