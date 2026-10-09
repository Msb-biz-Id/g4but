<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel kuota harian pemanggilan AI per OPD (BR-AI-009, MOD-AI-006).
 * Setiap baris mewakili satu OPD pada satu tanggal.
 * Reset otomatis terjadi saat baris baru dibuat pada hari baru (lazy-reset).
 * Nilai kuota_maksimal = -1 berarti unlimited.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_opd_quota', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->date('tanggal')->index();
            $table->integer('kuota_maksimal')->default(10)->comment('-1 = unlimited');
            $table->unsignedInteger('terpakai')->default(0);
            $table->timestamps();

            // Satu record per OPD per hari
            $table->unique(['organization_id', 'tanggal']);
        });

        // Tambah opd_id dan periode ke ai_use_logs agar bisa dihitung per OPD/hari
        Schema::table('ai_use_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('organization_id')->nullable()->after('user_id');
            $table->string('periode', 50)->nullable()->after('organization_id');

            $table->foreign('organization_id')->references('id')->on('organizations')->nullOnDelete();
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::table('ai_use_logs', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropIndex(['organization_id']);
            $table->dropColumn(['organization_id', 'periode']);
        });

        Schema::dropIfExists('ai_opd_quota');
    }
};
