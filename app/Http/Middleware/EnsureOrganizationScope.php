<?php

namespace App\Http\Middleware;

use App\Services\AuthorizationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationScope
{
    public function __construct(private readonly AuthorizationService $authorization) {}

    /**
     * Verifikasi bahwa parameter organization pada request berada dalam scope pengguna.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $organizationId = $request->route('organization')
            ?? $request->route('organization_id')
            ?? $request->input('organization_id')
            ?? $request->input('owner_organization_id')
            ?? $request->input('unit_id');

        if ($organizationId !== null && $organizationId !== '') {
            $organizationId = is_object($organizationId) ? $organizationId->getKey() : (int) $organizationId;

            $user = $request->user();

            if (! $user || ! $this->authorization->canAccessOrganization($user, $organizationId)) {
                abort(403, 'Di luar lingkup organisasi Anda.');
            }
        }

        return $next($request);
    }
}
