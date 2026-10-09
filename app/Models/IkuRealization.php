<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Realisasi tahunan IKU Final.
 * Satu baris = satu IKU + satu tahun.
 */
class IkuRealization extends Model
{
    protected $fillable = [
        'indicator_id',
        'planning_period_id',
        'year',
        'realization_value',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'year'              => 'integer',
        'realization_value' => 'float',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class);
    }

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    /**
     * Hitung capaian (%) terhadap target tahun yang sama.
     */
    public function getCapaianAttribute(): ?float
    {
        if ($this->realization_value === null) return null;

        $target = $this->indicator?->targets()
            ->where('year', $this->year)
            ->value('target_value');

        if (! $target || (float) $target == 0) return null;

        $capaian = ((float) $this->realization_value / (float) $target) * 100;

        // Untuk polarisasi negatif, capaian dibalik
        if ($this->indicator?->polarization === 'negatif') {
            $capaian = (float) $target > 0
                ? ((2 * (float) $target - (float) $this->realization_value) / (float) $target) * 100
                : null;
        }

        return $capaian ? round($capaian, 2) : null;
    }
}
