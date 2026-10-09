<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 4.1 Realisasi RPJMD (SP/Bappeda)
        Schema::create('realization_rpjmd_items', function (Blueprint $table) {
            $table->id();
            $table->text('mission')->nullable();
            $table->text('goal')->nullable();
            $table->text('goal_indicator')->nullable();
            $table->text('objective')->nullable();
            $table->text('objective_indicator')->nullable();
            $table->string('unit', 100)->nullable();
            $table->string('measurement_pattern', 20)->default('Positif'); // Positif, Negatif
            $table->json('targets')->nullable(); // {"2025": x, "2026": y, ...}
            $table->json('realizations')->nullable(); // {"2025": x, "2026": y, ...}
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 4.2 Realisasi IKU Pemerintah Daerah (SP/Bappeda)
        Schema::create('realization_iku_items', function (Blueprint $table) {
            $table->id();
            $table->text('indicator_name');
            $table->string('unit', 100)->nullable();
            $table->string('measurement_pattern', 20)->default('Positif'); // Positif, Negatif
            $table->json('targets')->nullable(); // {"2025": x, "2026": y, ...}
            $table->json('realizations')->nullable(); // {"2025": x, "2026": y, ...}
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 4.3 Realisasi Perangkat Daerah (Masing2 PD)
        Schema::create('realization_opd_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->text('goal')->nullable();
            $table->text('goal_indicator')->nullable();
            $table->text('objective')->nullable();
            $table->text('objective_indicator')->nullable();
            $table->string('unit', 100)->nullable();
            $table->string('measurement_pattern', 20)->default('Positif'); // Positif, Negatif
            $table->json('targets')->nullable(); // {"2025": x, "2026": y, ...}
            $table->json('realizations')->nullable(); // {"2025": x, "2026": y, ...}
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 4.4 Monitoring Kinerja Fisik / Output Triwulan (Masing2 PD)
        Schema::create('monitoring_action_plan_outputs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->unsignedSmallInteger('year')->default(2026)->index();
            $table->unsignedInteger('order_no')->default(1);
            $table->text('sasaran_strategis')->nullable();
            $table->text('indikator_sasaran')->nullable();
            $table->decimal('target_sasaran_tahunan', 18, 4)->nullable();
            $table->text('program')->nullable();
            $table->text('kegiatan')->nullable();
            $table->text('subkegiatan')->nullable();
            $table->text('indikator_subkegiatan')->nullable();
            $table->string('satuan', 100)->nullable();
            $table->string('measurement_pattern', 20)->default('Positif'); // Positif, Negatif
            $table->decimal('target_output_tahunan', 18, 4)->nullable();
            
            // Triwulan Target & Realisasi
            $table->decimal('target_tw1', 18, 4)->nullable();
            $table->decimal('target_tw2', 18, 4)->nullable();
            $table->decimal('target_tw3', 18, 4)->nullable();
            $table->decimal('target_tw4', 18, 4)->nullable();
            $table->decimal('realisasi_tw1', 18, 4)->nullable();
            $table->decimal('realisasi_tw2', 18, 4)->nullable();
            $table->decimal('realisasi_tw3', 18, 4)->nullable();
            $table->decimal('realisasi_tw4', 18, 4)->nullable();

            $table->text('person_in_charge')->nullable(); // Sesuai OPD Pengampu
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 4.5 Monitoring Kinerja Anggaran Triwulan (Masing2 PD)
        Schema::create('monitoring_action_plan_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->unsignedSmallInteger('year')->default(2026)->index();
            $table->unsignedInteger('order_no')->default(1);
            $table->text('sasaran_strategis')->nullable();
            $table->text('indikator_sasaran')->nullable();
            $table->decimal('target_sasaran_tahunan', 18, 4)->nullable();
            $table->text('program')->nullable();
            $table->text('kegiatan')->nullable();
            $table->text('subkegiatan')->nullable();
            $table->text('indikator_subkegiatan')->nullable();
            $table->string('satuan', 100)->nullable();
            $table->decimal('pagu_tahunan', 20, 2)->nullable();

            // Triwulan Pagu & Realisasi
            $table->decimal('pagu_tw1', 20, 2)->nullable();
            $table->decimal('pagu_tw2', 20, 2)->nullable();
            $table->decimal('pagu_tw3', 20, 2)->nullable();
            $table->decimal('pagu_tw4', 20, 2)->nullable();
            $table->decimal('realisasi_tw1', 20, 2)->nullable();
            $table->decimal('realisasi_tw2', 20, 2)->nullable();
            $table->decimal('realisasi_tw3', 20, 2)->nullable();
            $table->decimal('realisasi_tw4', 20, 2)->nullable();

            // Penanggung Jawab
            $table->text('penanggung_jawab_utama')->nullable();
            $table->text('pengampu_teknis')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monitoring_action_plan_budgets');
        Schema::dropIfExists('monitoring_action_plan_outputs');
        Schema::dropIfExists('realization_opd_items');
        Schema::dropIfExists('realization_iku_items');
        Schema::dropIfExists('realization_rpjmd_items');
    }
};
