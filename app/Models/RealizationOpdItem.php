<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RealizationOpdItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'parent_id',
        'level',
        'order_no',
        'goal',
        'goal_indicators',
        'indicators',
        'goal_indicator',
        'goal_indicator_unit',
        'objective',
        'objective_indicator',
        'unit',
        'measurement_pattern',
        'targets',
        'realizations',
        'goal_targets',
        'goal_realizations',
        'goal_measurement_pattern',
        'created_by',
    ];

    protected $casts = [
        'targets' => 'array',
        'realizations' => 'array',
        'goal_targets' => 'array',
        'goal_realizations' => 'array',
        'goal_indicators' => 'array',
        'indicators' => 'array',
        'order_no' => 'integer',
    ];

    protected $appends = [
        'goal_indicators_list',
        'objective_indicators_list',
    ];

    public function getGoalIndicatorsListAttribute(): array
    {
        if (isset($this->attributes['goal_indicators_list'])) {
            $val = $this->attributes['goal_indicators_list'];
            return is_string($val) ? (json_decode($val, true) ?? []) : (array) $val;
        }
        if (!empty($this->goal_indicators) && is_array($this->goal_indicators)) {
            return $this->goal_indicators;
        }
        if (!empty($this->goal_indicator)) {
            return [
                [
                    'id'                  => 1,
                    'indicator'           => $this->goal_indicator,
                    'unit'                => $this->goal_indicator_unit ?? '%',
                    'measurement_pattern' => $this->goal_measurement_pattern ?? 'Positif',
                    'targets'             => $this->goal_targets ?? $this->targets ?? [],
                    'realizations'        => $this->goal_realizations ?? $this->realizations ?? [],
                ]
            ];
        }
        return [];
    }

    public function getObjectiveIndicatorsListAttribute(): array
    {
        if (isset($this->attributes['objective_indicators_list'])) {
            $val = $this->attributes['objective_indicators_list'];
            return is_string($val) ? (json_decode($val, true) ?? []) : (array) $val;
        }
        if (!empty($this->indicators) && is_array($this->indicators)) {
            return $this->indicators;
        }
        if (!empty($this->objective_indicator)) {
            return [
                [
                    'id'                  => 1,
                    'indicator'           => $this->objective_indicator,
                    'unit'                => $this->unit ?? '%',
                    'measurement_pattern' => $this->measurement_pattern ?? 'Positif',
                    'targets'             => $this->targets ?? [],
                    'realizations'        => $this->realizations ?? [],
                ]
            ];
        }
        return [];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(RealizationOpdItem::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(RealizationOpdItem::class, 'parent_id')->orderBy('order_no')->orderBy('id');
    }

    public function scopeGoals($query)
    {
        return $query->where('level', 'goal');
    }

    public function scopeObjectives($query)
    {
        return $query->where('level', 'objective');
    }
}
