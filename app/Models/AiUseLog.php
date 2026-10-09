<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUseLog extends Model
{
    protected $fillable = [
        'user_id', 'organization_id', 'periode', 'feature', 'provider', 'prompt_template',
        'context_ref', 'prompt', 'output', 'status', 'error_message', 'latency_ms',
    ];

    protected function casts(): array
    {
        return [
            'context_ref' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
