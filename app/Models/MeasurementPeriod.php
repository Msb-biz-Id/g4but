<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeasurementPeriod extends Model
{
    protected $fillable = [
        'planning_period_id', 'code', 'name', 'type', 'start_date', 'end_date',
        'submission_deadline', 'status', 'closed_at', 'closed_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'submission_deadline' => 'date:Y-m-d',
            'closed_at' => 'datetime',
        ];
    }

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function realizations(): HasMany
    {
        return $this->hasMany(Realization::class);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, ['active', 'open'], true) || $this->closed_at === null;
    }
}
