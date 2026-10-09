<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IkuHistory extends Model
{
    public $timestamps = false;

    protected $table = 'iku_histories';

    protected $fillable = [
        'indicator_id',
        'action',
        'previous_data',
        'new_data',
        'notes',
        'user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'previous_data' => 'array',
            'new_data'      => 'array',
            'created_at'    => 'datetime',
        ];
    }

    // Action constants
    const ACTION_CREATE     = 'create';
    const ACTION_UPDATE     = 'update';
    const ACTION_SUBMIT     = 'submit';
    const ACTION_REVIEW     = 'review';
    const ACTION_RETURN     = 'return';
    const ACTION_FINALIZE   = 'finalize';
    const ACTION_DEACTIVATE = 'deactivate';

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
