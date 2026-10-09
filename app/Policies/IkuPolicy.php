<?php

namespace App\Policies;

use App\Models\Indicator;
use App\Models\User;

/**
 * Policy untuk IKU (Indikator Kinerja Utama).
 *
 * Aturan hak akses berdasarkan iku_status dan role Bappeda:
 *   - Admin OPD  : view, create, edit Draft/Perbaikan, submit
 *   - Admin Bappeda : semua di atas + review, return, finalize, deactivate, delete Draft
 *   - Pimpinan   : view saja
 *   - IKU Final  : tidak boleh hard delete oleh siapapun
 */
class IkuPolicy
{
    // ── View ──────────────────────────────────────────────────────────────────

    public function viewAny(User $user): bool
    {
        return true; // Semua user yang sudah login bisa lihat daftar IKU
    }

    public function view(User $user, Indicator $iku): bool
    {
        return true; // Detail IKU bisa dilihat semua
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function create(User $user): bool
    {
        return $this->isAdminOpd($user) || $this->isBappeda($user);
    }

    // ── Edit (hanya Draft/Perbaikan) ──────────────────────────────────────────

    public function update(User $user, Indicator $iku): bool
    {
        if (! $iku->canBeEdited()) return false;
        if ($this->isBappeda($user)) return true;

        return $this->isAdminOpd($user) && $this->ownsIku($user, $iku);
    }

    // ── Submit ke Review ──────────────────────────────────────────────────────

    public function submit(User $user, Indicator $iku): bool
    {
        if (! $iku->canBeSubmitted()) return false;
        if ($this->isBappeda($user)) return true;

        return $this->isAdminOpd($user) && $this->ownsIku($user, $iku);
    }

    // ── Review, Return, Finalize, Deactivate — hanya Bappeda ─────────────────

    public function review(User $user, Indicator $iku): bool
    {
        return $this->isBappeda($user) && $iku->iku_status === Indicator::IKU_STATUS_DIAJUKAN;
    }

    public function returnRevision(User $user, Indicator $iku): bool
    {
        return $this->isBappeda($user) && $iku->iku_status === Indicator::IKU_STATUS_REVIEW;
    }

    public function finalize(User $user, Indicator $iku): bool
    {
        return $this->isBappeda($user) && $iku->iku_status === Indicator::IKU_STATUS_REVIEW;
    }

    public function deactivate(User $user, Indicator $iku): bool
    {
        return $this->isBappeda($user) && $iku->iku_status === Indicator::IKU_STATUS_FINAL;
    }

    // ── Delete — hanya Draft/Perbaikan, IKU Final TIDAK BOLEH dihapus ─────────

    public function delete(User $user, Indicator $iku): bool
    {
        // IKU Final atau Nonaktif tidak bisa dihapus siapapun
        if ($iku->isFinal() || $iku->iku_status === Indicator::IKU_STATUS_NONAKTIF) {
            return false;
        }

        // Hanya Draft atau Perbaikan yang bisa dihapus
        if (! in_array($iku->iku_status, [Indicator::IKU_STATUS_DRAFT, Indicator::IKU_STATUS_PERBAIKAN])) {
            return false;
        }

        if ($this->isBappeda($user)) {
            return true;
        }

        // Admin OPD hanya boleh menghapus IKU draft/perbaikan milik OPD-nya sendiri
        return $this->isAdminOpd($user) && $this->ownsIku($user, $iku);
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function isBappeda(User $user): bool
    {
        return $user->hasRole('Super Admin')
            || $user->hasRole('super_admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('admin_provinsi')
            || $user->hasRole('Evaluator Provinsi');
    }

    private function isAdminOpd(User $user): bool
    {
        return $user->hasRole('Admin OPD')
            || $user->hasRole('admin_opd')
            || $user->hasRole('Operator OPD')
            || $user->hasRole('operator_opd')
            || $user->hasRole('Validator OPD')
            || $user->hasRole('Kepala OPD')
            || $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi');
    }

    private function ownsIku(User $user, Indicator $iku): bool
    {
        if (! $iku->owner_organization_id) {
            return false;
        }

        $userOrgIds = $user->organizations()->pluck('organizations.id')->all();
        if ($user->organization) {
            $userOrgIds[] = $user->organization->id;
        }

        return in_array($iku->owner_organization_id, $userOrgIds);
    }
}
