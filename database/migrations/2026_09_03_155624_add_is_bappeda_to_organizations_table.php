<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BR-003: Tambah flag is_bappeda ke tabel organizations.
 *
 * Flag ini digunakan oleh PlanningDocumentController untuk membatasi
 * upload RPJMD dan RKPD hanya kepada organisasi bertipe Bappeda.
 *
 * Alternatif: field organizations.type = 'bappeda' sudah ada dan tetap
 * digunakan sebagai primary check. is_bappeda adalah shortcut boolean
 * untuk query lebih cepat dan eksplisit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Sudah ada kolom 'type' (string). Tambah boolean shortcut.
            if (! Schema::hasColumn('organizations', 'is_bappeda')) {
                $table->boolean('is_bappeda')->default(false)->after('is_active')
                    ->comment('BR-003: true = Bappeda Provinsi, berhak upload RPJMD/RKPD');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (Schema::hasColumn('organizations', 'is_bappeda')) {
                $table->dropColumn('is_bappeda');
            }
        });
    }
};
