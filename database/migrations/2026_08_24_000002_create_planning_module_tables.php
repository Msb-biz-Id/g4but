<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Membuat tabel-tabel yang dibutuhkan oleh modul Planning (JSX → TSX port).
 *
 * Tabel yang dibuat:
 *  - performance_periods     : Periode tahunan kinerja (berbeda dari planning_periods)
 *  - planning_documents      : Dokumen perencanaan (RPJMD, Renstra, Renja)
 *  - planning_trees          : Pohon kinerja (tujuan/sasaran/program/kegiatan)
 *  - cascading_relations     : Relasi cascading antar pohon kinerja
 *  - crosscutting_relations  : Relasi crosscutting lintas OPD
 *
 * Catatan: performance_agreements, action_plans, risks sudah ada di migration 000008.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── performance_periods ─────────────────────────────────────────────────
        Schema::create('performance_periods', function (Blueprint $table) {
            $table->id();
            $table->smallInteger('year')->unique();
            $table->string('name');
            $table->string('status', 16)->default('open')->index(); // open | closed
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ─── planning_documents ───────────────────────────────────────────────────
        Schema::create('planning_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32)->index(); // rpjmd | renstra | renja
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('document_number')->nullable();
            $table->date('issued_at')->nullable();
            $table->smallInteger('start_year')->nullable();
            $table->smallInteger('end_year')->nullable();
            $table->string('file_path')->nullable();
            $table->string('status', 16)->default('draft')->index(); // draft | review | approved | locked
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'performance_period_id', 'type'], 'pdocs_org_period_type_idx');
        });

        // ─── planning_trees ───────────────────────────────────────────────────────
        Schema::create('planning_trees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('planning_trees')->nullOnDelete();
            $table->string('level', 32)->index(); // tujuan | sasaran | program | kegiatan
            $table->string('code', 64)->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('indicator_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'performance_period_id', 'code'], 'ptrees_org_period_code_unique');
            $table->index(['organization_id', 'performance_period_id', 'parent_id'], 'ptrees_org_period_parent_idx');
        });

        // ─── cascading_relations ──────────────────────────────────────────────────
        Schema::create('cascading_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_tree_id')->constrained('planning_trees')->cascadeOnDelete();
            $table->foreignId('to_tree_id')->constrained('planning_trees')->cascadeOnDelete();
            $table->string('type', 32)->default('vertical'); // vertical | horizontal
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['performance_period_id', 'from_tree_id']);
            $table->index(['performance_period_id', 'to_tree_id']);
        });

        // ─── crosscutting_relations ───────────────────────────────────────────────
        Schema::create('crosscutting_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('indicator_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('related_organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('relation_type', 32)->default('support'); // support | dependency | coordination
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['indicator_id', 'performance_period_id']);
            $table->index(['organization_id', 'related_organization_id'], 'crosscutting_org_related_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crosscutting_relations');
        Schema::dropIfExists('cascading_relations');
        Schema::dropIfExists('planning_trees');
        Schema::dropIfExists('planning_documents');
        Schema::dropIfExists('performance_periods');
    }
};
