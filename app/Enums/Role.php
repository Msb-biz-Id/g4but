<?php

namespace App\Enums;

enum Role: string
{
    case SuperAdmin = 'Super Admin';
    case AdminProvinsi = 'Admin Provinsi';
    case AdminOpd = 'Admin OPD';
    case OperatorOpd = 'Operator OPD';
    case ValidatorOpd = 'Validator OPD';
    case EvaluatorProvinsi = 'Evaluator Provinsi';
    case Inspektorat = 'Inspektorat';
    case KepalaOpd = 'Kepala OPD';
    case PimpinanProvinsi = 'Pimpinan Provinsi';
    case Auditor = 'Auditor';

    /**
     * @return list<string>
     */
    public static function names(): array
    {
        return array_map(fn (self $r) => $r->value, self::cases());
    }
}
