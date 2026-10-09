<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonitoringActionPlanOutput extends Model
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
        'measurement_pattern',
        'target_output_tahunan',
        'target_tw1',
        'target_tw2',
        'target_tw3',
        'target_tw4',
        'realisasi_tw1',
        'realisasi_tw2',
        'realisasi_tw3',
        'realisasi_tw4',
        'person_in_charge',
        'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'order_no' => 'integer',
        'target_sasaran_tahunan' => 'float',
        'target_output_tahunan' => 'float',
        'target_tw1' => 'float',
        'target_tw2' => 'float',
        'target_tw3' => 'float',
        'target_tw4' => 'float',
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
