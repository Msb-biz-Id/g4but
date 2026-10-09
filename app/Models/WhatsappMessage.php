<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappMessage extends Model
{
    use HasFactory;

    public $timestamps = false;

    public const DIR_INBOUND = 'inbound';

    public const DIR_OUTBOUND = 'outbound';

    protected $fillable = [
        'whatsapp_session_id', 'user_id', 'phone_number', 'direction', 'content',
        'status', 'message_id', 'metadata', 'ai_request_id', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(WhatsappSession::class, 'whatsapp_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
