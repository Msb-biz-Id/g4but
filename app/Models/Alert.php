<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    protected $table = 'alerts';

    protected $fillable = [
        'rule_id', 'organization_id', 'indicator_version_id', 'alert_type', 'severity',
        'title', 'message', 'reference_type', 'reference_id', 'status',
        'owner_id', 'acknowledged_by', 'acknowledged_at', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(AlertRule::class, 'rule_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function indicatorVersion(): BelongsTo
    {
        return $this->belongsTo(IndicatorVersion::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
