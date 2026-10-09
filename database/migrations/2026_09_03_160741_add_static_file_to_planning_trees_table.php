<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * G-14: Tambah kolom static_file_path dan static_file_label ke planning_trees.
 *
 * Baseline AC-015: "Tersedia tombol fallback unggah berkas gambar/PDF statis
 * sebagai alternatif jika pohon kinerja tidak dapat dibuat secara dinamis."
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planning_trees', function (Blueprint $table) {
            if (! Schema::hasColumn('planning_trees', 'static_file_path')) {
                $table->string('static_file_path', 500)->nullable()->after('description')
                    ->comment('AC-015: path file statis pohon kinerja (PDF/gambar)');
                $table->string('static_file_label', 255)->nullable()->after('static_file_path')
                    ->comment('Nama deskriptif file yang diupload');
            }
        });
    }

    public function down(): void
    {
        Schema::table('planning_trees', function (Blueprint $table) {
            $table->dropColumn(['static_file_path', 'static_file_label']);
        });
    }
};
