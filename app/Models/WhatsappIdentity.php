<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappIdentity extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'phone_number', 'display_number', 'is_verified', 'verified_at',
        'verification_code_hash', 'verification_code_expires_at', 'provider_chat_id',
        'is_active', 'is_suspended', 'suspended_at',
    ];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'is_active' => 'boolean',
            'is_suspended' => 'boolean',
            'verified_at' => 'datetime',
            'verification_code_expires_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
