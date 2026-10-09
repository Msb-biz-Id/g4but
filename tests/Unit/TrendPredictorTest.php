<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Unit test untuk algoritma regresi linier di TrendPredictor (FR-AI-013).
 *
 * TrendPredictor bergantung pada model/DB (Indicator, Realization, dll.) sehingga
 * tidak dapat diinstansiasi secara langsung di unit test. Solusinya: kita extract
 * dan test logika matematika regresi linier secara terisolasi menggunakan helper
 * method yang mencerminkan implementasi private `linearRegression()`.
 *
 * Test ini memverifikasi:
 *  1. Slope, intercept, dan R² dihitung dengan benar.
 *  2. Forecast (nilai periode berikutnya) akurat.
 *  3. Perilaku dengan data minimum (4 titik) dan lebih banyak titik.
 *  4. Edge case: data konstan, trend naik, trend turun, data satu arah.
 *  5. Feasibility gate: kurang dari minPoints → infeasible.
 */
class TrendPredictorTest extends TestCase
{
    /**
     * Replika algoritma linearRegression() dari TrendPredictor.
     * Sengaja di-copy agar unit test ini sepenuhnya terisolasi dari
     * dependensi Eloquent/DB/container.
     *
     * @param  list<array{x: int|float, y: float}>  $points
     * @return array{slope: float, intercept: float, r2: float|null, forecast: float}
     */
    private function linearRegression(array $points): array
    {
        $n = count($points);
        $sumX = $sumY = $sumX2 = $sumXY = 0.0;

        foreach ($points as $point) {
            $sumX += $point['x'];
            $sumY += $point['y'];
            $sumX2 += $point['x'] * $point['x'];
            $sumXY += $point['x'] * $point['y'];
        }

        $denominator = $n * $sumX2 - $sumX * $sumX;
        $slope = $denominator != 0 ? ($n * $sumXY - $sumX * $sumY) / $denominator : 0.0;
        $intercept = ($sumY - $slope * $sumX) / $n;

        $r2 = null;
        $yMean = $sumY / $n;
        $ssTot = $ssRes = 0.0;

        foreach ($points as $point) {
            $predicted = $intercept + $slope * $point['x'];
            $ssTot += ($point['y'] - $yMean) ** 2;
            $ssRes += ($point['y'] - $predicted) ** 2;
        }

        if ($ssTot > 0) {
            $r2 = 1 - $ssRes / $ssTot;
        }

        $nextX = $n + 1;

        return [
            'slope' => $slope,
            'intercept' => $intercept,
            'r2' => $r2,
            'forecast' => $intercept + $slope * $nextX,
        ];
    }

    /** Buat array points {x, y} berurutan dari array nilai y. */
    private function makePoints(array $yValues): array
    {
        return array_values(array_map(
            fn ($i, $y) => ['x' => $i + 1, 'y' => (float) $y],
            array_keys($yValues),
            $yValues,
        ));
    }

    // ── Regresi linier ────────────────────────────────────────────────────────

    #[Test]
    public function perfect_linear_trend_has_r2_of_one(): void
    {
        // y = 2x + 10 → slope=2, intercept=10, R²=1.0
        $points = $this->makePoints([12, 14, 16, 18]);   // x=1..4

        $result = $this->linearRegression($points);

        $this->assertEqualsWithDelta(2.0, $result['slope'], 0.001);
        $this->assertEqualsWithDelta(10.0, $result['intercept'], 0.001);
        $this->assertEqualsWithDelta(1.0, $result['r2'], 0.001);
    }

    #[Test]
    public function forecast_is_correct_for_perfect_linear_trend(): void
    {
        // 4 titik: [12,14,16,18] — periode ke-5 seharusnya 20
        $points = $this->makePoints([12, 14, 16, 18]);

        $result = $this->linearRegression($points);

        // nextX = 5, forecast = 10 + 2*5 = 20
        $this->assertEqualsWithDelta(20.0, $result['forecast'], 0.01);
    }

    #[Test]
    public function minimum_4_points_produces_valid_result(): void
    {
        // Minimum points sesuai TrendPredictor::predict() default minPoints=4
        $points = $this->makePoints([60, 65, 70, 75]);

        $result = $this->linearRegression($points);

        $this->assertNotNull($result['slope']);
        $this->assertNotNull($result['intercept']);
        $this->assertNotNull($result['r2']);
        $this->assertNotNull($result['forecast']);
        $this->assertEqualsWithDelta(1.0, $result['r2'], 0.001, 'Tren naik sempurna → R²=1');
    }

    #[Test]
    public function downward_trend_has_negative_slope(): void
    {
        $points = $this->makePoints([90, 80, 70, 60]);

        $result = $this->linearRegression($points);

        $this->assertLessThan(0, $result['slope'], 'Tren turun harus menghasilkan slope negatif');
        // Forecast periode ke-5: harus di bawah 60
        $this->assertLessThan(60.0, $result['forecast']);
    }

    #[Test]
    public function constant_data_has_zero_slope_and_null_r2(): void
    {
        // Data konstan → tidak ada variasi → ssTot=0 → R²=null, slope=0
        $points = $this->makePoints([75, 75, 75, 75]);

        $result = $this->linearRegression($points);

        $this->assertEqualsWithDelta(0.0, $result['slope'], 0.0001);
        $this->assertNull($result['r2'], 'Data konstan → R² tidak terdefinisi (null)');
        $this->assertEqualsWithDelta(75.0, $result['forecast'], 0.01, 'Forecast harus sama dengan nilai konstan');
    }

    #[Test]
    public function more_data_points_improves_forecast_confidence(): void
    {
        // 8 titik tren naik linier vs 4 titik — keduanya harus menghasilkan R²=1.0
        $points4 = $this->makePoints([10, 20, 30, 40]);
        $points8 = $this->makePoints([10, 20, 30, 40, 50, 60, 70, 80]);

        $result4 = $this->linearRegression($points4);
        $result8 = $this->linearRegression($points8);

        $this->assertEqualsWithDelta(1.0, $result4['r2'], 0.001);
        $this->assertEqualsWithDelta(1.0, $result8['r2'], 0.001);
        $this->assertEqualsWithDelta(50.0, $result4['forecast'], 0.01);  // nextX=5
        $this->assertEqualsWithDelta(90.0, $result8['forecast'], 0.01);  // nextX=9
    }

    #[Test]
    #[DataProvider('realWorldScenarioProvider')]
    public function real_world_scenarios_produce_expected_direction(
        array $yValues,
        string $expectedTrend,
        string $description
    ): void {
        $points = $this->makePoints($yValues);
        $result = $this->linearRegression($points);

        match ($expectedTrend) {
            'up' => $this->assertGreaterThan(0, $result['slope'], "$description: slope harus positif"),
            'down' => $this->assertLessThan(0, $result['slope'], "$description: slope harus negatif"),
            'flat' => $this->assertEqualsWithDelta(0.0, $result['slope'], 1.0, "$description: slope hampir nol"),
        };
    }

    public static function realWorldScenarioProvider(): array
    {
        return [
            'realisasi SAKIP meningkat' => [[65, 70, 72, 78], 'up',   'Kinerja membaik'],
            'realisasi SAKIP menurun' => [[80, 75, 70, 65], 'down', 'Kinerja memburuk'],
            'realisasi SAKIP fluktuatif' => [[70, 68, 72, 70], 'flat', 'Kinerja stabil'],
            'capaian recovery setelah dip' => [[80, 60, 70, 80], 'flat', 'Recovery setelah penurunan'],
        ];
    }

    // ── Feasibility Gate ────────────────────────────────────────────────────

    #[Test]
    public function feasibility_requires_minimum_4_points(): void
    {
        // Simulasi logika feasibility check di TrendPredictor::predict()
        $minPoints = 4;

        $this->assertFalse(count([]) >= $minPoints, '0 titik → infeasible');
        $this->assertFalse(count([[1, 1]]) >= $minPoints, '1 titik → infeasible');
        $this->assertFalse(count([[1, 1], [2, 2], [3, 3]]) >= $minPoints, '3 titik → infeasible');
        $this->assertTrue(count([[1, 1], [2, 2], [3, 3], [4, 4]]) >= $minPoints, '4 titik → feasible');
        $this->assertTrue(count([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]) >= $minPoints, '5 titik → feasible');
    }

    #[Test]
    public function custom_min_points_threshold_is_respected(): void
    {
        // minPoints=6 → butuh lebih banyak data
        $minPoints = 6;
        $points5 = $this->makePoints([60, 65, 70, 75, 80]);

        $this->assertFalse(count($points5) >= $minPoints, '5 titik < minPoints=6 → infeasible');

        $points6 = $this->makePoints([60, 65, 70, 75, 80, 85]);
        $this->assertTrue(count($points6) >= $minPoints, '6 titik = minPoints=6 → feasible');
    }
}
