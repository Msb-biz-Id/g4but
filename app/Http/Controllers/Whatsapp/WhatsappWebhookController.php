<?php

namespace App\Http\Controllers\Whatsapp;

use App\Http\Controllers\Controller;
use App\Models\AppConfig;
use App\Services\Whatsapp\Providers\SimulatedWhatsappProvider;
use App\Services\Whatsapp\WhatsappMessageProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Inbound WhatsApp webhook (BRD FR-WA-001).
 *
 * Public endpoint verified by a shared webhook secret. Intended to be hit by a
 * WhatsApp provider (Meta/Fonnte/Wablas). In development this endpoint is the
 * supported way to exercise the chatbot via a simulated payload.
 */
class WhatsappWebhookController extends Controller
{
    private const MAX_PAYLOAD = 2000;

    public function __invoke(Request $request): JsonResponse
    {
        // FR-WA-014 integration gate.
        if (! (bool) AppConfig::value('whatsapp.enabled', true)) {
            return response()->json(['status' => 'disabled'], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $secret = trim((string) AppConfig::value('whatsapp.webhook_secret', ''));
        $provided = $request->header('X-Webhook-Secret', $request->input('secret', ''));

        // Webhook must always be verified (FR-WA-001, §6.10 security). When no
        // explicit secret is configured, derive a stable default from the app key
        // so the endpoint is never open.
        if ($secret === '') {
            $secret = 'ekasuari:'.hash('sha256', (string) config('app.key'));
        }

        if (! hash_equals($secret, (string) $provided)) {
            return response()->json(['status' => 'unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        if ($request->header('Content-Type') === 'application/json') {
            $payload = $request->json()->all();
        } else {
            $payload = $request->all();
        }

        if (! is_array($payload) || ($payload['message'] ?? $payload['text'] ?? '') === '') {
            return response()->json(['status' => 'invalid'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $message = app(WhatsappMessageProcessor::class)->processPayload(
                app(SimulatedWhatsappProvider::class),
                array_slice($payload, 0, self::MAX_PAYLOAD)
            );

            return response()->json([
                'status' => 'ok',
                'reply' => $message->content,
                'direction' => $message->direction,
                'session_id' => $message->whatsapp_session_id,
            ]);
        } catch (\Throwable $e) {
            return response()->json(
                ['status' => 'error', 'message' => $e->getMessage()],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }
}
