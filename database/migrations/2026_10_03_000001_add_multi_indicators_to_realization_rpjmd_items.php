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
        if (Schema::hasTable('realization_rpjmd_items')) {
            Schema::table('realization_rpjmd_items', function (Blueprint $table) {
                if (!Schema::hasColumn('realization_rpjmd_items', 'goal_indicators')) {
                    $table->json('goal_indicators')->nullable()->after('goal_indicator_unit');
                }
                if (!Schema::hasColumn('realization_rpjmd_items', 'indicators')) {
                    $table->json('indicators')->nullable()->after('objective_indicator');
                }
            });

            // Populate existing rows to populate goal_indicators and indicators
            $items = DB::table('realization_rpjmd_items')->get();
            foreach ($items as $item) {
                if ($item->level === 'goal') {
                    if (!empty($item->goal_indicator) && empty($item->goal_indicators)) {
                        $targets = !empty($item->goal_targets) ? json_decode($item->goal_targets, true) : (!empty($item->targets) ? json_decode($item->targets, true) : []);
                        $realizations = !empty($item->goal_realizations) ? json_decode($item->goal_realizations, true) : (!empty($item->realizations) ? json_decode($item->realizations, true) : []);
                        
                        DB::table('realization_rpjmd_items')->where('id', $item->id)->update([
                            'goal_indicators' => json_encode([
                                [
                                    'id'                  => 1,
                                    'indicator'           => $item->goal_indicator,
                                    'unit'                => $item->goal_indicator_unit ?? '%',
                                    'measurement_pattern' => $item->goal_measurement_pattern ?? 'Positif',
                                    'targets'             => $targets ?? [],
                                    'realizations'        => $realizations ?? [],
                                ]
                            ]),
                        ]);
                    }
                } else {
                    if (!empty($item->objective_indicator) && empty($item->indicators)) {
                        $targets = !empty($item->targets) ? json_decode($item->targets, true) : [];
                        $realizations = !empty($item->realizations) ? json_decode($item->realizations, true) : [];
                        
                        DB::table('realization_rpjmd_items')->where('id', $item->id)->update([
                            'indicators' => json_encode([
                                [
                                    'id'                  => 1,
                                    'indicator'           => $item->objective_indicator,
                                    'unit'                => $item->unit ?? '%',
                                    'measurement_pattern' => $item->measurement_pattern ?? 'Positif',
                                    'targets'             => $targets ?? [],
                                    'realizations'        => $realizations ?? [],
                                ]
                            ]),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('realization_rpjmd_items')) {
            Schema::table('realization_rpjmd_items', function (Blueprint $table) {
                if (Schema::hasColumn('realization_rpjmd_items', 'goal_indicators')) {
                    $table->dropColumn('goal_indicators');
                }
                if (Schema::hasColumn('realization_rpjmd_items', 'indicators')) {
                    $table->dropColumn('indicators');
                }
            });
        }
    }
};
