<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('go_live_readiness', function (Blueprint $table) {
            $table->id();
            $table->string('item_key', 100)->unique();
            $table->string('label', 255);
            $table->string('category', 50)->index();
            $table->boolean('checked')->default(false)->index();
            $table->unsignedBigInteger('checked_by')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->foreign('checked_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('go_live_readiness');
    }
};
