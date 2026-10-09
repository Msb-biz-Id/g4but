<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Evidence extends Model
{
    use SoftDeletes;

    protected $table = 'evidences';

    protected $fillable = [
        'realization_id', 'object_key', 'file_name', 'mime_type', 'size',
        'checksum', 'uploader_id', 'uploaded_at', 'status',
    ];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
        ];
    }

    public function realization(): BelongsTo
    {
        return $this->belongsTo(Realization::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }
}
