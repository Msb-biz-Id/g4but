<?php

namespace App\Services\Whatsapp\Providers;

use App\Models\WhatsappMessage;
use App\Services\Whatsapp\Contracts\WhatsappProviderContract;
use App\Services\Whatsapp\WhatsappMessageProcessor;

/**
 * Simulated WhatsApp adapter used for development/testing when no real
 * provider webhook is configured (BRD FR-WA-001/016). Accepts a payload of
 * shape: { "phone_number": "...", "message": "...", "provider_ref": "..." }.
 */
class SimulatedWhatsappProvider implements WhatsappProviderContract
{
    public function handleInbound(array $payload): WhatsappMessage
    {
        $processor = app(WhatsappMessageProcessor::class);

        $number = $payload['phone_number'] ?? $payload['from'] ?? '';
        $text = $payload['message'] ?? $payload['text'] ?? '';

        return $processor->process((string) $number, (string) $text, (string) ($payload['provider_ref'] ?? ''));
    }

    public function send(WhatsappMessage $message, string $recipient, string $text): void
    {
        WhatsappMessage::create([
            'whatsapp_session_id' => $message->whatsapp_session_id,
            'user_id' => $message->user_id,
            'phone_number' => $recipient,
            'direction' => 'outbound',
            'content' => $text,
            'status' => 'sent',
            'created_at' => now(),
        ]);
    }
}
