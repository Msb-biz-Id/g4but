<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonitoringActionPlanBudget extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'year',
        'order_no',
        'sasaran_strategis',
        'indikator_sasaran',
        'target_sasaran_tahunan',
        'program',
        'kegiatan',
        'subkegiatan',
        'indikator_subkegiatan',
        'satuan',
        'pagu_tahunan',
        'pagu_tw1',
        'pagu_tw2',
        'pagu_tw3',
        'pagu_tw4',
        'realisasi_tw1',
        'realisasi_tw2',
        'realisasi_tw3',
        'realisasi_tw4',
        'penanggung_jawab_utama',
        'pengampu_teknis',
        'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'order_no' => 'integer',
        'target_sasaran_tahunan' => 'float',
        'pagu_tahunan' => 'float',
        'pagu_tw1' => 'float',
        'pagu_tw2' => 'float',
        'pagu_tw3' => 'float',
        'pagu_tw4' => 'float',
        'realisasi_tw1' => 'float',
        'realisasi_tw2' => 'float',
        'realisasi_tw3' => 'float',
        'realisasi_tw4' => 'float',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
