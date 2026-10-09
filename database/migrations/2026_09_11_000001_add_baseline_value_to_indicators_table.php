<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('indicators', function (Blueprint $table) {
            if (! Schema::hasColumn('indicators', 'baseline_value')) {
                $table->decimal('baseline_value', 18, 4)->nullable()->after('baseline_year');
            }
        });
    }

    public function down(): void
    {
        Schema::table('indicators', function (Blueprint $table) {
            if (Schema::hasColumn('indicators', 'baseline_value')) {
                $table->dropColumn('baseline_value');
            }
        });
    }
};