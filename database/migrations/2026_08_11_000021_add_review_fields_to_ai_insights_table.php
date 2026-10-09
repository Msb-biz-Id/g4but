<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_insights', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('ai_request_id')->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('rating')->nullable()->after('status');
            $table->text('review_comment')->nullable()->after('rating');
        });
    }

    public function down(): void
    {
        Schema::table('ai_insights', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['rating', 'review_comment']);
        });
    }
};
