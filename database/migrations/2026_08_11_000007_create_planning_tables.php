<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('strategic_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft, approved, archived
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['planning_period_id', 'organization_id', 'code']);
        });

        Schema::create('strategic_objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('strategic_goal_id')->constrained()->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['strategic_goal_id', 'code']);
        });

        Schema::create('performance_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('strategic_objective_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('node_type', 30)->default('level_1')->index(); // level_1, level_2, level_3
            $table->boolean('is_root')->default(false);
            $table->string('status', 20)->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('performance_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_node_id')->constrained('performance_nodes')->cascadeOnDelete();
            $table->foreignId('child_node_id')->constrained('performance_nodes')->cascadeOnDelete();
            $table->string('relation_type', 30)->default('core'); // core, support
            $table->decimal('weight', 8, 4)->nullable();
            $table->timestamps();

            $table->unique(['parent_node_id', 'child_node_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_relations');
        Schema::dropIfExists('performance_nodes');
        Schema::dropIfExists('strategic_objectives');
        Schema::dropIfExists('strategic_goals');
    }
};
