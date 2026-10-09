<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Query panas dashboard/analitik: realisasi tervalidasi per OPD/periode.
        Schema::table('realizations', function (Blueprint $table) {
            $table->index(['organization_id', 'status'], 'realizations_org_status_idx');
            $table->index(['measurement_period_id', 'status'], 'realizations_period_status_idx');
        });

        // Pencarian target berdasarkan versi indikator + organisasi.
        Schema::table('indicator_targets', function (Blueprint $table) {
            $table->index(['indicator_version_id', 'organization_id'], 'indicator_targets_version_org_idx');
            $table->index(['organization_id', 'status'], 'indicator_targets_org_status_idx');
        });

        // Riwayat alert berdasar status dan acknowledgment.
        Schema::table('alerts', function (Blueprint $table) {
            $table->index(['status', 'severity'], 'alerts_status_severity_idx');
        });

        // Evidensi per realisasi.
        Schema::table('evidences', function (Blueprint $table) {
            $table->index(['realization_id', 'created_at'], 'evidences_realization_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('realizations', function (Blueprint $table) {
            $table->dropIndex('realizations_org_status_idx');
            $table->dropIndex('realizations_period_status_idx');
        });

        Schema::table('indicator_targets', function (Blueprint $table) {
            $table->dropIndex('indicator_targets_version_org_idx');
            $table->dropIndex('indicator_targets_org_status_idx');
        });

        Schema::table('alerts', function (Blueprint $table) {
            $table->dropIndex('alerts_status_severity_idx');
        });

        Schema::table('evidences', function (Blueprint $table) {
            $table->dropIndex('evidences_realization_created_idx');
        });
    }
};
