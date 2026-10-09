<?php

namespace App\Policies;

use App\Models\Indicator;
use App\Models\User;
use App\Services\AuthorizationService;

/**
 * Policy untuk IKU (Indikator Kinerja Utama) dalam arsitektur Rumah Besar OPD.
 *
 * Maker-Checker Segregation:
 *   - Admin OPD / Super Admin : Maker & Admin tingkat OPD lintas unit.
 *   - Kepala OPD             : Checker & Pimpinan tingkat OPD (sahkan / finalisasi).
 *   - Admin Unit             : Maker di unit masing-masing (Sekretariat / Bidang).
 *   - Kepala Unit            : Checker di unit masing-masing (review / persetujuan).
 *   - IKU Final              : Tidak dapat dihapus secara permanen.
 */
class IkuPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Indicator $iku): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isOpdAdmin()
            || $user->hasRole('Admin Sekretariat')
            || $user->hasRole('Admin Bidang')
            || $user->hasPermission('iku:create');
    }

    public function update(User $user, Indicator $iku): bool
    {
        if (! $iku->canBeEdited()) {
            return false;
        }

        if ($user->isOpdAdmin()) {
            return true;
        }

        return ($user->hasRole('Admin Sekretariat') || $user->hasRole('Admin Bidang'))
            && $this->ownsIku($user, $iku);
    }

    public function submit(User $user, Indicator $iku): bool
    {
        if (! $iku->canBeSubmitted()) {
            return false;
        }

        if ($user->isOpdAdmin()) {
            return true;
        }

        return ($user->hasRole('Admin Sekretariat') || $user->hasRole('Admin Bidang'))
            && $this->ownsIku($user, $iku);
    }

    public function review(User $user, Indicator $iku): bool
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_DIAJUKAN) {
            return false;
        }

        if ($user->isOpdAdmin() || $user->hasRole('Kepala OPD')) {
            return true;
        }

        return $user->isLeadership() && $this->ownsIku($user, $iku);
    }

    public function returnRevision(User $user, Indicator $iku): bool
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_REVIEW) {
            return false;
        }

        if ($user->isOpdAdmin() || $user->hasRole('Kepala OPD')) {
            return true;
        }

        return $user->isLeadership() && $this->ownsIku($user, $iku);
    }

    public function finalize(User $user, Indicator $iku): bool
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_REVIEW) {
            return false;
        }

        if ($user->isOpdAdmin() || $user->hasRole('Kepala OPD')) {
            return true;
        }

        return $user->isLeadership() && $this->ownsIku($user, $iku);
    }

    public function deactivate(User $user, Indicator $iku): bool
    {
        if ($iku->iku_status !== Indicator::IKU_STATUS_FINAL) {
            return false;
        }

        return $user->isOpdAdmin() || $user->hasRole('Kepala OPD');
    }

    public function delete(User $user, Indicator $iku): bool
    {
        if ($iku->isFinal() || $iku->iku_status === Indicator::IKU_STATUS_NONAKTIF) {
            return false;
        }

        if (! in_array($iku->iku_status, [Indicator::IKU_STATUS_DRAFT, Indicator::IKU_STATUS_PERBAIKAN], true)) {
            return false;
        }

        if ($user->isOpdAdmin()) {
            return true;
        }

        return ($user->hasRole('Admin Sekretariat') || $user->hasRole('Admin Bidang'))
            && $this->ownsIku($user, $iku);
    }

    private function ownsIku(User $user, Indicator $iku): bool
    {
        if (! $iku->owner_organization_id) {
            return false;
        }

        $accessibleOrgIds = app(AuthorizationService::class)->accessibleOrganizationIds($user);

        return in_array((int) $iku->owner_organization_id, $accessibleOrgIds, true);
    }
}
