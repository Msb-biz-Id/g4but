<?php

namespace App\Services;

use App\Models\Agreement;
use App\Models\Alert;
use App\Models\AppConfig;
use App\Models\AppNotification;
use App\Models\PlanningDocument;
use App\Models\User;
use Illuminate\Support\Collection;


/**
 * Discovers recipients for BRD §12 notification types and sends in-app
 * notifications. Recipients are resolved from roles and organizations
 * server-side so notifications never cross tenancy scopes.
 *
 * Channels are governed by app_config `notification.channels.{channel}`
 * (application/in-app toggle). WhatsApp channel is handled separately via
 * the WhatsApp module.
 */
class NotificationService
{
    /**
     * Notify all active users of a given role, optionally scoped to an
     * organization via the pivot table.
     */
    public function toRole(
        string $roleName,
        string $event,
        string $title,
        ?string $message = null,
        ?int $organizationId = null,
        ?string $resourceType = null,
        ?int $resourceId = null,
    ): void {
        $query = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->where('roles.name', $roleName));

        if ($organizationId !== null) {
            $query->whereHas(
                'organizations',
                fn ($q) => $q->where('organizations.id', $organizationId)
            );
        }

        $this->send($query->get(), $event, $title, $message, $resourceType, $resourceId);
    }

    /**
     * Notify the Operator OPD users of a specific organization.
     */
    public function toOrganizationOperators(
        int $organizationId,
        string $event,
        string $title,
        ?string $message = null,
        ?string $resourceType = null,
        ?int $resourceId = null,
    ): void {
        $users = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->where('roles.name', 'Operator OPD'))
            ->whereHas(
                'organizations',
                fn ($q) => $q->where('organizations.id', $organizationId)
            )
            ->get();

        $this->send($users, $event, $title, $message, $resourceType, $resourceId);
    }

    /**
     * Notify the validator / evaluator teams.
     */
    public function toValidators(
        string $event,
        string $title,
        ?string $message = null,
        ?int $organizationId = null,
        ?string $resourceType = null,
        ?int $resourceId = null,
    ): void {
        $query = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', [
                'Validator OPD',
                'Evaluator Provinsi',
                'Inspektorat',
            ]));

        if ($organizationId !== null) {
            $query->whereHas(
                'organizations',
                fn ($q) => $q->where('organizations.id', $organizationId)
            );
        }

        $this->send($query->get(), $event, $title, $message, $resourceType, $resourceId);
    }

    /**
     * Notify a specific user directly.
     */
    public function toUser(
        User $user,
        string $event,
        string $title,
        ?string $message = null,
        ?string $resourceType = null,
        ?int $resourceId = null,
    ): void {
        $this->send(collect([$user]), $event, $title, $message, $resourceType, $resourceId);
    }

    /**
     * Notify all Super Admin users.
     */
    public function toSuperAdmins(
        string $event,
        string $title,
        ?string $message = null,
        ?string $resourceType = null,
        ?int $resourceId = null,
    ): void {
        $this->toRole('Super Admin', $event, $title, $message, null, $resourceType, $resourceId);
    }

    // ─── Planning Document Notifications ──────────────────────────────────────

    /**
     * Notify Admin Pemprov & Super Admin when an OPD uploads a planning document for review.
     */
    public function notifyDocumentSubmitted(PlanningDocument $doc): void
    {
        $orgName = $doc->organization?->short_name ?? $doc->organization?->name ?? 'OPD';
        $docType = strtoupper($doc->type);
        $title   = "Dokumen {$docType} Diajukan";
        $message = "Dokumen {$docType} dari {$orgName} telah diunggah dan menunggu review & validasi Anda.";

        $reviewers = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', [
                'Super Admin', 'Admin Provinsi', 'Evaluator Provinsi',
            ]))
            ->get();

        $this->send($reviewers, 'submission', $title, $message, 'planning_document', $doc->id);
    }

    /**
     * Notify the document's uploader that it has been validated/approved.
     */
    public function notifyDocumentApproved(PlanningDocument $doc, User $reviewer): void
    {
        $docType = strtoupper($doc->type);
        $title   = "Dokumen {$docType} Telah Divalidasi";
        $message = "Dokumen {$docType} '{$doc->title}' telah divalidasi dan disetujui oleh {$reviewer->name}.";

        $uploader = $doc->createdBy;
        if ($uploader) {
            $this->toUser($uploader, 'approval', $title, $message, 'planning_document', $doc->id);
        }

        // Also notify all active users of the uploader's organization
        if ($doc->organization_id) {
            $orgMembers = User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', ['Admin OPD', 'Operator OPD']))
                ->whereHas('organizations', fn ($q) => $q->where('organizations.id', $doc->organization_id))
                ->where('id', '!=', $uploader?->id ?? 0)
                ->get();
            if ($orgMembers->isNotEmpty()) {
                $this->send($orgMembers, 'approval', $title, $message, 'planning_document', $doc->id);
            }
        }
    }

    /**
     * Notify the document's uploader that revision is needed.
     */
    public function notifyDocumentRevision(PlanningDocument $doc, string $notes, User $reviewer): void
    {
        $docType = strtoupper($doc->type);
        $title   = "Revisi Dokumen {$docType} Diperlukan";
        $message = "Dokumen {$docType} '{$doc->title}' memerlukan revisi: {$notes}";

        $uploader = $doc->createdBy;
        if ($uploader) {
            $this->toUser($uploader, 'revision', $title, $message, 'planning_document', $doc->id);
        }

        if ($doc->organization_id) {
            $orgMembers = User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', ['Admin OPD', 'Operator OPD']))
                ->whereHas('organizations', fn ($q) => $q->where('organizations.id', $doc->organization_id))
                ->where('id', '!=', $uploader?->id ?? 0)
                ->get();
            if ($orgMembers->isNotEmpty()) {
                $this->send($orgMembers, 'revision', $title, $message, 'planning_document', $doc->id);
            }
        }
    }

    // ─── Agreement (Perjanjian Kinerja) Notifications ─────────────────────────

    /**
     * Notify Admin Pemprov & Super Admin when an OPD submits a performance agreement for review.
     */
    public function notifyAgreementSubmitted(Agreement $agreement): void
    {
        $orgName = $agreement->organization?->short_name ?? $agreement->organization?->name ?? 'OPD';
        $title   = "Perjanjian Kinerja Diajukan";
        $message = "Perjanjian Kinerja dari {$orgName} telah diajukan dan menunggu review & validasi Anda.";

        $reviewers = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', [
                'Super Admin', 'Admin Provinsi', 'Evaluator Provinsi',
            ]))
            ->get();

        $this->send($reviewers, 'submission', $title, $message, 'agreement', $agreement->id);
    }

    /**
     * Notify the agreement's org members that the agreement has been approved.
     */
    public function notifyAgreementApproved(Agreement $agreement, User $reviewer): void
    {
        $orgName = $agreement->organization?->short_name ?? $agreement->organization?->name ?? 'OPD';
        $title   = "Perjanjian Kinerja Divalidasi";
        $message = "Perjanjian Kinerja {$orgName} telah divalidasi dan disetujui oleh {$reviewer->name}.";

        if ($agreement->organization_id) {
            $orgMembers = User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', ['Admin OPD', 'Operator OPD']))
                ->whereHas('organizations', fn ($q) => $q->where('organizations.id', $agreement->organization_id))
                ->get();
            $this->send($orgMembers, 'approval', $title, $message, 'agreement', $agreement->id);
        }
    }

    /**
     * Notify the agreement's org members that revision is needed.
     */
    public function notifyAgreementRevision(Agreement $agreement, string $notes, User $reviewer): void
    {
        $orgName = $agreement->organization?->short_name ?? $agreement->organization?->name ?? 'OPD';
        $title   = "Revisi Perjanjian Kinerja Diperlukan";
        $message = "Perjanjian Kinerja {$orgName} memerlukan revisi: {$notes}";

        if ($agreement->organization_id) {
            $orgMembers = User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', ['Admin OPD', 'Operator OPD']))
                ->whereHas('organizations', fn ($q) => $q->where('organizations.id', $agreement->organization_id))
                ->get();
            $this->send($orgMembers, 'revision', $title, $message, 'agreement', $agreement->id);
        }
    }

    // ─── Early Warning System (EWS) Notifications ─────────────────────────────

    /**
     * Notify relevant users when an Early Warning System (EWS) alert is triggered.
     */
    public function notifyAlertTriggered(Alert $alert): void
    {
        $title = "[EWS] {$alert->title}";
        $message = $alert->message ?? 'Terdeteksi indikator berpotensi tidak mencapai target atau keterlambatan pelaporan.';

        $recipients = collect();

        // 1. Notify OPD members if alert is scoped to an organization
        if ($alert->organization_id) {
            $orgUsers = User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', ['Admin OPD', 'Operator OPD']))
                ->whereHas('organizations', fn ($q) => $q->where('organizations.id', $alert->organization_id))
                ->get();
            $recipients = $recipients->merge($orgUsers);
        }

        // 2. High or critical alerts also notify provincial reviewers, evaluators & leadership
        if (in_array(strtolower($alert->severity), ['critical', 'high'])) {
            $leaders = User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($q) => $q->whereIn('roles.name', [
                    'Super Admin', 'Admin Provinsi', 'Evaluator Provinsi', 'Pimpinan', 'Inspektorat', 'Bappeda'
                ]))
                ->get();
            $recipients = $recipients->merge($leaders);
        }

        $uniqueRecipients = $recipients->unique('id');

        if ($uniqueRecipients->isNotEmpty()) {
            $this->send($uniqueRecipients, 'alert.created', $title, $message, 'alert', $alert->id);
        }
    }

    /**
     * Check whether a notification channel is enabled (defaults to true).
     */

    public function channelEnabled(string $channel): bool
    {
        $config = AppConfig::value('notification.channels.'.$channel);

        if ($config === null) {
            return true;
        }

        return filter_var($config, FILTER_VALIDATE_BOOLEAN);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /**
     * @param  Collection<int, User>|\Illuminate\Database\Eloquent\Collection<int, User>  $recipients
     */
    private function send(
        iterable $recipients,
        string $event,
        string $title,
        ?string $message,
        ?string $resourceType,
        ?int $resourceId,
    ): void {
        if (! $this->channelEnabled('inapp')) {
            return;
        }

        $recipients = collect($recipients)->filter(
            fn ($u) => $u instanceof User && $u->getKey() !== null
        );

        if ($recipients->isEmpty()) {
            return;
        }

        $now = now();

        $rows = $recipients->map(fn (User $u) => [
            'user_id' => $u->id,
            'event' => $event,
            'channel' => 'in_app',
            'title' => $title,
            'message' => $message,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'delivery_status' => 'sent',
            'created_at' => $now,
            'updated_at' => $now,
        ])->values()->all();

        // Bulk insert for performance when notifying many recipients.
        foreach (array_chunk($rows, 100) as $chunk) {
            AppNotification::insert($chunk);
        }
    }
}
