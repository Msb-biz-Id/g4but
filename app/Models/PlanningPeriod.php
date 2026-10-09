<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanningPeriod extends Model
{
    protected $fillable = [
        'code', 'name', 'year', 'type', 'start_date', 'end_date', 'status', 'closed_at', 'closed_by',
    ];

    protected $appends = ['start_year', 'end_year'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'closed_at' => 'datetime',
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
        return $this->hasMany(MeasurementPeriod::class);
    }

    /**
     * Mengumpulkan semua tahun yang valid dari database secara dinamis
     * (memperhitungkan rentang start_year sampai end_year dari setiap periode perencanaan).
     *
     * @return int[]
     */
    public static function getAvailableYears(): array
    {
        $years = [];
        $periods = static::all();
        foreach ($periods as $period) {
            $startY = (int) $period->start_year;
            $endY = (int) $period->end_year;
            if ($startY >= 2000 && $endY >= $startY && ($endY - $startY) <= 20 && $endY <= 2100) {
                $years = array_merge($years, range($startY, $endY));
            } elseif ($period->year && (int) $period->year >= 2000 && (int) $period->year <= 2100) {
                $years[] = (int) $period->year;
            }
        }

        // Ambil juga tahun dari performance_periods jika ada
        try {
            $perfYears = PerformancePeriod::query()->pluck('year')->filter()->toArray();
            $years = array_merge($years, $perfYears);
        } catch (\Throwable) {
            // Abaikan jika tabel belum ada atau terjadi error
        }

        // Ambil juga tahun dari indicator_targets jika ada target tahunan spesifik
        try {
            $targetYears = IndicatorTarget::query()->distinct()->pluck('year')->filter()->toArray();
            $years = array_merge($years, $targetYears);
        } catch (\Throwable) {
            // Abaikan jika tabel belum ada atau terjadi error
        }

        $uniqueYears = array_values(array_filter(
            array_unique(array_map('intval', $years)),
            fn($y) => $y >= 2000 && $y <= 2100
        ));
        sort($uniqueYears);

        if (empty($uniqueYears)) {
            $uniqueYears = range(2025, 2029);
        }

        return $uniqueYears;
    }
}
