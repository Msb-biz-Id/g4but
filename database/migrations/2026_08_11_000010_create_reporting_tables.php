<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('title', 255);
            $table->string('type', 30)->index(); // recap, lkjip, evaluation, custom
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('planning_period_id')->nullable()->constrained()->nullOnDelete();
            $table->string('format', 20)->default('pdf')->index(); // pdf, xlsx, csv
            $table->string('status', 20)->default('pending')->index(); // pending, generating, generated, failed
            $table->json('parameters')->nullable();
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->string('file_path', 255)->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->timestamps();

            $table->foreign('generated_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('report_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained()->cascadeOnDelete();
            $table->timestamp('snapshot_at');
            $table->json('data');
            $table->string('checksum', 64);
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->timestamps();

            $table->foreign('generated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_snapshots');
        Schema::dropIfExists('reports');
    }
};
