<?php

namespace Tests\Unit;

use App\Services\AchievementCalculator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Unit test untuk AchievementCalculator (FR-MSR-005, FR-EWS-001).
 *
 * Test terisolasi penuh — tidak memerlukan database, HTTP, atau container Laravel.
 * Menguji semua branch: higher_is_better, lower_is_better, exact, binary, custom,
 * serta edge case: target nol, realisasi null, string kosong, nilai negatif.
 */
class AchievementCalculatorTest extends TestCase
{
    private AchievementCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new AchievementCalculator;
    }

    // ── calculate() ─────────────────────────────────────────────────────────

    #[Test]
    #[DataProvider('higherIsBetterProvider')]
    public function higher_is_better_calculates_correctly(
        float|int $realization,
        float|int $target,
        float $expected
    ): void {
        $result = $this->calculator->calculate($realization, $target, 'higher_is_better');

        $this->assertEqualsWithDelta($expected, $result, 0.01);
    }

    public static function higherIsBetterProvider(): array
    {
        return [
            'capaian 100% (pas di target)' => [100,  100,  100.0],
            'capaian 80% (di bawah target)' => [80,   100,   80.0],
            'capaian 120% (melebihi target)' => [120,  100,  120.0],
            'capaian 50% (setengah target)' => [50,   100,   50.0],
            'nilai pecahan' => [75.5, 100,   75.5],
        ];
    }

    #[Test]
    #[DataProvider('lowerIsBetterProvider')]
    public function lower_is_better_calculates_correctly(
        float|int $realization,
        float|int $target,
        float $expected
    ): void {
        $result = $this->calculator->calculate($realization, $target, 'lower_is_better');

        $this->assertEqualsWithDelta($expected, $result, 0.01);
    }

    public static function lowerIsBetterProvider(): array
    {
        return [
            'realisasi sama dengan target (100%)' => [100, 100, 100.0],
            'realisasi di bawah target — bagus (200%)' => [50,  100, 200.0],
            'realisasi di atas target — buruk (50%)' => [200, 100,  50.0],
            'nilai kecil — sangat bagus' => [10,  100, 1000.0],
        ];
    }

    #[Test]
    public function exact_direction_returns_100_when_equal(): void
    {
        $result = $this->calculator->calculate(75, 75, 'exact');

        $this->assertEquals(100.0, $result);
    }

    #[Test]
    public function exact_direction_penalizes_deviation(): void
    {
        // Deviasi 10 dari target 100 → capaian di bawah 100%
        $result = $this->calculator->calculate(90, 100, 'exact');

        $this->assertLessThan(100.0, $result);
        $this->assertGreaterThan(0.0, $result);
    }

    #[Test]
    public function binary_direction_returns_100_when_realization_gte_1(): void
    {
        // binary: realization >= 1 → 100%, apapun nilai target
        $this->assertEquals(100.0, $this->calculator->calculate(1, 50, 'binary'));
        $this->assertEquals(100.0, $this->calculator->calculate(5, 50, 'binary'));
        $this->assertEquals(100.0, $this->calculator->calculate(2.5, 50, 'binary'));
    }

    #[Test]
    public function binary_direction_returns_0_when_realization_lt_1(): void
    {
        // binary: realization < 1 → 0% (belum mencapai threshold minimal)
        $this->assertEquals(0.0, $this->calculator->calculate(0, 50, 'binary'));
        $this->assertEquals(0.0, $this->calculator->calculate(0.5, 50, 'binary'));
        $this->assertEquals(0.0, $this->calculator->calculate(0.99, 50, 'binary'));
    }

    #[Test]
    public function custom_direction_behaves_like_higher_is_better(): void
    {
        $custom = $this->calculator->calculate(80, 100, 'custom');
        $higher = $this->calculator->calculate(80, 100, 'higher_is_better');

        $this->assertEquals($higher, $custom);
    }

    // ── Edge cases ───────────────────────────────────────────────────────────

    #[Test]
    public function returns_null_when_realization_is_null(): void
    {
        $this->assertNull($this->calculator->calculate(null, 100, 'higher_is_better'));
    }

    #[Test]
    public function returns_null_when_target_is_null(): void
    {
        $this->assertNull($this->calculator->calculate(80, null, 'higher_is_better'));
    }

    #[Test]
    public function returns_null_when_target_is_zero(): void
    {
        // Target nol = tidak terdefinisi, bukan division by zero
        $this->assertNull($this->calculator->calculate(80, 0, 'higher_is_better'));
        $this->assertNull($this->calculator->calculate(80, 0, 'lower_is_better'));
    }

    #[Test]
    public function returns_null_when_realization_is_empty_string(): void
    {
        $this->assertNull($this->calculator->calculate('', 100, 'higher_is_better'));
    }

    #[Test]
    public function returns_null_when_target_is_empty_string(): void
    {
        $this->assertNull($this->calculator->calculate(80, '', 'higher_is_better'));
    }

    #[Test]
    public function accepts_string_numeric_inputs(): void
    {
        $result = $this->calculator->calculate('80', '100', 'higher_is_better');

        $this->assertEqualsWithDelta(80.0, $result, 0.01);
    }

    // ── categorize() ────────────────────────────────────────────────────────

    #[Test]
    #[DataProvider('categorizeProvider')]
    public function categorize_returns_correct_status(
        ?float $achievement,
        string $expected
    ): void {
        $result = $this->calculator->categorize($achievement);

        $this->assertEquals($expected, $result);
    }

    public static function categorizeProvider(): array
    {
        return [
            'null → no_data' => [null, 'no_data'],
            'tepat di threshold good' => [80.0,  'good'],
            'di atas threshold good' => [95.0,  'good'],
            'melebihi 100%' => [120.0, 'good'],
            'tepat di threshold warn' => [60.0,  'warning'],
            'antara warn dan good' => [70.0,  'warning'],
            'di bawah threshold warn' => [59.99, 'critical'],
            'nol' => [0.0,   'critical'],
        ];
    }

    #[Test]
    public function categorize_respects_custom_thresholds(): void
    {
        // Threshold custom: good=90, warning=70
        $this->assertEquals('good', $this->calculator->categorize(90.0, 90, 70));
        $this->assertEquals('warning', $this->calculator->categorize(75.0, 90, 70));
        $this->assertEquals('critical', $this->calculator->categorize(65.0, 90, 70));
    }

    #[Test]
    public function categorize_returns_no_data_for_null(): void
    {
        $this->assertEquals('no_data', $this->calculator->categorize(null));
    }
}
