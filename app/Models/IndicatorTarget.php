<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IndicatorTarget extends Model
{
    protected $fillable = [
        'indicator_version_id', 'organization_id', 'planning_period_id',
        'year', 'target_value', 'status', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'target_value' => 'decimal:4',
            'approved_at' => 'datetime',
        ];
    }

    public function indicatorVersion(): BelongsTo
    {
        return $this->belongsTo(IndicatorVersion::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }
}
