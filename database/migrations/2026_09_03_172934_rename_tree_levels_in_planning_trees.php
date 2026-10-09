<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * G-13: Rename nilai kolom `level` di tabel planning_trees.
 *
 * Berdasarkan konfirmasi client (3 Sep 2026):
 * Ganti ke nama level sesuai baseline MOD-005:
 *   tujuan   → outcome
 *   sasaran  → csf               (Critical Success Factor)
 *   program  → kondisi_antara
 *   kegiatan → kondisi_operasional
 */
return new class extends Migration
{
    private const MAP = [
        'tujuan'   => 'outcome',
        'sasaran'  => 'csf',
        'program'  => 'kondisi_antara',
        'kegiatan' => 'kondisi_operasional',
    ];

    private const REVERSE = [
        'outcome'              => 'tujuan',
        'csf'                  => 'sasaran',
        'kondisi_antara'       => 'program',
        'kondisi_operasional'  => 'kegiatan',
    ];

    public function up(): void
    {
        foreach (self::MAP as $old => $new) {
            DB::table('planning_trees')->where('level', $old)->update(['level' => $new]);
        }
    }

    public function down(): void
    {
        foreach (self::REVERSE as $new => $old) {
            DB::table('planning_trees')->where('level', $new)->update(['level' => $old]);
        }
    }
};
