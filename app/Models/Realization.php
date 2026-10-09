<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Realization extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id', 'indicator_version_id', 'planning_period_id', 'measurement_period_id',
        'value', 'narrative', 'status', 'submitted_by', 'submitted_at',
        'approved_by', 'approved_at', 'version', 'row_version',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:4',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function indicatorVersion(): BelongsTo
    {
        return $this->belongsTo(IndicatorVersion::class);
    }

    public function measurementPeriod(): BelongsTo
    {
        return $this->belongsTo(MeasurementPeriod::class);
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(Evidence::class);
    }

    public function validations(): HasMany
    {
        return $this->hasMany(RealizationValidation::class);
    }
}
