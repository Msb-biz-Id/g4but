<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Risk extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title', 'description', 'organization_id', 'action_plan_id',
        'performance_period_id', 'indicator_id', 'risk_event', 'cause', 'impact',
        'likelihood', 'impact_level', 'risk_level', 'mitigation', 'owner', 'status', 'created_by', 'updated_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (Risk $risk) {
            $rawTitle = $risk->getAttributes()['title'] ?? null;
            $rawEvent = $risk->getAttributes()['risk_event'] ?? null;

            if (empty($rawTitle) && !empty($rawEvent)) {
                $risk->setAttribute('title', $rawEvent);
            } elseif (empty($rawEvent) && !empty($rawTitle)) {
                $risk->setAttribute('risk_event', $rawTitle);
            }

            if (empty($risk->getAttributes()['description'])) {
                $risk->setAttribute('description', $risk->getAttributes()['cause'] ?? $risk->getAttributes()['impact'] ?? null);
            }
        });

        static::updating(function (Risk $risk) {
            if ($risk->isDirty('risk_event') && !$risk->isDirty('title')) {
                $risk->setAttribute('title', $risk->getAttributes()['risk_event'] ?? $risk->risk_event);
            } elseif ($risk->isDirty('title') && !$risk->isDirty('risk_event')) {
                $risk->setAttribute('risk_event', $risk->getAttributes()['title'] ?? $risk->title);
            }
        });
    }

    public function setRiskEventAttribute($value): void
    {
        $this->attributes['risk_event'] = $value;
        if (!isset($this->attributes['title']) || $this->attributes['title'] === null || $this->attributes['title'] === '') {
            $this->attributes['title'] = $value;
        }
    }

    public function setTitleAttribute($value): void
    {
        $this->attributes['title'] = $value;
        if (!isset($this->attributes['risk_event']) || $this->attributes['risk_event'] === null || $this->attributes['risk_event'] === '') {
            $this->attributes['risk_event'] = $value;
        }
    }

    public function getRiskEventAttribute($value): string
    {
        return !empty($value) ? (string) $value : (string) ($this->attributes['title'] ?? '');
    }

    public function getTitleAttribute($value): string
    {
        return !empty($value) ? (string) $value : (string) ($this->attributes['risk_event'] ?? '');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function actionPlan(): BelongsTo
    {
        return $this->belongsTo(ActionPlan::class);
    }

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }
}
