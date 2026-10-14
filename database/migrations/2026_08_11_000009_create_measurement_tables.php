<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('indicator_version_id')->constrained()->cascadeOnDelete();
            $table->foreignId('planning_period_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('measurement_period_id')->constrained()->cascadeOnDelete();
            $table->decimal('value', 18, 4);
            $table->text('narrative')->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft, submitted, under_review, revision_required, resubmitted, approved, locked, archived, cancelled
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->unsignedInteger('row_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['indicator_version_id', 'organization_id', 'measurement_period_id'], 'realizations_ver_org_period_unique');
            $table->foreign('submitted_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('realization_id')->constrained()->cascadeOnDelete();
            $table->string('object_key', 255);
            $table->string('file_name', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->string('checksum', 64);
            $table->foreignId('uploader_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('uploaded_at');
            $table->string('status', 20)->default('active')->index(); // active, quarantined, rejected
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('realization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('validator_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 30)->index(); // submitted, revision_request, approved, rejected, reopened, archived
            $table->text('comment')->nullable();
            $table->string('request_id', 64)->nullable();
            $table->timestamp('validated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('validations');
        Schema::dropIfExists('evidences');
        Schema::dropIfExists('realizations');
    }
};
