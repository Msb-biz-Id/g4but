<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_migrations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('entity_type', 30)->index(); // organizations, indicators
            $table->string('source_file', 255);
            $table->string('status', 30)->default('staged')->index();
            // staged -> validated -> reconciled -> signed_off -> loaded
            $table->unsignedInteger('source_count')->default(0);
            $table->unsignedInteger('mapped_count')->default(0);
            $table->unsignedInteger('cleansed_count')->default(0);
            $table->unsignedInteger('transformed_count')->default(0);
            $table->unsignedInteger('loaded_count')->default(0);
            $table->json('profile')->nullable();
            $table->json('staging')->nullable();
            $table->json('reconciliation')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('signed_off_by')->nullable();
            $table->timestamp('signed_off_at')->nullable();
            $table->unsignedBigInteger('loaded_by')->nullable();
            $table->timestamp('loaded_at')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('signed_off_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('loaded_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_migrations');
    }
};
