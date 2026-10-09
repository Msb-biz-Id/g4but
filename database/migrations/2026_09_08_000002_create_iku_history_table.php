<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * IKU FINAL SPEC - Tabel audit trail khusus IKU.
 * Menggantikan DEC-002 yang sudah dibatalkan client.
 *
 * Mencatat semua perubahan penting IKU:
 *  CREATE | UPDATE | SUBMIT | REVIEW | RETURN | FINALIZE | DEACTIVATE
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('iku_histories')) {
            Schema::create('iku_histories', function (Blueprint $table) {
                $table->id();

                $table->foreignId('indicator_id')
                    ->constrained('indicators')
                    ->cascadeOnDelete();

                $table->string('action', 30);
                // Values: create, update, submit, review, return, finalize, deactivate

                $table->json('previous_data')->nullable();
                // Snapshot JSON data sebelum perubahan

                $table->json('new_data')->nullable();
                // Snapshot JSON data sesudah perubahan

                $table->text('notes')->nullable();
                // Catatan reviewer atau keterangan perubahan

                $table->unsignedBigInteger('user_id')->nullable();
                $table->foreign('user_id')
                    ->references('id')->on('users')
                    ->nullOnDelete();

                $table->timestamp('created_at')->useCurrent();

                $table->index(['indicator_id', 'created_at']);
                $table->index('action');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('iku_histories');
    }
};
