<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Pohon Kinerja — merepresentasikan tabel planning_trees.
 *
 * Hierarki kinerja berbasis tujuan/sasaran/program/kegiatan.
 * Nama class PlanningTree agar sesuai dengan referensi di PlanningController.
 */
class PlanningTree extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id', 'performance_period_id', 'parent_id', 'level', 'code',
        'name', 'description', 'indicator_id', 'sort_order', 'is_active',
        'static_file_path', 'static_file_label', // G-14: fallback upload statis AC-015
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function allChildren(): HasMany
    {
        return $this->children()->with([
            'indicator',
            'organization:id,code,name,short_name',
            'allChildren',
        ]);
    }

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class);
    }
}
