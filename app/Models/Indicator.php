<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Indicator extends Model
{
    use SoftDeletes;

    // IKU Status workflow constants
    const IKU_STATUS_DRAFT      = 'draft';
    const IKU_STATUS_DIAJUKAN   = 'diajukan';
    const IKU_STATUS_REVIEW     = 'review';
    const IKU_STATUS_PERBAIKAN  = 'perbaikan';
    const IKU_STATUS_FINAL      = 'final';
    const IKU_STATUS_NONAKTIF   = 'nonaktif';

    // Level constants
    const LEVEL_PEMDA           = 'pemda';
    const LEVEL_PERANGKAT_DAERAH = 'perangkat_daerah';

    // Polarization constants
    const POLARIZATION_POSITIF  = 'positif';
    const POLARIZATION_NEGATIF  = 'negatif';
    const POLARIZATION_STABIL   = 'stabil';

    protected $fillable = [
        // Existing fields
        'code', 'name', 'definition', 'type', 'direction', 'measurement_unit_id',
        'frequency', 'data_source', 'formula_notes', 'owner_organization_id',
        'current_version_id', 'is_iku', 'status',
        // IKU FINAL SPEC — new fields
        'level', 'planning_period_id', 'strategic_goal_id', 'strategic_objective_id',
        'polarization', 'baseline_year', 'baseline_value', 'baseline_note', 'responsible_officer_id',
        'iku_status',
    ];

    protected $appends = ['formatted_baseline'];

    protected function casts(): array
    {
        return [
            'is_iku'         => 'boolean',
            'baseline_year'  => 'integer',
            'baseline_value' => 'float',
        ];
    }

    // ── Existing Relations ────────────────────────────────────────────────────

    public function measurementUnit(): BelongsTo
    {
        return $this->belongsTo(MeasurementUnit::class);
    }

    public function ownerOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'owner_organization_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'owner_organization_id');
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(IndicatorVersion::class, 'current_version_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(IndicatorVersion::class);
    }

    public function targets(): HasMany
    {
        return $this->hasMany(IndicatorTarget::class, 'indicator_version_id', 'current_version_id');
    }

    public function realizations(): HasMany
    {
        return $this->hasMany(Realization::class, 'indicator_version_id', 'current_version_id');
    }

    // ── IKU FINAL SPEC — New Relations ───────────────────────────────────────

    public function planningPeriod(): BelongsTo
    {
        return $this->belongsTo(PlanningPeriod::class);
    }

    public function strategicGoal(): BelongsTo
    {
        return $this->belongsTo(StrategicGoal::class);
    }

    public function strategicObjective(): BelongsTo
    {
        return $this->belongsTo(StrategicObjective::class);
    }

    public function responsibleOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_officer_id');
    }

    public function ikuHistories(): HasMany
    {
        return $this->hasMany(IkuHistory::class)->latest('created_at');
    }

    // ── IKU FINAL SPEC — Scopes ──────────────────────────────────────────────

    public function scopeIku($query)
    {
        return $query->where('is_iku', true);
    }

    public function scopeByIkuStatus($query, string $status)
    {
        return $query->where('iku_status', $status);
    }

    public function scopeFinal($query)
    {
        return $query->where('iku_status', self::IKU_STATUS_FINAL);
    }

    public function scopeByPeriod($query, int $periodId)
    {
        return $query->where('planning_period_id', $periodId);
    }

    public function scopeByLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    // ── IKU FINAL SPEC — Guard Methods ───────────────────────────────────────

    /**
     * Apakah IKU boleh diedit (hanya Draft atau Perbaikan).
     */
    public function canBeEdited(): bool
    {
        return in_array($this->iku_status, [
            self::IKU_STATUS_DRAFT,
            self::IKU_STATUS_PERBAIKAN,
        ]);
    }

    /**
     * Apakah IKU berstatus Final — tidak boleh hard delete.
     */
    public function isFinal(): bool
    {
        return $this->iku_status === self::IKU_STATUS_FINAL;
    }

    /**
     * Apakah IKU boleh diajukan ke review.
     */
    public function canBeSubmitted(): bool
    {
        return in_array($this->iku_status, [
            self::IKU_STATUS_DRAFT,
            self::IKU_STATUS_PERBAIKAN,
        ]);
    }

    /**
     * Label status IKU dalam Bahasa Indonesia.
     */
    public function ikuStatusLabel(): string
    {
        return match($this->iku_status) {
            self::IKU_STATUS_DRAFT      => 'Draft',
            self::IKU_STATUS_DIAJUKAN   => 'Diajukan',
            self::IKU_STATUS_REVIEW     => 'Review',
            self::IKU_STATUS_PERBAIKAN  => 'Perbaikan',
            self::IKU_STATUS_FINAL      => 'Final',
            self::IKU_STATUS_NONAKTIF   => 'Nonaktif',
            default                     => ucfirst($this->iku_status),
        };
    }

    /**
     * Tampilan Baseline format dokumen: Nilai (Tahun), contoh: "72,50 (2024)".
     */
    public function getFormattedBaselineAttribute(): string
    {
        $val = $this->baseline_value !== null ? number_format((float) $this->baseline_value, 2, ',', '.') : null;
        $yr  = $this->baseline_year;

        if ($val !== null && $yr) {
            return "{$val} ({$yr})";
        } elseif ($val !== null) {
            return (string) $val;
        } elseif ($yr) {
            return "({$yr})";
        }

        return '-';
    }
}

