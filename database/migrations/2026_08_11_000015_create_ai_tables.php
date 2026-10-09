<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('feature', 50)->index(); // executive_summary, insight, recommendation, chat
            $table->string('status', 20)->default('pending')->index(); // pending, processing, completed, failed
            $table->json('context')->nullable();
            $table->json('prompt')->nullable();
            $table->json('response')->nullable();
            $table->string('model', 100)->nullable();
            $table->unsignedInteger('prompt_tokens')->nullable();
            $table->unsignedInteger('completion_tokens')->nullable();
            $table->unsignedInteger('latency_ms')->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('ai_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('insight_type', 50)->index(); // summary, alert_explanation, trend, recommendation
            $table->string('title', 255);
            $table->json('content');
            $table->json('source_refs')->nullable();
            $table->string('status', 20)->default('generated')->index(); // generated, reviewed, accepted, rejected
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_insights');
        Schema::dropIfExists('ai_requests');
    }
};
