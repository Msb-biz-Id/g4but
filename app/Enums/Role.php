<?php

namespace App\Enums;

enum Role: string
{
    case SuperAdmin = 'Super Admin';
    case AdminOpd = 'Admin OPD';
    case KepalaOpd = 'Kepala OPD';
    case AdminSekretariat = 'Admin Sekretariat';
    case KepalaSekretariat = 'Kepala Sekretariat';
    case AdminBidang = 'Admin Bidang';
    case KepalaBidang = 'Kepala Bidang';

    /**
     * @return list<string>
     */
    public static function names(): array
    {
        return array_map(fn (self $r) => $r->value, self::cases());
    }

    /**
     * Role yang terikat pada unit tertentu (Sekretariat atau Bidang).
     *
     * @return list<string>
     */
    public static function unitScopedRoles(): array
    {
        return [
            self::AdminSekretariat->value,
            self::KepalaSekretariat->value,
            self::AdminBidang->value,
            self::KepalaBidang->value,
        ];
    }

    /**
     * Role pimpinan / checker.
     *
     * @return list<string>
     */
    public static function leadershipRoles(): array
    {
        return [
            self::KepalaOpd->value,
            self::KepalaSekretariat->value,
            self::KepalaBidang->value,
        ];
    }

    /**
     * Role admin / maker / pengelola.
     *
     * @return list<string>
     */
    public static function adminRoles(): array
    {
        return [
            self::SuperAdmin->value,
            self::AdminOpd->value,
            self::AdminSekretariat->value,
            self::AdminBidang->value,
        ];
    }
}
