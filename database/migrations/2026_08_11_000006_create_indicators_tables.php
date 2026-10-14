<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('indicators', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->text('definition')->nullable();
            $table->string('type', 30)->default('output')->index(); // input, process, output, outcome, impact
            $table->string('direction', 20)->default('higher_is_better')->index(); // higher_is_better, lower_is_better, exact, binary, custom
            $table->foreignId('measurement_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('frequency', 30)->default('monthly')->index(); // monthly, quarterly, semester, annual
            $table->string('data_source', 255)->nullable();
            $table->text('formula_notes')->nullable();
            $table->foreignId('owner_organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->unsignedBigInteger('current_version_id')->nullable();
            $table->boolean('is_iku')->default(false);
            $table->string('status', 20)->default('draft')->index(); // draft, active, archived
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('indicator_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('indicator_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version_number')->default(1);
            $table->string('name', 255);
            $table->text('definition')->nullable();
            $table->string('type', 30)->default('output');
            $table->string('direction', 20)->default('higher_is_better');
            $table->foreignId('measurement_unit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('frequency', 30)->default('monthly');
            $table->string('data_source', 255)->nullable();
            $table->text('formula_notes')->nullable();
            $table->decimal('baseline_value', 18, 4)->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->text('change_reason')->nullable();
            $table->timestamps();

            $table->unique(['indicator_id', 'version_number']);
        });

        Schema::table('indicators', function (Blueprint $table) {
            $table->foreign('current_version_id')->references('id')->on('indicator_versions')->nullOnDelete();
            $table->index('current_version_id');
        });

        Schema::create('indicator_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('indicator_version_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('planning_period_id')->constrained()->cascadeOnDelete();
            $table->decimal('target_value', 18, 4);
            $table->string('status', 20)->default('draft')->index(); // draft, approved, locked
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['indicator_version_id', 'organization_id', 'planning_period_id'], 'ind_targets_ver_org_period_unique');
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('indicators', function (Blueprint $table) {
            $table->dropForeign(['current_version_id']);
            $table->dropIndex(['current_version_id']);
        });

        Schema::dropIfExists('indicator_targets');
        Schema::dropIfExists('indicator_versions');
        Schema::dropIfExists('indicators');
    }
};
