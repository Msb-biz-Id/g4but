<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'short_name', 'type', 'parent_id', 'address', 'phone', 'email',
        'is_active', 'is_bappeda', 'is_pilot_project',
    ];

    protected function casts(): array
    {
        return [
            'is_active'        => 'boolean',
            'is_bappeda'       => 'boolean', // BR-003
            'is_pilot_project' => 'boolean', // G-11
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(OrganizationUnit::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_user')
            ->withPivot('is_default')
            ->withTimestamps();
    }

    public function planningDocuments(): HasMany
    {
        return $this->hasMany(PlanningDocument::class);
    }
}
