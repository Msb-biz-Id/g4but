<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id', 'event', 'channel', 'title', 'message',
        'resource_type', 'resource_id', 'metadata', 'read_at', 'delivery_status',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'json',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
