<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BR-006: Tabel catatan revisi dokumen perencanaan.
 *
 * Alur: Biro Organisasi / Super Admin mengirim catatan revisi ke OPD.
 * OPD mendapat notifikasi in-app dan wajib melakukan perbaikan dari dashboard-nya.
 * Satu arah — Biro tidak mengedit langsung dokumen OPD (BR-006).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('document_revisions');
        Schema::enableForeignKeyConstraints();

        Schema::create('document_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_document_id')
                ->constrained('planning_documents')
                ->cascadeOnDelete()
                ->comment('Dokumen yang mendapat catatan revisi');
            $table->text('note')->comment('Isi catatan revisi dari Biro Organisasi ke OPD');
            $table->string('status', 20)->default('pending')
                ->comment('pending | acknowledged | resolved');
            $table->foreignId('created_by')->nullable()
                ->constrained('users')->nullOnDelete()
                ->comment('User Biro/Super Admin yang mengirim catatan');
            $table->foreignId('acknowledged_by')->nullable()
                ->constrained('users')->nullOnDelete()
                ->comment('Admin OPD yang membaca catatan');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['planning_document_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_revisions');
    }
};
