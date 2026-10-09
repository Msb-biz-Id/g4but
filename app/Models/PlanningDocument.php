<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlanningDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code', 'year', 'organization_id', 'performance_period_id', 'planning_period_id', 'type', 'periode_type', 'title', 'description',
        'document_number', 'issued_at', 'start_year', 'end_year', 'start_date', 'end_date', 'file_path',
        'status', 'created_by', 'updated_by', 'approved_by', 'approved_at', 'locked_at',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'start_date' => 'date',
            'end_date' => 'date',
            'approved_at' => 'datetime',
            'locked_at' => 'datetime',
        ];
    }

    protected $appends = ['is_locked'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function getStartDateAttribute($value): ?string
    {
        if (! empty($value)) {
            return is_string($value) ? substr($value, 0, 10) : $value->format('Y-m-d');
        }

        $y = $this->start_year ?: $this->year;
        return $y ? "{$y}-01-01" : null;
    }

    public function getEndDateAttribute($value): ?string
    {
        if (! empty($value)) {
            return is_string($value) ? substr($value, 0, 10) : $value->format('Y-m-d');
        }

        $y = $this->end_year ?: $this->year;
        return $y ? "{$y}-12-31" : null;
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked' || !empty($this->locked_at);
    }

    public function getIsLockedAttribute(): bool
    {
        return $this->isLocked();
    }

    public function ensureNotLocked(): void
    {
        if ($this->isLocked()) {
            abort(422, 'Dokumen perencanaan telah dikunci dan tidak dapat diubah.');
        }
    }
}
