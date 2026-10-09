<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StrategicObjective extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'strategic_goal_id', 'code', 'name', 'description', 'status',
    ];

    public function strategicGoal(): BelongsTo
    {
        return $this->belongsTo(StrategicGoal::class);
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(PerformanceNode::class);
    }

    public function actionPlans(): HasMany
    {
        return $this->hasMany(ActionPlan::class);
    }
}
