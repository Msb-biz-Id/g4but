<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public function log(
        string $action,
        ?string $resourceType = null,
        ?int $resourceId = null,
        ?int $organizationId = null,
        ?array $diff = null,
        ?string $reason = null,
        ?string $actorType = null,
        ?int $actorId = null,
    ): void {
        $user = Request::user();
        $requestId = Request::header('X-Request-ID');

        AuditLog::create([
            'actor_id' => $actorId ?? $user?->getKey(),
            'actor_type' => $actorType ?? ($user ? $user::class : null),
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'organization_id' => $organizationId,
            'diff' => $diff,
            'reason' => $reason,
            'request_id' => $requestId,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'created_at' => now(),
        ]);
    }
}
