<?php

namespace App\Services\Whatsapp\Contracts;

use App\Models\WhatsappMessage;

/**
 * WhatsApp provider adapter contract (BRD §6.10, FR-WA-014/015/016).
 *
 * Decouples inbound message processing from the concrete provider
 * (Meta/Fonnte/Wablas or a simulated test channel).
 */
interface WhatsappProviderContract
{
    /**
     * Handle an inbound message obtained from a provider webhook.
     *
     * @param  array<string, mixed>  $payload  raw provider payload
     * @return WhatsappMessage the persisted inbound message
     */
    public function handleInbound(array $payload): WhatsappMessage;

    /**
     * Send an outbound reply for a WhatsApp channel.
     */
    public function send(WhatsappMessage $message, string $recipient, string $text): void;
}
