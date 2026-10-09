<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationLog extends Model
{
    protected $fillable = [
        'integration_name', 'direction', 'endpoint', 'http_method',
        'request_id', 'status', 'request_body', 'response_body',
        'error_message', 'retry_count',
    ];

    protected function casts(): array
    {
        return [
            'request_body' => 'array',
            'response_body' => 'array',
        ];
    }
}
