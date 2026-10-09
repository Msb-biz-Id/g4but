<?php

namespace App\Http\Controllers\Integration;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    public function index(): Response
    {
        $this->authorize('view-integrations');

        return Inertia::render('Integrations/Index', [
            'integrationsEnabled' => (bool) config('ekasuari.integrations.enabled'),
            'logs' => IntegrationLog::query()
                ->latest('id')
                ->limit(50)
                ->get(),
        ]);
    }
}
