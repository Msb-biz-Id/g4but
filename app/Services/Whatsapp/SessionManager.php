<?php

namespace App\Services\Whatsapp;

use App\Models\AppConfig;
use App\Models\WhatsappIdentity;
use App\Models\WhatsappSession;

/**
 * WhatsApp conversation session handling (BRD FR-WA-008).
 *
 * Maintains per-number context with a configurable TTL. Sessions are blocked
 * when the identity is suspended or removed, and closed after expiry.
 */
class SessionManager
{
    public const DEFAULT_TTL = 3600; // seconds

    /**
     * Get or create an active session for a normalized number.
     */
    public function getOrCreate(WhatsappIdentity $identity, ?int $ttl = null): WhatsappSession
    {
        $ttl = $ttl ?: (int) AppConfig::value('whatsapp.session_ttl', self::DEFAULT_TTL);

        $this->expireStale($identity->phone_number);

        $session = WhatsappSession::query()
            ->where('phone_number', $identity->phone_number)
            ->where('status', 'active')
            ->first();

        if ($session) {
            $session->update([
                'last_activity_at' => now(),
                'expires_at' => now()->addSeconds($ttl),
            ]);

            return $session;
        }

        return WhatsappSession::create([
            'user_id' => $identity->user_id,
            'phone_number' => $identity->phone_number,
            'status' => 'active',
            'context' => ['created_at' => now()->toDateTimeString()],
            'last_activity_at' => now(),
            'expires_at' => now()->addSeconds($ttl),
        ]);
    }

    public function appendContext(int $sessionId, string $key, mixed $value): void
    {
        $session = WhatsappSession::find($sessionId);
        if (! $session) {
            return;
        }

        $context = $session->context ?? [];
        $context[$key] = $value;
        $session->update([
            'context' => $context,
            'last_activity_at' => now(),
        ]);
    }

    public function block(int $sessionId): void
    {
        WhatsappSession::where('id', $sessionId)->update(['status' => 'blocked']);
    }

    public function close(int $sessionId): void
    {
        WhatsappSession::where('id', $sessionId)->update(['status' => 'closed']);
    }

    public function isActive(int $sessionId): bool
    {
        $session = WhatsappSession::find($sessionId);

        return $session
            && $session->status === 'active'
            && (! $session->expires_at || $session->expires_at->isFuture());
    }

    private function expireStale(string $phoneNumber): void
    {
        WhatsappSession::query()
            ->where('phone_number', $phoneNumber)
            ->where('status', 'active')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '<', now()))
            ->update(['status' => 'closed']);
    }
}
