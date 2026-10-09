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
        if (Schema::hasTable('realization_opd_items')) {
            Schema::table('realization_opd_items', function (Blueprint $table) {
                if (! Schema::hasColumn('realization_opd_items', 'parent_id')) {
                    $table->foreignId('parent_id')
                        ->nullable()
                        ->after('organization_id')
                        ->constrained('realization_opd_items')
                        ->cascadeOnDelete();
                }

                if (! Schema::hasColumn('realization_opd_items', 'level')) {
                    $table->string('level', 20)
                        ->default('objective')
                        ->after('parent_id'); // 'goal', 'objective'
                }

                if (! Schema::hasColumn('realization_opd_items', 'order_no')) {
                    $table->unsignedInteger('order_no')
                        ->default(0)
                        ->after('level');
                }

                if (! Schema::hasColumn('realization_opd_items', 'goal_targets')) {
                    $table->json('goal_targets')
                        ->nullable()
                        ->after('targets');
                }

                if (! Schema::hasColumn('realization_opd_items', 'goal_realizations')) {
                    $table->json('goal_realizations')
                        ->nullable()
                        ->after('realizations');
                }

                if (! Schema::hasColumn('realization_opd_items', 'goal_measurement_pattern')) {
                    $table->string('goal_measurement_pattern', 20)
                        ->default('Positif')
                        ->after('measurement_pattern');
                }
            });

            // Backward compatibility data migration:
            // Convert existing flat items into goal-objective tree
            $this->migrateExistingData();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('realization_opd_items')) {
            // Revert goals back or delete synthetic goal rows
            DB::table('realization_opd_items')->where('level', 'goal')->delete();

            Schema::table('realization_opd_items', function (Blueprint $table) {
                if (Schema::hasColumn('realization_opd_items', 'parent_id')) {
                    $table->dropForeign(['parent_id']);
                    $table->dropColumn('parent_id');
                }
                if (Schema::hasColumn('realization_opd_items', 'level')) {
                    $table->dropColumn('level');
                }
                if (Schema::hasColumn('realization_opd_items', 'order_no')) {
                    $table->dropColumn('order_no');
                }
                if (Schema::hasColumn('realization_opd_items', 'goal_targets')) {
                    $table->dropColumn('goal_targets');
                }
                if (Schema::hasColumn('realization_opd_items', 'goal_realizations')) {
                    $table->dropColumn('goal_realizations');
                }
                if (Schema::hasColumn('realization_opd_items', 'goal_measurement_pattern')) {
                    $table->dropColumn('goal_measurement_pattern');
                }
            });
        }
    }

    private function migrateExistingData(): void
    {
        $items = DB::table('realization_opd_items')->orderBy('id')->get();
        if ($items->isEmpty()) {
            return;
        }

        // Group items by organization_id and goal
        $groups = [];
        foreach ($items as $item) {
            $orgId = $item->organization_id ?? 0;
            $gKey = trim($item->goal ?? '') ?: 'Tujuan Renstra';
            $key = $orgId.'|||'.$gKey;
            $groups[$key][] = $item;
        }

        foreach ($groups as $key => $subItems) {
            [$orgId, $goal] = explode('|||', $key);
            $first = $subItems[0];

            // Create or designate Goal row
            $goalId = DB::table('realization_opd_items')->insertGetId([
                'organization_id' => (int) $orgId,
                'parent_id' => null,
                'level' => 'goal',
                'order_no' => 0,
                'goal' => $goal,
                'goal_indicator' => $first->goal_indicator ?? $goal,
                'goal_indicator_unit' => $first->goal_indicator_unit ?? '%',
                'objective' => null,
                'objective_indicator' => null,
                'unit' => $first->goal_indicator_unit ?? '%',
                'measurement_pattern' => 'Positif',
                'goal_measurement_pattern' => 'Positif',
                'targets' => null,
                'realizations' => null,
                'goal_targets' => null,
                'goal_realizations' => null,
                'created_by' => $first->created_by,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Link children items
            $order = 1;
            foreach ($subItems as $subItem) {
                DB::table('realization_opd_items')
                    ->where('id', $subItem->id)
                    ->update([
                        'parent_id' => $goalId,
                        'level' => 'objective',
                        'order_no' => $order++,
                    ]);
            }
        }
    }
};
