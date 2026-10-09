<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActionPlan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'title',
        'activity',
        'description',
        'organization_id',
        'planning_period_id',
        'performance_period_id',
        'strategic_objective_id',
        'indicator_version_id',
        'indicator_id',
        'target_value',
        'start_date',
        'end_date',
        'progress',
        'status',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'progress' => 'decimal:2',
            'target_value' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ActionPlan $plan) {
            if (empty($plan->code)) {
                $plan->code = 'AP-' . strtoupper(uniqid());
            }

            $rawTitle = $plan->getAttributes()['title'] ?? null;
            $rawActivity = $plan->getAttributes()['activity'] ?? null;

            if (empty($rawTitle) && !empty($rawActivity)) {
                $plan->setAttribute('title', $rawActivity);
            } elseif (empty($rawActivity) && !empty($rawTitle)) {
                $plan->setAttribute('activity', $rawTitle);
            }

            $planningPeriodId = $plan->getAttributes()['planning_period_id'] ?? null;
            $perfPeriodId = $plan->getAttributes()['performance_period_id'] ?? null;

            if (empty($planningPeriodId) && !empty($perfPeriodId)) {
                $plan->setAttribute('planning_period_id', $perfPeriodId);
            }
            if (empty($perfPeriodId) && !empty($planningPeriodId)) {
                $plan->setAttribute('performance_period_id', $planningPeriodId);
            }
        });

        static::updating(function (ActionPlan $plan) {
            if ($plan->isDirty('activity') && !$plan->isDirty('title')) {
                $plan->setAttribute('title', $plan->getAttributes()['activity'] ?? $plan->activity);
            } elseif ($plan->isDirty('title') && !$plan->isDirty('activity')) {
                $plan->setAttribute('activity', $plan->getAttributes()['title'] ?? $plan->title);
            } else {
                $rawTitle = $plan->getAttributes()['title'] ?? null;
                $rawActivity = $plan->getAttributes()['activity'] ?? null;

                if (empty($rawTitle) && !empty($rawActivity)) {
                    $plan->setAttribute('title', $rawActivity);
                } elseif (empty($rawActivity) && !empty($rawTitle)) {
                    $plan->setAttribute('activity', $rawTitle);
                }
            }

            if ($plan->isDirty('performance_period_id') && !$plan->isDirty('planning_period_id')) {
                $plan->setAttribute('planning_period_id', $plan->performance_period_id);
            } elseif ($plan->isDirty('planning_period_id') && !$plan->isDirty('performance_period_id')) {
                $plan->setAttribute('performance_period_id', $plan->planning_period_id);
            }
        });
    }

    public function setActivityAttribute($value): void
    {
        $this->attributes['activity'] = $value;
        if (!isset($this->attributes['title']) || $this->attributes['title'] === null || $this->attributes['title'] === '') {
            $this->attributes['title'] = $value;
        }
    }

    public function setTitleAttribute($value): void
    {
        $this->attributes['title'] = $value;
        if (!isset($this->attributes['activity']) || $this->attributes['activity'] === null || $this->attributes['activity'] === '') {
            $this->attributes['activity'] = $value;
        }
    }

    public function getActivityAttribute($value): string
    {
        return !empty($value) ? (string) $value : (string) ($this->attributes['title'] ?? '');
    }

    public function getTitleAttribute($value): string
    {
        return !empty($value) ? (string) $value : (string) ($this->attributes['activity'] ?? '');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function strategicObjective(): BelongsTo
    {
        return $this->belongsTo(StrategicObjective::class);
    }

    public function indicatorVersion(): BelongsTo
    {
        return $this->belongsTo(IndicatorVersion::class);
    }

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id');
    }

    public function risks(): HasMany
    {
        return $this->hasMany(Risk::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
