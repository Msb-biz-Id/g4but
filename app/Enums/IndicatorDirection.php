<?php

namespace App\Enums;

enum IndicatorDirection: string
{
    case HigherIsBetter = 'higher_is_better';
    case LowerIsBetter = 'lower_is_better';
    case Exact = 'exact';
    case Binary = 'binary';
    case Custom = 'custom';
}
