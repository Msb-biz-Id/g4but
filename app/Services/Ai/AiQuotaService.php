<?php

namespace App\Services\Ai;

use App\Models\AiOpdQuota;
use App\Models\User;

/**
 * Service pengelolaan kuota harian pemanggilan AI per OPD (BR-AI-009, MOD-AI-006).
 *
 * Alur:
 *  1. check($organizationId)          → cek apakah kuota masih ada
 *  2. consume($organizationId)        → atomic increment terpakai
 *  3. infoKuota($organizationId)      → data kuota untuk ditampilkan di UI
 */
class AiQuotaService
{
    /**
     * Pesan error yang dikembalikan ke user saat kuota habis (BR-AI-009).
     */
    public const PESAN_KUOTA_HABIS = 'Kuota pemanggilan AI harian untuk OPD Anda (%d/%d) telah habis. Silakan hubungi Administrator.';

    /**
     * Memeriksa apakah OPD masih memiliki sisa kuota hari ini.
     *
     * @return array{ok: bool, pesan?: string, kuota: AiOpdQuota}
     */
    public function check(int $organizationId): array
    {
        $kuota = AiOpdQuota::hariIniUntuk($organizationId);

        if (! $kuota->masihTersedia()) {
            return [
                'ok' => false,
                'pesan' => sprintf(self::PESAN_KUOTA_HABIS, $kuota->terpakai, $kuota->kuota_maksimal),
                'kuota' => $kuota,
            ];
        }

        return ['ok' => true, 'kuota' => $kuota];
    }

    /**
     * Menambah satu unit penggunaan secara atomic.
     * Panggil HANYA setelah pemanggilan AI berhasil dicatat.
     */
    public function consume(int $organizationId): void
    {
        AiOpdQuota::hariIniUntuk($organizationId)->increment('terpakai');
    }

    /**
     * Mengambil info kuota untuk ditampilkan di UI halaman /ai.
     *
     * @return array{terpakai: int, kuota_maksimal: int, sisa: int|null, unlimited: bool}
     */
    public function infoKuota(int $organizationId): array
    {
        $kuota = AiOpdQuota::hariIniUntuk($organizationId);

        return [
            'terpakai' => $kuota->terpakai,
            'kuota_maksimal' => $kuota->kuota_maksimal,
            'sisa' => $kuota->sisa(),
            'unlimited' => $kuota->kuota_maksimal === -1,
        ];
    }

    /**
     * Mengambil organization_id pertama yang dapat diakses user.
     * Untuk Admin OPD: OPD miliknya sendiri.
     * Untuk Admin Lintas OPD / Super Admin: gunakan $organizationId yang dipilih.
     */
    public static function resolveOrganizationId(User $user, ?int $selectedOrgId = null): ?int
    {
        // Super Admin atau Admin Provinsi memilih OPD dari frontend
        if ($selectedOrgId !== null && ($user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi'))) {
            return $selectedOrgId;
        }

        // Admin OPD: pakai OPD pertama miliknya
        $org = $user->organizations()->first();

        return $org?->id;
    }
}
