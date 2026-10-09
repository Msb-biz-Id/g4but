<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceRelation extends Model
{
    protected $fillable = ['parent_node_id', 'child_node_id', 'relation_type', 'weight'];

    protected function casts(): array
    {
        return [
            'weight' => 'decimal:4',
        ];
    }

    public function parentNode(): BelongsTo
    {
        return $this->belongsTo(PerformanceNode::class, 'parent_node_id');
    }

    public function childNode(): BelongsTo
    {
        return $this->belongsTo(PerformanceNode::class, 'child_node_id');
    }
}
