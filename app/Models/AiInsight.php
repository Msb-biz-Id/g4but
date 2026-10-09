<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiInsight extends Model
{
    protected $fillable = [
        'ai_request_id', 'user_id', 'insight_type', 'title', 'content', 'source_refs',
        'status', 'rating', 'review_comment', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'json',
            'source_refs' => 'json',
            'rating' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function aiRequest(): BelongsTo
    {
        return $this->belongsTo(AiRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
