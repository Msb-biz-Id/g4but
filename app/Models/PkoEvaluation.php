<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PkoEvaluation extends Model
{
    protected $fillable = [
        'year',
        'organization_id',
        'total_capaian_pk',
        'nko',
        'predikat',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'total_capaian_pk' => 'decimal:2',
            'nko' => 'decimal:2',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function indicators(): HasMany
    {
        return $this->hasMany(PkoIndicator::class)->orderBy('order');
    }

    /**
     * Recalculate summary scores (total_capaian_pk, nko, predikat) based on its indicators
     */
    public function recalculateSummary(): void
    {
        $indicators = $this->indicators;
        if ($indicators->isEmpty()) {
            $this->update([
                'total_capaian_pk' => 0,
                'nko' => 0,
                'predikat' => 'BELUM DINILAI',
            ]);

            return;
        }

        $totalCapaian = (float) $indicators->sum('nilai_akhir');
        $count = $indicators->count();
        $nko = $count > 0 ? round($totalCapaian / $count, 2) : 0.0;

        // Predikat PKO Sesuai Tabel 4 PermenPANRB No. 22 Tahun 2024:
        // X > 100%: ISTIMEWA (Melampaui target perjanjian kinerja)
        // 80% < X <= 100%: BAIK (Memenuhi target perjanjian kinerja)
        // 60% < X <= 80%: BUTUH PERBAIKAN (Memerlukan evaluasi dan perbaikan kinerja)
        // 20% < X <= 60%: KURANG (Di bawah standar target minimal)
        // 0% < X <= 20% / Minus (< 0): SANGAT KURANG (Realisasi kinerja sangat rendah atau minus)
        // 0 / Belum Dinilai: BELUM DINILAI
        $predikat = match (true) {
            $nko <= 0 => 'BELUM DINILAI',
            $nko > 100 => 'ISTIMEWA',
            $nko > 80 => 'BAIK',
            $nko > 60 => 'BUTUH PERBAIKAN',
            $nko > 20 => 'KURANG',
            default => 'SANGAT KURANG',
        };

        $this->update([
            'total_capaian_pk' => $totalCapaian,
            'nko' => $nko,
            'predikat' => $predikat,
        ]);
    }
}
