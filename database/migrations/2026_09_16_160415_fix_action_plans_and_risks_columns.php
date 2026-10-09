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
        if (Schema::hasTable('action_plans')) {
            Schema::table('action_plans', function (Blueprint $table) {
                if (Schema::hasColumn('action_plans', 'title')) {
                    $table->string('title', 255)->nullable()->change();
                }
            });

            DB::statement("UPDATE action_plans SET title = activity WHERE (title IS NULL OR title = '') AND activity IS NOT NULL AND activity != ''");
            DB::statement("UPDATE action_plans SET activity = title WHERE (activity IS NULL OR activity = '') AND title IS NOT NULL AND title != ''");
            DB::statement('UPDATE action_plans SET performance_period_id = planning_period_id WHERE performance_period_id IS NULL AND planning_period_id IS NOT NULL');
            DB::statement('UPDATE action_plans SET planning_period_id = performance_period_id WHERE planning_period_id IS NULL AND performance_period_id IS NOT NULL');
        }

        if (Schema::hasTable('risks')) {
            Schema::table('risks', function (Blueprint $table) {
                if (Schema::hasColumn('risks', 'title')) {
                    $table->string('title', 255)->nullable()->change();
                }
                if (! Schema::hasColumn('risks', 'risk_event')) {
                    $table->string('risk_event', 300)->nullable()->after('title');
                }
                if (! Schema::hasColumn('risks', 'cause')) {
                    $table->text('cause')->nullable()->after('risk_event');
                }
                if (! Schema::hasColumn('risks', 'impact')) {
                    $table->text('impact')->nullable()->after('cause');
                }
                if (! Schema::hasColumn('risks', 'likelihood')) {
                    $table->unsignedTinyInteger('likelihood')->default(1)->after('impact');
                }
                if (! Schema::hasColumn('risks', 'impact_level')) {
                    $table->unsignedTinyInteger('impact_level')->default(1)->after('likelihood');
                }
                if (! Schema::hasColumn('risks', 'owner')) {
                    $table->string('owner', 100)->nullable()->after('mitigation');
                }
            });

            DB::statement("UPDATE risks SET risk_event = title WHERE (risk_event IS NULL OR risk_event = '') AND title IS NOT NULL AND title != ''");
            DB::statement("UPDATE risks SET title = risk_event WHERE (title IS NULL OR title = '') AND risk_event IS NOT NULL AND risk_event != ''");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('risks')) {
            Schema::table('risks', function (Blueprint $table) {
                $cols = ['risk_event', 'cause', 'impact', 'likelihood', 'impact_level', 'owner'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('risks', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
