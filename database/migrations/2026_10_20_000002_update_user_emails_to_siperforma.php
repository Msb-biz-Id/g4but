<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Update user emails from @esakip.local to @siperforma.local
     * and align legacy prefixes (kepala.opd -> kepala.dinas, admin.opd -> admin.pupr).
     */
    public function up(): void
    {
        if (DB::getSchemaBuilder()->hasTable('users')) {
            DB::table('users')->where('email', 'like', '%@esakip.local')->get()->each(function ($user) {
                $newEmail = $user->email;
                $newEmail = str_replace('kepala.opd@', 'kepala.dinas@', $newEmail);
                $newEmail = str_replace('admin.opd@', 'admin.pupr@', $newEmail);
                $newEmail = str_replace('@esakip.local', '@siperforma.local', $newEmail);

                if ($newEmail !== $user->email) {
                    DB::table('users')->where('id', $user->id)->update([
                        'email' => $newEmail,
                        'updated_at' => now(),
                    ]);
                }
            });
        }
    }

    public function down(): void
    {
        if (DB::getSchemaBuilder()->hasTable('users')) {
            DB::table('users')->where('email', 'like', '%@siperforma.local')->get()->each(function ($user) {
                $oldEmail = $user->email;
                $oldEmail = str_replace('kepala.dinas@', 'kepala.opd@', $oldEmail);
                $oldEmail = str_replace('admin.pupr@', 'admin.opd@', $oldEmail);
                $oldEmail = str_replace('@siperforma.local', '@esakip.local', $oldEmail);

                if ($oldEmail !== $user->email) {
                    DB::table('users')->where('id', $user->id)->update([
                        'email' => $oldEmail,
                        'updated_at' => now(),
                    ]);
                }
            });
        }
    }
};
