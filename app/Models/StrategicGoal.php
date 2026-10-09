<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StrategicGoal extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'planning_period_id', 'organization_id', 'code', 'name', 'description', 'status',
    ];

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function objectives(): HasMany
    {
        return $this->hasMany(StrategicObjective::class);
    }
}
