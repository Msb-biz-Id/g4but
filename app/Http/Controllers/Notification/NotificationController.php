<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\User;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly AuthorizationService $authorization,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-notifications');
        $currentUser = $request->user();

        $notifications = AppNotification::query()
            ->where('user_id', $currentUser->id)
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        $canSend = $currentUser->hasPermission('notification:send');

        $users = [];
        if ($canSend) {
            $isProvincialAdmin = $this->authorization->isProvincialAdmin($currentUser);
            $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);

            $usersQuery = User::query()
                ->where('is_active', true);

            if (! $isProvincialAdmin) {
                $usersQuery->whereHas('organizations', fn ($q) => $q->whereIn('organizations.id', $accessibleOrgIds));
            }

            $users = $usersQuery->orderBy('name')->get(['id', 'name', 'email']);
        }

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'filters' => $request->only(['per_page']),
            'users' => $users,
            'unread_count' => AppNotification::query()
                ->where('user_id', $currentUser->id)
                ->whereNull('read_at')
                ->count(),
        ]);
    }

    public function markRead(AppNotification $notification): RedirectResponse
    {
        $this->authorize('view-notifications');

        if ($notification->user_id !== request()->user()->id) {
            abort(403);
        }

        $notification->update(['read_at' => now()]);

        if ($redirect = request('redirect')) {
            return redirect($redirect);
        }

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $this->authorize('view-notifications');

        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }

    public function send(Request $request): RedirectResponse
    {
        $this->authorize('send-notifications');
        $currentUser = $request->user();

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string'],
            'event' => ['required', 'string', 'in:assignment,submission,revision,approval,rejection,deadline,announcement'],
        ]);

        if (! $this->authorization->isProvincialAdmin($currentUser)) {
            $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);
            $recipient = User::findOrFail($validated['user_id']);
            $isRecipientInScope = $recipient->organizations()->whereIn('organizations.id', $accessibleOrgIds)->exists()
                || ($recipient->defaultOrganization() && in_array($recipient->defaultOrganization()->id, $accessibleOrgIds, true));

            if (! $isRecipientInScope) {
                abort(403, 'Anda tidak memiliki hak akses untuk mengirim notifikasi ke pengguna di luar lingkup organisasi Anda.');
            }
        }

        AppNotification::create([
            'user_id' => $validated['user_id'],
            'event' => $validated['event'],
            'channel' => 'in_app',
            'title' => $validated['title'],
            'message' => $validated['message'] ?? null,
            'delivery_status' => 'sent',
        ]);

        $this->audit->log('send', 'notification', null, null);

        return back()->with('success', 'Notifikasi terkirim.');
    }
}
