<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSnapshot extends Model
{
    protected $fillable = [
        'report_id', 'snapshot_at', 'data', 'checksum', 'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_at' => 'datetime',
            'data' => 'json',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }
}
