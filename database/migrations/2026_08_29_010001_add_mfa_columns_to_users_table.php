<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Kolom MFA di tabel users
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'google2fa_secret')) {
                $table->string('google2fa_secret')->nullable()->after('password');
            }
            if (! Schema::hasColumn('users', 'google2fa_enabled')) {
                $table->boolean('google2fa_enabled')->default(false)->after('google2fa_secret');
            }
            if (! Schema::hasColumn('users', 'google2fa_confirmed_at')) {
                $table->timestamp('google2fa_confirmed_at')->nullable()->after('google2fa_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumnIfExists('google2fa_secret');
            $table->dropColumnIfExists('google2fa_enabled');
            $table->dropColumnIfExists('google2fa_confirmed_at');
        });
    }
};
