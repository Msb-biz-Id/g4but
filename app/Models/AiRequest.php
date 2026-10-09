<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiRequest extends Model
{
    protected $fillable = [
        'user_id', 'feature', 'status', 'context', 'prompt', 'response',
        'model', 'prompt_tokens', 'completion_tokens', 'latency_ms', 'failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'json',
            'prompt' => 'json',
            'response' => 'json',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function insights(): HasMany
    {
        return $this->hasMany(AiInsight::class);
    }
}
