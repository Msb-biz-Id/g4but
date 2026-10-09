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
        if (Schema::hasTable('organizations')) {
            // 1. Tambah index (type, parent_id)
            Schema::table('organizations', function (Blueprint $table) {
                $table->index(['type', 'parent_id'], 'organizations_type_parent_idx');
            });

            // 2. Normalisasi type data lama
            // Konversi tipe-tipe lama ke 'opd', 'sekretariat', atau 'bidang'
            DB::table('organizations')
                ->where('type', 'biro')
                ->orWhere('name', 'like', '%Sekretariat%')
                ->update(['type' => 'sekretariat']);

            DB::table('organizations')
                ->where('type', 'unit')
                ->orWhere('type', 'inspektorat')
                ->update(['type' => 'bidang']);

            DB::table('organizations')
                ->whereNotIn('type', ['opd', 'sekretariat', 'bidang'])
                ->update(['type' => 'opd']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('organizations')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->dropIndex('organizations_type_parent_idx');
            });
        }
    }
};
