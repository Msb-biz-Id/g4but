<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoLiveReadiness extends Model
{
    protected $table = 'go_live_readiness';

    protected $fillable = [
        'item_key', 'label', 'category', 'checked', 'checked_by', 'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'checked' => 'boolean',
            'checked_at' => 'datetime',
        ];
    }

    public function checkedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }
}
