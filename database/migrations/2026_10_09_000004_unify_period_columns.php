<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Audit logs: Add index on organization_id if not present
        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'organization_id')) {
            try {
                Schema::table('audit_logs', function (Blueprint $table) {
                    $table->index('organization_id', 'audit_logs_organization_id_idx');
                });
            } catch (Throwable $e) {
                // Index might already exist
            }
        }

        // 2. Unify MFA columns in users table: sync and drop redundant mfa_enabled if google2fa_enabled exists
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'mfa_enabled') && Schema::hasColumn('users', 'google2fa_enabled')) {
            try {
                DB::table('users')
                    ->where('mfa_enabled', true)
                    ->where('google2fa_enabled', false)
                    ->update(['google2fa_enabled' => true]);

                Schema::table('users', function (Blueprint $table) {
                    $table->dropColumn('mfa_enabled');
                });
            } catch (Throwable $e) {
                // Fallback if sqlite doesn't allow dropping or column in use
            }
        }

        // 3. Action plans: synchronize title/activity and period IDs
        if (Schema::hasTable('action_plans')) {
            if (Schema::hasColumn('action_plans', 'title') && Schema::hasColumn('action_plans', 'activity')) {
                DB::statement("UPDATE action_plans SET title = activity WHERE (title IS NULL OR title = '') AND activity IS NOT NULL AND activity != ''");
                DB::statement("UPDATE action_plans SET activity = title WHERE (activity IS NULL OR activity = '') AND title IS NOT NULL AND title != ''");
            }

            if (Schema::hasColumn('action_plans', 'planning_period_id') && Schema::hasColumn('action_plans', 'performance_period_id')) {
                DB::statement('UPDATE action_plans SET performance_period_id = planning_period_id WHERE performance_period_id IS NULL AND planning_period_id IS NOT NULL');
                DB::statement('UPDATE action_plans SET planning_period_id = performance_period_id WHERE planning_period_id IS NULL AND performance_period_id IS NOT NULL');
            }
        }

        // 4. Performance agreements: synchronize period IDs
        if (Schema::hasTable('performance_agreements')) {
            if (Schema::hasColumn('performance_agreements', 'planning_period_id') && Schema::hasColumn('performance_agreements', 'performance_period_id')) {
                DB::statement('UPDATE performance_agreements SET performance_period_id = planning_period_id WHERE performance_period_id IS NULL AND planning_period_id IS NOT NULL');
                DB::statement('UPDATE performance_agreements SET planning_period_id = performance_period_id WHERE planning_period_id IS NULL AND performance_period_id IS NOT NULL');
            }
        }

        // 5. Risks: synchronize period IDs if both exist
        if (Schema::hasTable('risks')) {
            if (Schema::hasColumn('risks', 'planning_period_id') && Schema::hasColumn('risks', 'performance_period_id')) {
                DB::statement('UPDATE risks SET performance_period_id = planning_period_id WHERE performance_period_id IS NULL AND planning_period_id IS NOT NULL');
                DB::statement('UPDATE risks SET planning_period_id = performance_period_id WHERE planning_period_id IS NULL AND performance_period_id IS NOT NULL');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('audit_logs')) {
            try {
                Schema::table('audit_logs', function (Blueprint $table) {
                    $table->dropIndex('audit_logs_organization_id_idx');
                });
            } catch (Throwable $e) {
                // Ignore
            }
        }

        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'mfa_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('mfa_enabled')->default(false);
            });
        }
    }
};
