<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RealizationValidation extends Model
{
    protected $table = 'validations';

    protected $fillable = [
        'realization_id', 'validator_id', 'action', 'comment', 'request_id', 'validated_at',
    ];

    protected function casts(): array
    {
        return [
            'validated_at' => 'datetime',
        ];
    }

    public function realization(): BelongsTo
    {
        return $this->belongsTo(Realization::class);
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validator_id');
    }
}
