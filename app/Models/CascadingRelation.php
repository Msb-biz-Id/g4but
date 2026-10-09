<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CascadingRelation extends Model
{
    use HasFactory;

    protected $fillable = [
        'performance_period_id', 'from_tree_id', 'to_tree_id', 'type', 'description', 'created_by',
    ];

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function fromTree(): BelongsTo
    {
        return $this->belongsTo(PlanningTree::class, 'from_tree_id');
    }

    public function toTree(): BelongsTo
    {
        return $this->belongsTo(PlanningTree::class, 'to_tree_id');
    }
}
