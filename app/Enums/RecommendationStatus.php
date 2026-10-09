<?php

namespace App\Enums;

enum RecommendationStatus: string
{
    case Open       = 'open';
    case InProgress = 'in_progress';
    case Submitted  = 'submitted';
    case Verified   = 'verified';
    case Closed     = 'closed';
}

