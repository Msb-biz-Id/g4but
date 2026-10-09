<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataMigration extends Model
{
    protected $fillable = [
        'name', 'entity_type', 'source_file', 'status',
        'source_count', 'mapped_count', 'cleansed_count', 'transformed_count', 'loaded_count',
        'profile', 'staging', 'reconciliation',
        'created_by', 'signed_off_by', 'signed_off_at', 'loaded_by', 'loaded_at',
    ];

    protected function casts(): array
    {
        return [
            'profile' => 'array',
            'staging' => 'array',
            'reconciliation' => 'array',
            'signed_off_at' => 'datetime',
            'loaded_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function signer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_off_by');
    }

    public function loader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'loaded_by');
    }
}
