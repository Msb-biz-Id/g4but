<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_agreements', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('title', 255);
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('planning_period_id')->constrained()->cascadeOnDelete();
            $table->string('responsible_name', 150)->nullable();
            $table->string('counterpart_name', 150)->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft, submitted, under_review, revision_required, approved, locked, archived
            $table->unsignedInteger('version')->default(1);
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['organization_id', 'planning_period_id']);
        });

        Schema::create('action_plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('planning_period_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('strategic_objective_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('indicator_version_id')->nullable()->constrained()->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('progress', 5, 2)->default(0);
            $table->string('status', 20)->default('draft')->index(); // draft, active, completed, cancelled
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('risks', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('action_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('risk_level', 20)->default('medium')->index(); // low, medium, high, critical
            $table->text('mitigation')->nullable();
            $table->string('status', 20)->default('identified')->index(); // identified, mitigated, closed
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risks');
        Schema::dropIfExists('action_plans');
        Schema::dropIfExists('performance_agreements');
    }
};
