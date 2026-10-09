<?php

namespace App\Services;

class PerformanceMeasurementService
{
    /**
     * Hitung persentase capaian sesuai pola (Positif / Negatif).
     */
    public static function calculateAchievement(?float $target, ?float $realization, string $pattern = 'Positif'): ?float
    {
        if ($target === null || $realization === null) {
            return null;
        }

        if ($target == 0 && $realization == 0) {
            return null; // Kriteria: Target = 0 dan Realisasi = 0 -> Tidak Dinilai
        }

        if ($target == 0) {
            return 0.0;
        }

        if (strtolower($pattern) === 'negatif') {
            // Pola Negatif: (2 - (Realisasi / Target)) * 100%
            $val = (2 - ($realization / $target)) * 100;
        } else {
            // Pola Positif: (Realisasi / Target) * 100%
            $val = ($realization / $target) * 100;
        }

        return round($val, 2);
    }

    /**
     * Tentukan status evaluasi capaian:
     * - Tercapai: >= 100%
     * - Perlu Perhatian: 50% <= Capaian < 100%
     * - Kritis: < 50%
     * - Tidak Dinilai: Target = 0 dan Realisasi = 0
     */
    public static function determineStatus(?float $achievement, ?float $target, ?float $realization): array
    {
        if (($target !== null && $realization !== null && (float)$target == 0 && (float)$realization == 0) || $achievement === null) {
            return [
                'status' => 'Tidak Dinilai',
                'badge' => 'secondary',
                'color' => '#64748b',
                'bgClass' => 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
            ];
        }

        if ($achievement >= 100) {
            return [
                'status' => 'Tercapai',
                'badge' => 'success',
                'color' => '#10b981',
                'bgClass' => 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
            ];
        }

        if ($achievement >= 50) {
            return [
                'status' => 'Perlu Perhatian',
                'badge' => 'warning',
                'color' => '#f59e0b',
                'bgClass' => 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
            ];
        }

        return [
            'status' => 'Kritis',
            'badge' => 'danger',
            'color' => '#ef4444',
            'bgClass' => 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300',
        ];
    }
}
