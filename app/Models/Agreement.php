<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Alias class untuk PerformanceAgreement.
 *
 * PlanningController di TSX menggunakan 'use App\Models\Agreement' karena
 * diport dari JSX yang memiliki model Agreement. Class ini memperluas
 * PerformanceAgreement agar tidak perlu memodifikasi PlanningController.
 *
 * Keduanya menggunakan tabel 'performance_agreements' yang ada di TSX.
 */
class Agreement extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'performance_agreements';

    protected $fillable = [
        'code', 'title', 'organization_id', 'performance_period_id', 'planning_period_id', 'name', 'document_number',
        'responsible_name', 'counterpart_name', 'version',
        'description', 'status', 'created_by', 'updated_by', 'submitted_by', 'submitted_at',
        'approved_by', 'approved_at', 'locked_at', 'file_path',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'locked_at' => 'datetime',
        ];
    }

    protected $appends = ['is_locked'];

    protected static function booted(): void
    {
        static::creating(function ($agreement) {
            if (empty($agreement->code)) {
                $agreement->code = 'PK-' . ($agreement->organization_id ?? 'ORG') . '-' . date('Y') . '-' . strtoupper(substr(uniqid(), -4));
            }
            if (empty($agreement->title) && !empty($agreement->name)) {
                $agreement->title = $agreement->name;
            }
            if (empty($agreement->planning_period_id)) {
                $agreement->planning_period_id = $agreement->performance_period_id ?? \App\Models\PlanningPeriod::value('id') ?? 1;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function indicators(): BelongsToMany
    {
        return $this->belongsToMany(Indicator::class, 'performance_agreement_indicator', 'performance_agreement_id', 'indicator_id')
            ->withPivot('target');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
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
            abort(422, 'Perjanjian kinerja telah dikunci dan tidak dapat diubah.');
        }
    }
}
