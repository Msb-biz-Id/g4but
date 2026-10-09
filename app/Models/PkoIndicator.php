<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PkoIndicator extends Model
{
    protected $fillable = [
        'pko_evaluation_id',
        'order',
        'sasaran',
        'indikator',
        'satuan',
        'target',
        'realisasi',
        'capaian_pk',
        'normalisasi_capaian',
        'koreksi_akip',
        'nilai_akhir',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'target' => 'decimal:2',
            'realisasi' => 'decimal:2',
            'capaian_pk' => 'decimal:2',
            'normalisasi_capaian' => 'decimal:2',
            'koreksi_akip' => 'decimal:2',
            'nilai_akhir' => 'decimal:2',
        ];
    }

    public function pkoEvaluation(): BelongsTo
    {
        return $this->belongsTo(PkoEvaluation::class);
    }
}
