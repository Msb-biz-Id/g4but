<?php

namespace App\Enums;

enum WorkflowStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case RevisionRequired = 'revision_required';
    case Resubmitted = 'resubmitted';
    case Approved = 'approved';
    case Locked = 'locked';
    case Archived = 'archived';
    case Cancelled = 'cancelled';

    public static function values(): array
    {
        return array_map(fn (self $s) => $s->value, self::cases());
    }
}
