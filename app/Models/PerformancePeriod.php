<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model PerformancePeriod merepresentasikan tabel performance_periods.
 * Ini berbeda dari PlanningPeriod (tabel planning_periods) yang digunakan
 * untuk modul Goals/Targets/Indicators di TSX.
 *
 * PerformancePeriod digunakan oleh modul Planning (Dokumen, Pohon Kinerja,
 * Cascading, dll) yang diport dari proyek JSX.
 */
class PerformancePeriod extends Model
{
    use HasFactory;

    protected $fillable = ['year', 'name', 'status', 'start_date', 'end_date', 'description'];

    protected $appends = ['start_year', 'end_year'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function getStartYearAttribute(): int
    {
        if ($this->start_date) {
            return $this->start_date instanceof \DateTimeInterface
                ? (int) $this->start_date->format('Y')
                : (int) date('Y', strtotime((string) $this->start_date));
        }

        return (int) ($this->year ?? date('Y'));
    }

    public function getEndYearAttribute(): int
    {
        if ($this->end_date) {
            return $this->end_date instanceof \DateTimeInterface
                ? (int) $this->end_date->format('Y')
                : (int) date('Y', strtotime((string) $this->end_date));
        }

        return (int) ($this->year ?? date('Y'));
    }

    public function measurementPeriods(): HasMany
    {
        return $this->hasMany(MeasurementPeriod::class)->orderBy('sequence');
    }

    public function planningDocuments(): HasMany
    {
        return $this->hasMany(PlanningDocument::class);
    }

    public function performanceTrees(): HasMany
    {
        return $this->hasMany(PlanningTree::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'open');
    }
}
