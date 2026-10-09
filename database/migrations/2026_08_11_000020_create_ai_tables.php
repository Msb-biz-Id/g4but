<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_prompt_templates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('name', 200);
            $table->string('feature', 50)->index(); // executive_summary, insight, recommendation, chat
            $table->unsignedInteger('version')->default(1);
            $table->text('content');
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('ai_use_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('feature', 50)->index(); // executive_summary, insight, recommendation, chat
            $table->string('provider', 30)->default('mock'); // mock, http, openai
            $table->string('prompt_template', 100)->nullable();
            $table->json('context_ref')->nullable();
            $table->text('prompt')->nullable();
            $table->text('output')->nullable();
            $table->string('status', 20)->default('success')->index(); // success, failed
            $table->string('error_message', 255)->nullable();
            $table->unsignedInteger('latency_ms')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_use_logs');
        Schema::dropIfExists('ai_prompt_templates');
    }
};
