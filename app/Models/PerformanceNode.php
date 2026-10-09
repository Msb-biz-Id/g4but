<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PerformanceNode extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id', 'strategic_objective_id', 'title', 'description',
        'node_type', 'is_root', 'status',
    ];

    protected function casts(): array
    {
        return [
            'is_root' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function strategicObjective(): BelongsTo
    {
        return $this->belongsTo(StrategicObjective::class);
    }

    public function parents(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'performance_relations', 'child_node_id', 'parent_node_id');
    }

    public function children(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'performance_relations', 'parent_node_id', 'child_node_id');
    }
}
