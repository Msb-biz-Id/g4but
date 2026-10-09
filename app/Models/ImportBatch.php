<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatch extends Model
{
    protected $fillable = [
        'import_type', 'file_name', 'status', 'total_rows', 'valid_rows',
        'invalid_rows', 'imported', 'skipped', 'rows', 'errors',
        'created_by', 'committed_by', 'committed_at',
    ];

    protected function casts(): array
    {
        return [
            'rows' => 'array',
            'errors' => 'array',
            'committed_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function committer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'committed_by');
    }
}
