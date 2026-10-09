<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            if (! Schema::hasColumn('evaluations', 'lhe_file_path')) {
                $table->string('lhe_file_path')->nullable()->after('status');
            }
            if (! Schema::hasColumn('evaluations', 'evaluation_status')) {
                $table->string('evaluation_status', 50)->default('Final')->after('status');
            }
        });

        Schema::create('pko_evaluations', function (Blueprint $table) {
            $table->id();
            $table->integer('year')->default(2025)->index();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_capaian_pk', 10, 2)->nullable();
            $table->decimal('nko', 10, 2)->nullable();
            $table->string('predikat', 50)->nullable();
            $table->string('status', 50)->default('Final');
            $table->timestamps();

            $table->unique(['year', 'organization_id']);
        });

        Schema::create('pko_indicators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pko_evaluation_id')->constrained('pko_evaluations')->cascadeOnDelete();
            $table->integer('order')->default(1);
            $table->text('sasaran');
            $table->text('indikator');
            $table->string('satuan', 100)->default('Persen');
            $table->decimal('target', 14, 2)->default(0);
            $table->decimal('realisasi', 14, 2)->default(0);
            $table->decimal('capaian_pk', 14, 2)->default(0);
            $table->decimal('normalisasi_capaian', 14, 2)->default(0);
            $table->decimal('koreksi_akip', 6, 2)->default(0);
            $table->decimal('nilai_akhir', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pko_indicators');
        Schema::dropIfExists('pko_evaluations');

        Schema::table('evaluations', function (Blueprint $table) {
            if (Schema::hasColumn('evaluations', 'lhe_file_path')) {
                $table->dropColumn('lhe_file_path');
            }
            if (Schema::hasColumn('evaluations', 'evaluation_status')) {
                $table->dropColumn('evaluation_status');
            }
        });
    }
};
