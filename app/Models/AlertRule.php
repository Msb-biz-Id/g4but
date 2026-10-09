<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AlertRule extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'rule_type', 'severity', 'config', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'json',
            'is_active' => 'boolean',
        ];
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class, 'rule_id');
    }
}
