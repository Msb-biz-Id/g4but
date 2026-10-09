<?php

namespace App\Services;

use App\Models\Indicator;
use App\Models\IkuHistory;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class IkuWorkflowService
{
    /**
     * Draft / Perbaikan → Diajukan
     */
    public function submit(Indicator $iku, User $user): Indicator
    {
        if (! $iku->canBeSubmitted()) {
            throw new \LogicException("IKU dengan status '{$iku->iku_status}' tidak dapat diajukan.");
        }

        // Validasi kelengkapan target: semua tahun dalam periode wajib memiliki target
        if ($iku->planning_period_id) {
            $period = $iku->planningPeriod ?? \App\Models\PlanningPeriod::find($iku->planning_period_id);
            if ($period) {
                $startYear = (int) ($period->start_year ?? $period->year ?? 0);
                $endYear   = (int) ($period->end_year   ?? $period->year ?? 0);

                if ($startYear && $endYear) {
                    $expectedYears = range($startYear, $endYear);
                    $existingYears = $iku->targets()->pluck('year')->map(fn ($y) => (int) $y)->toArray();
                    $missingYears  = array_diff($expectedYears, $existingYears);

                    if (! empty($missingYears)) {
                        throw new \LogicException(
                            'IKU tidak dapat diajukan karena target untuk tahun ' .
                            implode(', ', $missingYears) .
                            ' belum diisi. Lengkapi semua target tahunan terlebih dahulu.'
                        );
                    }

                    // Cek nilai target tidak boleh kosong
                    $emptyTargets = $iku->targets()
                        ->whereIn('year', $expectedYears)
                        ->whereNull('target_value')
                        ->pluck('year')
                        ->toArray();

                    if (! empty($emptyTargets)) {
                        throw new \LogicException(
                            'IKU tidak dapat diajukan karena nilai target untuk tahun ' .
                            implode(', ', $emptyTargets) .
                            ' belum diisi.'
                        );
                    }
                }
            }
        }

        return DB::transaction(function () use ($iku, $user) {
            $prev = $iku->only(['iku_status']);
            $iku->update(['iku_status' => Indicator::IKU_STATUS_DIAJUKAN]);
            $this->recordHistory($iku, IkuHistory::ACTION_SUBMIT, $prev, ['iku_status' => Indicator::IKU_STATUS_DIAJUKAN], null, $user->id);
            return $iku->fresh();
        });
    }

    /**
     * Diajukan → Review (Bappeda mulai meninjau)
     */
    public function startReview(Indicator $iku, User $user): Indicator
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_DIAJUKAN) {
            throw new \LogicException("IKU harus berstatus 'Diajukan' untuk dapat direview.");
        }

        return DB::transaction(function () use ($iku, $user) {
            $prev = $iku->only(['iku_status']);
            $iku->update(['iku_status' => Indicator::IKU_STATUS_REVIEW]);
            $this->recordHistory($iku, IkuHistory::ACTION_REVIEW, $prev, ['iku_status' => Indicator::IKU_STATUS_REVIEW], null, $user->id);
            return $iku->fresh();
        });
    }

    /**
     * Review → Perbaikan (dikembalikan ke OPD)
     */
    public function returnForRevision(Indicator $iku, User $user, string $notes): Indicator
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_REVIEW) {
            throw new \LogicException("IKU harus berstatus 'Review' untuk dapat dikembalikan.");
        }

        if (empty(trim($notes))) {
            throw new \InvalidArgumentException("Catatan perbaikan wajib diisi saat mengembalikan IKU.");
        }

        return DB::transaction(function () use ($iku, $user, $notes) {
            $prev = $iku->only(['iku_status']);
            $iku->update(['iku_status' => Indicator::IKU_STATUS_PERBAIKAN]);
            $this->recordHistory($iku, IkuHistory::ACTION_RETURN, $prev, ['iku_status' => Indicator::IKU_STATUS_PERBAIKAN], $notes, $user->id);
            return $iku->fresh();
        });
    }

    /**
     * Review → Final (Bappeda finalisasi)
     */
    public function finalize(Indicator $iku, User $user): Indicator
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_REVIEW) {
            throw new \LogicException("IKU harus berstatus 'Review' untuk dapat difinalisasi.");
        }

        return DB::transaction(function () use ($iku, $user) {
            $prev = $iku->only(['iku_status']);
            $iku->update(['iku_status' => Indicator::IKU_STATUS_FINAL]);
            $this->recordHistory($iku, IkuHistory::ACTION_FINALIZE, $prev, ['iku_status' => Indicator::IKU_STATUS_FINAL], null, $user->id);
            return $iku->fresh();
        });
    }

    /**
     * Final → Nonaktif (IKU tidak dipakai untuk transaksi baru)
     */
    public function deactivate(Indicator $iku, User $user): Indicator
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_FINAL) {
            throw new \LogicException("Hanya IKU berstatus 'Final' yang dapat dinonaktifkan.");
        }

        return DB::transaction(function () use ($iku, $user) {
            $prev = $iku->only(['iku_status']);
            $iku->update(['iku_status' => Indicator::IKU_STATUS_NONAKTIF]);
            $this->recordHistory($iku, IkuHistory::ACTION_DEACTIVATE, $prev, ['iku_status' => Indicator::IKU_STATUS_NONAKTIF], null, $user->id);
            return $iku->fresh();
        });
    }

    /**
     * Catat perubahan ke tabel iku_histories.
     */
    public function recordHistory(
        Indicator $iku,
        string    $action,
        ?array    $previousData,
        ?array    $newData,
        ?string   $notes,
        int       $userId
    ): IkuHistory {
        return IkuHistory::create([
            'indicator_id'  => $iku->id,
            'action'        => $action,
            'previous_data' => $previousData,
            'new_data'      => $newData,
            'notes'         => $notes,
            'user_id'       => $userId,
            'created_at'    => now(),
        ]);
    }

    /**
     * Snapshot semua field penting IKU untuk disimpan di history.
     */
    public function snapshot(Indicator $iku): array
    {
        return $iku->only([
            'name', 'definition', 'formula_notes', 'data_source',
            'level', 'planning_period_id', 'strategic_goal_id',
            'strategic_objective_id', 'polarization', 'baseline_year',
            'baseline_value', 'baseline_note', 'measurement_unit_id',
            'frequency', 'responsible_officer_id', 'iku_status',
        ]);
    }
}
