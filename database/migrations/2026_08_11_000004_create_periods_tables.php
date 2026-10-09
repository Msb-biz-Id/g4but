<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planning_periods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 200);
            $table->smallInteger('year')->index();
            $table->string('type', 20)->default('annual'); // annual, semester, quarterly, monthly
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 20)->default('draft')->index(); // draft, active, closed, archived
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->timestamps();

            $table->foreign('closed_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('measurement_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_period_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code', 50)->unique();
            $table->string('name', 200);
            $table->string('type', 20)->default('monthly')->index(); // monthly, quarterly, semester, annual
            $table->date('start_date');
            $table->date('end_date');
            $table->date('submission_deadline')->nullable();
            $table->string('status', 20)->default('open')->index(); // open, closed
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->timestamps();

            $table->foreign('closed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('measurement_periods');
        Schema::dropIfExists('planning_periods');
    }
};
