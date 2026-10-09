<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * G-17: Tambah kolom periode_type ke planning_documents.
 *
 * Super Admin bisa set manual. Default otomatis dari tipe dokumen:
 *   5_tahunan : rpjmd, renstra
 *   tahunan   : semua jenis lainnya
 */
return new class extends Migration
{
    private const LIMA_TAHUNAN = ['rpjmd', 'renstra'];

    public function up(): void
    {
        Schema::table('planning_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('planning_documents', 'periode_type')) {
                $table->string('periode_type', 20)->default('tahunan')->after('type')
                    ->comment('G-17: 5_tahunan | tahunan — ditentukan Super Admin');
            }
        });

        // Isi otomatis untuk data yang sudah ada
        DB::table('planning_documents')
            ->whereIn('type', self::LIMA_TAHUNAN)
            ->update(['periode_type' => '5_tahunan']);
    }

    public function down(): void
    {
        Schema::table('planning_documents', function (Blueprint $table) {
            if (Schema::hasColumn('planning_documents', 'periode_type')) {
                $table->dropColumn('periode_type');
            }
        });
    }
};
