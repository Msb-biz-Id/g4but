<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('phone_number', 32)->unique()->index();
            $table->string('display_number', 32)->nullable();
            $table->boolean('is_verified')->default(false)->index();
            $table->timestamp('verified_at')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->string('verification_code_hash')->nullable();
            $table->timestamp('verification_code_expires_at')->nullable();
            $table->string('provider_chat_id', 64)->nullable();
            $table->boolean('is_suspended')->default(false);
            $table->timestamp('suspended_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_verified']);
        });

        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone_number', 32)->index();
            $table->string('status', 16)->default('active')->index(); // active | closed | blocked
            $table->json('context')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['phone_number', 'status']);
        });

        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_session_id')->nullable()->constrained('whatsapp_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone_number', 32)->index();
            $table->string('direction', 8)->index(); // inbound | outbound
            $table->text('content');
            $table->string('status', 20)->default('received')->index(); // received | processed | ai_requested | sent | failed | blocked
            $table->string('message_id', 64)->nullable();
            $table->json('metadata')->nullable();
            // FK ke ai_requests (nama tabel di TSX), nullable karena tidak semua pesan pakai AI
            $table->foreignId('ai_request_id')->nullable()->constrained('ai_requests')->nullOnDelete();
            $table->timestamp('created_at')->index();
        });

        Schema::create('whatsapp_handoffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_session_id')->nullable()->constrained('whatsapp_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone_number', 32)->index();
            $table->text('request_text')->nullable();
            $table->string('status', 16)->default('pending')->index(); // pending | resolved | cancelled
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution_note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_handoffs');
        Schema::dropIfExists('whatsapp_messages');
        Schema::dropIfExists('whatsapp_sessions');
        Schema::dropIfExists('whatsapp_identities');
    }
};
