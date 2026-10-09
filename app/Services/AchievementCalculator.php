<?php

namespace App\Services;

class AchievementCalculator
{
    /**
     * Hitung capaian (%) berdasarkan nilai realisasi, target, dan polaritas indikator.
     *
     * @param  string  $direction  higher_is_better | lower_is_better | exact | binary | custom
     * @return float|null persentase capaian (0-100+), null jika target kosong/nol tak terdefinisi
     */
    public function calculate(float|int|string|null $realization, float|int|string|null $target, string $direction = 'higher_is_better'): ?float
    {
        if ($realization === null || $realization === '' || $target === null || $target === '' || $target == 0) {
            return null;
        }

        $realization = (float) $realization;
        $target = (float) $target;

        return match ($direction) {
            'lower_is_better' => $target > 0 ? round(($target / $realization) * 100, 2) : null,
            'exact' => $realization === $target ? 100.0 : round((1 - abs($realization - $target) / max($target, 1)) * 100, 2),
            'binary' => $realization >= 1 ? 100.0 : 0.0,
            'higher_is_better', 'custom' => round(($realization / $target) * 100, 2),
            default => round(($realization / $target) * 100, 2),
        };
    }

    /**
     * Kategorikan capaian ke status EWS.
     *
     * @return string good | warning | critical | no_data
     */
    public function categorize(?float $achievement, ?float $goodThreshold = 80, ?float $warningThreshold = 60): string
    {
        if ($achievement === null) {
            return 'no_data';
        }

        if ($achievement >= ($goodThreshold ?? 80)) {
            return 'good';
        }

        if ($achievement >= ($warningThreshold ?? 60)) {
            return 'warning';
        }

        return 'critical';
    }
}
