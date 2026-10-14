<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * FIX KOMPREHENSIF: Tambah semua kolom yang hilang berdasarkan audit menyeluruh
 * kode controller vs struktur tabel aktual di database produksi (MySQL).
 *
 * Temuan audit (2026-09-04):
 *
 * 1. indicators
 *    - Tidak ada kolom `unit` → dipakai di PlanningController L502
 *      (solusi: tambah virtual alias, atau fix di controller — dipilih fix controller)
 *    - Tidak ada kolom `organization_id` → pakai `owner_organization_id`
 *      (solusi: tambah kolom alias, atau fix di controller — dipilih fix controller)
 *
 * 2. performance_agreements
 *    - Tidak ada `performance_period_id` (pakai `planning_period_id`)
 *    - Tidak ada `name` (pakai `title`)
 *    - Tidak ada `document_number`, `description`
 *    - Tidak ada `submitted_by`, `submitted_at`, `locked_at`
 *    - Tidak ada `file_path`
 *    - Tidak ada `created_by`, `updated_by`
 *
 * 3. planning_documents
 *    - Tidak ada `updated_by`
 *    - Tidak ada `code`
 *
 * 4. planning_trees
 *    - Tidak ada `created_by`, `updated_by`
 *
 * 5. action_plans
 *    - Tidak ada `performance_period_id` (pakai `planning_period_id`)
 *    - Tidak ada `indicator_id` (pakai `indicator_version_id`)
 *    - Tidak ada `activity` (pakai `title`)
 *    - Tidak ada `target_value`
 *    - Tidak ada `created_by`, `updated_by`
 *
 * 6. risks
 *    - Tidak ada `performance_period_id`
 *    - Tidak ada `indicator_id`
 *    - Tidak ada `created_by`
 *
 * 7. Tabel pivot `performance_agreement_indicator` — tidak ada sama sekali
 *
 * STRATEGI:
 *  - Untuk mismatch nama kolom di controller → tambah alias kolom di DB (generated/virtual) ATAU
 *    tambah kolom baru yang diperlukan controller
 *  - Tidak menghapus kolom lama agar data existing tidak rusak
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. performance_agreements ────────────────────────────────────────────
        Schema::table('performance_agreements', function (Blueprint $table) {
            // Controller pakai performance_period_id tapi tabel punya planning_period_id
            // Tambah kolom baru agar controller bisa pakai keduanya
            if (! Schema::hasColumn('performance_agreements', 'performance_period_id')) {
                $table->unsignedBigInteger('performance_period_id')->nullable()->after('planning_period_id');
            }
            // Controller pakai 'name' tapi tabel punya 'title'
            if (! Schema::hasColumn('performance_agreements', 'name')) {
                $table->string('name', 300)->nullable()->after('title');
            }
            if (! Schema::hasColumn('performance_agreements', 'document_number')) {
                $table->string('document_number', 100)->nullable()->after('name');
            }
            if (! Schema::hasColumn('performance_agreements', 'description')) {
                $table->text('description')->nullable()->after('document_number');
            }
            if (! Schema::hasColumn('performance_agreements', 'submitted_by')) {
                $table->unsignedBigInteger('submitted_by')->nullable()->after('description');
            }
            if (! Schema::hasColumn('performance_agreements', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('submitted_by');
            }
            if (! Schema::hasColumn('performance_agreements', 'locked_at')) {
                $table->timestamp('locked_at')->nullable()->after('submitted_at');
            }
            if (! Schema::hasColumn('performance_agreements', 'file_path')) {
                $table->string('file_path', 500)->nullable()->after('locked_at');
            }
            if (! Schema::hasColumn('performance_agreements', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('file_path');
            }
            if (! Schema::hasColumn('performance_agreements', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            }
        });

        // Backfill performance_period_id dari planning_period_id yang ada
        DB::statement('UPDATE performance_agreements SET performance_period_id = planning_period_id WHERE performance_period_id IS NULL');
        // Backfill name dari title yang ada
        DB::statement('UPDATE performance_agreements SET name = title WHERE name IS NULL');

        // ─── 2. Tabel pivot performance_agreement_indicator ───────────────────────
        if (! Schema::hasTable('performance_agreement_indicator')) {
            Schema::create('performance_agreement_indicator', function (Blueprint $table) {
                $table->foreignId('performance_agreement_id')
                    ->constrained('performance_agreements')
                    ->cascadeOnDelete();
                $table->foreignId('indicator_id')
                    ->constrained('indicators')
                    ->cascadeOnDelete();
                $table->decimal('target', 18, 4)->nullable();
                $table->timestamps();

                $table->primary(['performance_agreement_id', 'indicator_id']);
            });
        }

        // ─── 3. planning_documents ────────────────────────────────────────────────
        Schema::table('planning_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('planning_documents', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            }
            // Controller juga pakai 'code' di beberapa tempat
            if (! Schema::hasColumn('planning_documents', 'code')) {
                $table->string('code', 100)->nullable()->after('id');
            }
        });

        // ─── 4. planning_trees ────────────────────────────────────────────────────
        Schema::table('planning_trees', function (Blueprint $table) {
            if (! Schema::hasColumn('planning_trees', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('planning_trees', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            }
        });

        // ─── 5. action_plans ──────────────────────────────────────────────────────
        Schema::table('action_plans', function (Blueprint $table) {
            // Controller pakai performance_period_id tapi tabel punya planning_period_id
            if (! Schema::hasColumn('action_plans', 'performance_period_id')) {
                $table->unsignedBigInteger('performance_period_id')->nullable()->after('planning_period_id');
            }
            // Controller pakai indicator_id tapi tabel punya indicator_version_id
            if (! Schema::hasColumn('action_plans', 'indicator_id')) {
                $table->unsignedBigInteger('indicator_id')->nullable()->after('indicator_version_id');
            }
            // Controller pakai 'activity' tapi tabel punya 'title'
            if (! Schema::hasColumn('action_plans', 'activity')) {
                $table->string('activity', 300)->nullable()->after('title');
            }
            if (! Schema::hasColumn('action_plans', 'target_value')) {
                $table->decimal('target_value', 18, 4)->nullable()->after('activity');
            }
            if (! Schema::hasColumn('action_plans', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('progress');
            }
            if (! Schema::hasColumn('action_plans', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            }
        });

        // Backfill action_plans
        DB::statement('UPDATE action_plans SET performance_period_id = planning_period_id WHERE performance_period_id IS NULL');
        DB::statement('UPDATE action_plans SET activity = title WHERE activity IS NULL');

        // ─── 6. risks ─────────────────────────────────────────────────────────────
        Schema::table('risks', function (Blueprint $table) {
            if (! Schema::hasColumn('risks', 'performance_period_id')) {
                $table->unsignedBigInteger('performance_period_id')->nullable()->after('organization_id');
            }
            if (! Schema::hasColumn('risks', 'indicator_id')) {
                $table->unsignedBigInteger('indicator_id')->nullable()->after('performance_period_id');
            }
            if (! Schema::hasColumn('risks', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('status');
            }
            if (! Schema::hasColumn('risks', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            }
        });
    }

    public function down(): void
    {
        // performance_agreements
        Schema::table('performance_agreements', function (Blueprint $table) {
            $cols = ['performance_period_id', 'name', 'document_number', 'description',
                'submitted_by', 'submitted_at', 'locked_at', 'file_path', 'created_by', 'updated_by'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('performance_agreements', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::dropIfExists('performance_agreement_indicator');

        // planning_documents
        Schema::table('planning_documents', function (Blueprint $table) {
            foreach (['updated_by', 'code'] as $col) {
                if (Schema::hasColumn('planning_documents', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        // planning_trees
        Schema::table('planning_trees', function (Blueprint $table) {
            foreach (['created_by', 'updated_by'] as $col) {
                if (Schema::hasColumn('planning_trees', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        // action_plans
        Schema::table('action_plans', function (Blueprint $table) {
            foreach (['performance_period_id', 'indicator_id', 'activity', 'target_value', 'created_by', 'updated_by'] as $col) {
                if (Schema::hasColumn('action_plans', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        // risks
        Schema::table('risks', function (Blueprint $table) {
            foreach (['performance_period_id', 'indicator_id', 'created_by', 'updated_by'] as $col) {
                if (Schema::hasColumn('risks', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
