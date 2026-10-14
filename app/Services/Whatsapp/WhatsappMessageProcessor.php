<?php

namespace App\Services\Whatsapp;

use App\Models\AppConfig;
use App\Models\User;
use App\Models\WhatsappHandoff;
use App\Models\WhatsappIdentity;
use App\Models\WhatsappMessage;
use App\Services\Ai\AiService;
use App\Services\AuditService;
use App\Services\Whatsapp\Contracts\WhatsappProviderContract;
use Illuminate\Support\Facades\Log;

/**
 * WhatsApp inbound message processing pipeline (BRD FR-WA-003 to FR-WA-017).
 *
 * Chain: identity check → suspend check → user check → session → handoff
 * detection → AI call → persist outbound → audit.
 */
class WhatsappMessageProcessor
{
    public function __construct(
        private readonly SessionManager $sessions,
        private readonly AiService $ai,
        private readonly AuditService $audit,
    ) {}

    /**
     * Process a raw inbound message from a normalized phone number.
     */
    public function process(string $number, string $text, string $providerRef = ''): WhatsappMessage
    {
        // Persist the inbound message immediately
        $message = WhatsappMessage::create([
            'phone_number' => $number,
            'direction' => 'inbound',
            'content' => substr($text, 0, 4000),
            'status' => 'received',
            'message_id' => $providerRef ?: null,
            'created_at' => now(),
        ]);

        // 1. Integration enable gate (FR-WA-014)
        if (! $this->channelEnabled()) {
            return $this->respond($message, 'Layanan chatbot WhatsApp sedang dinonaktifkan.');
        }

        // 2. Identity lookup (FR-WA-003)
        $identity = WhatsappIdentity::query()
            ->where('phone_number', $number)
            ->first();

        if (! $identity) {
            return $this->reject($message, 'Nomor tidak terdaftar.');
        }

        // 3. Active + verified + not suspended (FR-WA-004, FR-WA-018)
        if (! $identity->is_active) {
            return $this->reject($message, 'Nomor dinonaktifkan.');
        }
        if (! $identity->is_verified) {
            return $this->reject($message, 'Nomor belum diverifikasi.');
        }
        if ($identity->is_suspended) {
            $this->sessions->block($this->findOrCreateSession($identity));

            return $this->reject($message, 'Akses chatbot ditangguhkan.');
        }

        // 4. User must be active (FR-WA-004)
        $user = User::find($identity->user_id);
        if (! $user) {
            return $this->reject($message, 'Akun tidak ditemukan.');
        }

        // 5. Session + context (FR-WA-008)
        $session = $this->sessions->getOrCreate($identity);
        $this->sessions->appendContext($session->id, 'last_topic', $this->guessTopic($text));
        $message->update(['whatsapp_session_id' => $session->id, 'user_id' => $user->id, 'status' => 'processed']);

        // 5b. Handoff to a human agent (FR-WA-017): routed before the AI call.
        if ($this->wantsHuman($text)) {
            $handoff = WhatsappHandoff::create([
                'whatsapp_session_id' => $session->id,
                'user_id' => $user->id,
                'phone_number' => $number,
                'request_text' => $text,
                'status' => 'pending',
            ]);

            $this->audit->log(
                action: 'whatsapp.handoff',
                resourceType: WhatsappHandoff::class,
                resourceId: $handoff->id,
                diff: ['phone_number' => $number, 'session_id' => $session->id],
            );

            $this->sessions->appendContext($session->id, 'handoff_id', $handoff->id);

            $reply = 'Percakapan Anda akan diteruskan ke petugas. Mohon tunggu, petugas akan menghubungi Anda kembali. Terima kasih.';
            $outbound = WhatsappMessage::create([
                'whatsapp_session_id' => $session->id,
                'user_id' => $user->id,
                'phone_number' => $number,
                'direction' => 'outbound',
                'content' => $reply,
                'status' => 'sent',
                'created_at' => now(),
            ]);

            $message->update(['status' => 'processed']);

            return $outbound;
        }

        // 6. AI call via AiService (FR-WA-005/007/009/010)
        try {
            $sessionContext = $session->context ?? [];
            $result = $this->ai->generate(
                feature: 'chat',
                promptContext: $text,
                contextData: [
                    'module' => 'AI Chatbot WhatsApp',
                    'channel' => 'whatsapp',
                    'organization_id' => $user->organization_id ?? null,
                    'session_context' => [
                        'topic' => $sessionContext['last_topic'] ?? null,
                        'prior_topics' => array_slice(
                            array_values(array_filter($sessionContext, fn ($v) => is_string($v))),
                            0, 6
                        ),
                    ],
                    'answer' => $text,
                    'generated_at' => now()->toIso8601String(),
                ],
            );
            $reply = $result['output'];
            $status = ($result['status'] ?? '') === 'fallback' ? 'sent' : 'sent';
        } catch (\Throwable $e) {
            Log::warning('WhatsApp AI failed', ['error' => $e->getMessage()]);
            $reply = 'Layanan sedang sibuk. Silakan coba beberapa saat lagi.';
            $status = 'failed';
        }

        $this->sessions->appendContext($session->id, 'last_reply', $reply);

        // 7. Persist outbound + audit (FR-WA-013)
        $outbound = WhatsappMessage::create([
            'whatsapp_session_id' => $session->id,
            'user_id' => $user->id,
            'phone_number' => $number,
            'direction' => 'outbound',
            'content' => $reply,
            'status' => $status,
            'created_at' => now(),
        ]);

        $this->audit->log(
            action: 'whatsapp.message',
            resourceType: WhatsappMessage::class,
            resourceId: $outbound->id,
            diff: ['phone_number' => $number, 'status' => $status],
        );

        $message->update(['status' => $status === 'failed' ? 'failed' : 'processed']);

        return $outbound;
    }

    /**
     * Process a payload from a concrete provider adapter.
     *
     * @param  array<string, mixed>  $payload
     */
    public function processPayload(WhatsappProviderContract $adapter, array $payload): WhatsappMessage
    {
        return $adapter->handleInbound($payload);
    }

    private function channelEnabled(): bool
    {
        return (bool) AppConfig::value('whatsapp.enabled', true);
    }

    private function reject(WhatsappMessage $message, string $reason): WhatsappMessage
    {
        $appName = AppConfig::value('app_name') ?: config('app.name', 'e-SAKIP');
        $reply = "Maaf, Anda tidak dapat mengakses layanan ini. Silakan hubungi admin {$appName} apabila Anda merasa pesan ini keliru.";
        $message->update(['status' => 'blocked']);

        WhatsappMessage::create([
            'phone_number' => $message->phone_number,
            'direction' => 'outbound',
            'content' => $reply,
            'status' => 'blocked',
            'created_at' => now(),
        ]);

        return $message;
    }

    private function respond(WhatsappMessage $message, string $text): WhatsappMessage
    {
        WhatsappMessage::create([
            'phone_number' => $message->phone_number,
            'direction' => 'outbound',
            'content' => $text,
            'status' => 'sent',
            'created_at' => now(),
        ]);

        return $message;
    }

    private function findOrCreateSession(WhatsappIdentity $identity): int
    {
        return $this->sessions->getOrCreate($identity)->id;
    }

    private function guessTopic(string $text): string
    {
        $lower = strtolower($text);

        return match (true) {
            str_contains($lower, 'ringkas') || str_contains($lower, 'summary') => 'ringkasan',
            str_contains($lower, 'risiko') || str_contains($lower, 'risk') => 'risiko',
            str_contains($lower, 'rekomend') => 'rekomendasi',
            str_contains($lower, 'capaian') || str_contains($lower, 'indikator') => 'capaian',
            default => 'umum',
        };
    }

    /**
     * Detect an explicit handoff request to a human agent (FR-WA-017).
     */
    private function wantsHuman(string $text): bool
    {
        $lower = strtolower(trim($text));
        $needles = [
            'bicara dengan petugas', 'bicara manusia', 'hubungi petugas', 'hubungi manusia',
            'petugas manusia', 'agent manusia', 'operator manusia', 'bicara dengan orang',
            'minta petugas', 'panggil petugas', 'human agent', 'talk to a human',
            'handover ke petugas', 'transfer ke petugas',
        ];

        return collect($needles)->contains(fn ($n) => str_contains($lower, $n));
    }
}
