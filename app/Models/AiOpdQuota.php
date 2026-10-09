<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Model kuota harian pemanggilan AI per OPD (BR-AI-009, MOD-AI-006).
 *
 * @property int $id
 * @property int $organization_id
 * @property Carbon $tanggal
 * @property int $kuota_maksimal (-1 = unlimited)
 * @property int $terpakai
 */
class AiOpdQuota extends Model
{
    protected $table = 'ai_opd_quota';

    protected $fillable = [
        'organization_id',
        'tanggal',
        'kuota_maksimal',
        'terpakai',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'kuota_maksimal' => 'integer',
            'terpakai' => 'integer',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Apakah kuota harian masih tersedia untuk OPD ini.
     */
    public function masihTersedia(): bool
    {
        if ($this->kuota_maksimal === -1) {
            return true; // unlimited
        }

        return $this->terpakai < $this->kuota_maksimal;
    }

    /**
     * Mengambil atau membuat record kuota untuk OPD + tanggal hari ini.
     * Default kuota diambil dari config (dapat di-override via pengaturan sistem).
     */
    public static function hariIniUntuk(int $organizationId): static
    {
        $defaultQuota = (int) (AppConfig::value('ai.daily_quota') ?: config('ekasuari.ai.daily_quota', 10));

        $record = static::where('organization_id', $organizationId)
            ->whereDate('tanggal', today())
            ->first();

        if ($record) {
            return $record;
        }

        try {
            return static::create([
                'organization_id' => $organizationId,
                'tanggal' => today()->startOfDay(),
                'kuota_maksimal' => $defaultQuota,
                'terpakai' => 0,
            ]);
        } catch (\Throwable $e) {
            return static::where('organization_id', $organizationId)
                ->whereDate('tanggal', today())
                ->firstOrFail();
        }
    }

    /**
     * Menambah hitungan terpakai sebesar 1 (atomic increment).
     */
    public function increment($column = 'terpakai', $amount = 1, array $extra = [])
    {
        return parent::increment($column, $amount, $extra);
    }

    /**
     * Sisa kuota (null = unlimited).
     */
    public function sisa(): ?int
    {
        if ($this->kuota_maksimal === -1) {
            return null;
        }

        return max(0, $this->kuota_maksimal - $this->terpakai);
    }
}
