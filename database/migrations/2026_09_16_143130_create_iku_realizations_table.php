<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel `iku_realizations` menyimpan nilai realisasi tahunan IKU Final.
     * Setiap baris mewakili realisasi satu IKU untuk satu tahun tertentu.
     * Berbeda dengan RealizationIkuItem yang menggunakan teks bebas,
     * tabel ini mereferensikan IKU resmi (indicators.is_iku = true, iku_status = final).
     */
    public function up(): void
    {
        Schema::create('iku_realizations', function (Blueprint $table) {
            $table->id();

            // Referensi ke IKU Final
            $table->foreignId('indicator_id')
                ->constrained('indicators')
                ->cascadeOnDelete();

            // Periode dan tahun realisasi
            $table->foreignId('planning_period_id')
                ->nullable()
                ->constrained('planning_periods')
                ->nullOnDelete();
            $table->unsignedSmallInteger('year')->comment('Tahun realisasi, misal 2025');

            // Nilai realisasi
            $table->decimal('realization_value', 15, 4)->nullable()
                ->comment('Nilai realisasi aktual yang diinput');

            // Catatan / keterangan realisasi
            $table->text('notes')->nullable();

            // Audit siapa yang menginput
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // Unique: satu IKU hanya punya satu realisasi per tahun
            $table->unique(['indicator_id', 'year'], 'iku_realization_unique');

            $table->index(['planning_period_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iku_realizations');
    }
};
