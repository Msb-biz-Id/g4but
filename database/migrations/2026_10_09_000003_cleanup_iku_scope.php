<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('indicators')) {
            // 1. Hapus indikator level pemda
            DB::table('indicators')->where('level', 'pemda')->delete();

            // 2. Normalisasi nilai level: perangkat_daerah -> opd
            DB::table('indicators')
                ->where('level', 'perangkat_daerah')
                ->update(['level' => 'opd']);

            // Pastikan level selain 'opd' dan 'unit' diubah ke 'opd'
            DB::table('indicators')
                ->whereNotIn('level', ['opd', 'unit'])
                ->update(['level' => 'opd']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed for deleted pemda indicators
    }
};
