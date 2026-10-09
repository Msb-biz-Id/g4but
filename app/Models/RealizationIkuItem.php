<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RealizationIkuItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'indicator_name',
        'unit',
        'measurement_pattern',
        'targets',
        'realizations',
        'created_by',
    ];

    protected $casts = [
        'targets' => 'array',
        'realizations' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(Indicator::class, 'indicator_id')->withDefault(function ($indicator, $model) {
            $indicator->id = 0;
            $indicator->name = $model->indicator_name ?? '-';
            $indicator->code = 'IKU-' . ($model->id ?? '0');
        });
    }
}
