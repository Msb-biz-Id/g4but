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
        Schema::table('planning_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('planning_documents', 'start_date')) {
                $table->date('start_date')->nullable()->after('year');
            }
            if (! Schema::hasColumn('planning_documents', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
            if (! Schema::hasColumn('planning_documents', 'planning_period_id')) {
                $table->unsignedBigInteger('planning_period_id')->nullable()->after('organization_id');
            }
            if (Schema::hasColumn('planning_documents', 'performance_period_id')) {
                $table->unsignedBigInteger('performance_period_id')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('planning_documents', function (Blueprint $table) {
            if (Schema::hasColumn('planning_documents', 'start_date')) {
                $table->dropColumn('start_date');
            }
            if (Schema::hasColumn('planning_documents', 'end_date')) {
                $table->dropColumn('end_date');
            }
            if (Schema::hasColumn('planning_documents', 'planning_period_id')) {
                $table->dropColumn('planning_period_id');
            }
        });
    }
};
