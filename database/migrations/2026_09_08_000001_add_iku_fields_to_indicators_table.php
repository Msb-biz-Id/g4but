<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * IKU FINAL SPEC - Tambah field-field baru ke tabel indicators:
 *  - level          : Pemda / Perangkat Daerah
 *  - planning_period_id : FK ke periode perencanaan
 *  - strategic_goal_id  : FK ke master tujuan
 *  - strategic_objective_id : FK ke master sasaran
 *  - polarization   : Positif / Negatif / Stabil (wajib untuk hitung capaian)
 *  - baseline_year  : Tahun baseline
 *  - baseline_note  : Keterangan sumber baseline
 *  - responsible_officer_id : FK ke pejabat penanggung jawab
 *  - iku_status     : Workflow IKU (terpisah dari status existing)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('indicators', function (Blueprint $table) {
            if (! Schema::hasColumn('indicators', 'level')) {
                $table->string('level', 30)->nullable()->default('perangkat_daerah')->after('is_iku');
                // Values: 'pemda', 'perangkat_daerah'
            }

            if (! Schema::hasColumn('indicators', 'planning_period_id')) {
                $table->unsignedBigInteger('planning_period_id')->nullable()->after('level');
                $table->foreign('planning_period_id')
                    ->references('id')->on('planning_periods')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('indicators', 'strategic_goal_id')) {
                $table->unsignedBigInteger('strategic_goal_id')->nullable()->after('planning_period_id');
                $table->foreign('strategic_goal_id')
                    ->references('id')->on('strategic_goals')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('indicators', 'strategic_objective_id')) {
                $table->unsignedBigInteger('strategic_objective_id')->nullable()->after('strategic_goal_id');
                $table->foreign('strategic_objective_id')
                    ->references('id')->on('strategic_objectives')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('indicators', 'polarization')) {
                $table->string('polarization', 20)->nullable()->after('strategic_objective_id');
                // Values: 'positif', 'negatif', 'stabil'
            }

            if (! Schema::hasColumn('indicators', 'baseline_year')) {
                $table->smallInteger('baseline_year')->nullable()->after('polarization');
            }

            if (! Schema::hasColumn('indicators', 'baseline_note')) {
                $table->text('baseline_note')->nullable()->after('baseline_year');
            }

            if (! Schema::hasColumn('indicators', 'responsible_officer_id')) {
                $table->unsignedBigInteger('responsible_officer_id')->nullable()->after('baseline_note');
                $table->foreign('responsible_officer_id')
                    ->references('id')->on('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('indicators', 'iku_status')) {
                $table->string('iku_status', 20)->default('draft')->after('responsible_officer_id');
                // Values: 'draft', 'diajukan', 'review', 'perbaikan', 'final', 'nonaktif'
                $table->index('iku_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('indicators', function (Blueprint $table) {
            $foreignsToDrop = [
                'planning_period_id', 'strategic_goal_id',
                'strategic_objective_id', 'responsible_officer_id',
            ];
            foreach ($foreignsToDrop as $fk) {
                if (Schema::hasColumn('indicators', $fk)) {
                    $table->dropForeign(['indicators_'.$fk.'_foreign']);
                }
            }

            $colsToDrop = [
                'level', 'planning_period_id', 'strategic_goal_id',
                'strategic_objective_id', 'polarization', 'baseline_year',
                'baseline_note', 'responsible_officer_id', 'iku_status',
            ];
            foreach ($colsToDrop as $col) {
                if (Schema::hasColumn('indicators', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
