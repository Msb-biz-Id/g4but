<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Meng-generate X-Request-ID unik untuk setiap request yang masuk (FR-COM-017).
 * ID ini dipakai AuditService untuk menghubungkan log lintas proses.
 */
class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasHeader('X-Request-ID')) {
            $request->headers->set('X-Request-ID', Str::uuid()->toString());
        }

        $response = $next($request);
        $response->headers->set('X-Request-ID', $request->header('X-Request-ID'));

        return $response;
    }
}
