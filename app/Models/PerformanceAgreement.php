<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PerformanceAgreement extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'title', 'organization_id', 'planning_period_id',
        'responsible_name', 'counterpart_name', 'status', 'version', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked' || !empty($this->locked_at);
    }

    public function ensureNotLocked(): void
    {
        if ($this->isLocked()) {
            abort(422, 'Perjanjian kinerja telah dikunci dan tidak dapat diubah.');
        }
    }
}
