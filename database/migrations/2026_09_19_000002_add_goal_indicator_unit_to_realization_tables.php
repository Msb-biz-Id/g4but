<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('realization_rpjmd_items')) {
            Schema::table('realization_rpjmd_items', function (Blueprint $table) {
                if (! Schema::hasColumn('realization_rpjmd_items', 'goal_indicator_unit')) {
                    $table->string('goal_indicator_unit', 100)->nullable()->after('goal_indicator');
                }
            });
        }

        if (Schema::hasTable('realization_opd_items')) {
            Schema::table('realization_opd_items', function (Blueprint $table) {
                if (! Schema::hasColumn('realization_opd_items', 'goal_indicator_unit')) {
                    $table->string('goal_indicator_unit', 100)->nullable()->after('goal_indicator');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('realization_rpjmd_items')) {
            Schema::table('realization_rpjmd_items', function (Blueprint $table) {
                if (Schema::hasColumn('realization_rpjmd_items', 'goal_indicator_unit')) {
                    $table->dropColumn('goal_indicator_unit');
                }
            });
        }

        if (Schema::hasTable('realization_opd_items')) {
            Schema::table('realization_opd_items', function (Blueprint $table) {
                if (Schema::hasColumn('realization_opd_items', 'goal_indicator_unit')) {
                    $table->dropColumn('goal_indicator_unit');
                }
            });
        }
    }
};
