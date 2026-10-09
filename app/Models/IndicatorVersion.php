<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IndicatorVersion extends Model
{
    protected $fillable = [
        'indicator_id', 'version_number', 'name', 'definition', 'type', 'direction',
        'measurement_unit_id', 'frequency', 'data_source', 'formula_notes',
        'baseline_value', 'valid_from', 'valid_to', 'change_reason',
    ];

    protected function casts(): array
    {
        return [
            'baseline_value' => 'decimal:4',
            'valid_from' => 'date',
            'valid_to' => 'date',
        ];
    }

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class);
    }

    public function measurementUnit(): BelongsTo
    {
        return $this->belongsTo(MeasurementUnit::class);
    }

    public function targets(): HasMany
    {
        return $this->hasMany(IndicatorTarget::class);
    }

    public function realizations(): HasMany
    {
        return $this->hasMany(Realization::class);
    }

    public function getUnitAttribute(): string
    {
        return $this->measurementUnit?->symbol ?? $this->measurementUnit?->name ?? '-';
    }

    public function getCodeAttribute(): ?string
    {
        return $this->indicator?->code;
    }
}
