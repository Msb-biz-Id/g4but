<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_documents', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->string('document_type', 30)->index(); // regulation, sop, faq, tutorial, news, guideline
            $table->string('category', 50)->nullable();
            $table->text('content')->nullable();
            $table->string('file_path', 255)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 20)->default('draft')->index(); // draft, published, archived
            $table->string('access', 20)->default('internal')->index(); // internal, public
            $table->text('tags')->nullable();
            $table->unsignedBigInteger('published_by')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('integration_logs', function (Blueprint $table) {
            $table->id();
            $table->string('integration_name', 100)->index();
            $table->string('direction', 10)->index(); // in, out
            $table->string('endpoint', 255)->nullable();
            $table->string('http_method', 10)->nullable();
            $table->string('request_id', 64)->nullable()->index();
            $table->string('status', 20)->default('success')->index(); // success, failed, retrying
            $table->json('request_body')->nullable();
            $table->json('response_body')->nullable();
            $table->string('error_message', 255)->nullable();
            $table->unsignedInteger('retry_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
        Schema::dropIfExists('knowledge_documents');
    }
};
