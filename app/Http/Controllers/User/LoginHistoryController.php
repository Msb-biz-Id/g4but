<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\LoginHistory;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Menampilkan riwayat login dan session aktif per user (FR-IAM-009, FR-IAM-008).
 */
class LoginHistoryController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    /**
     * Riwayat login milik user yang sedang login.
     */
    public function index(Request $request): Response
    {
        $history = LoginHistory::where('user_id', $request->user()->id)
            ->orderByDesc('logged_in_at')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Users/LoginHistory', [
            'history' => $history,
            'filters' => $request->only(['per_page']),
        ]);
    }

    /**
     * Riwayat login user tertentu — hanya Super Admin / Admin.
     */
    public function show(Request $request, User $user): Response
    {
        $this->authorize('view-users');

        $history = LoginHistory::where('user_id', $user->id)
            ->orderByDesc('logged_in_at')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Users/LoginHistory', [
            'history' => $history,
            'targetUser' => $user->only(['id', 'name', 'email']),
            'filters' => $request->only(['per_page']),
        ]);
    }

    /**
     * Revoke semua session aktif user (selain session saat ini).
     * FR-IAM-008: session management.
     */
    public function revokeOtherSessions(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        // Hapus semua session kecuali yang aktif saat ini
        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $this->audit->log('sessions_revoked', 'user', $request->user()->id, null);

        return back()->with('success', 'Semua sesi lain berhasil diakhiri.');
    }

    /**
     * Admin: paksa logout user tertentu (revoke semua sessionnya).
     */
    public function revokeUser(Request $request, User $user): RedirectResponse
    {
        $this->authorize('manage-users');

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->delete();

        $this->audit->log('user_sessions_revoked', 'user', $user->id, null);

        return back()->with('success', "Semua sesi {$user->name} berhasil diakhiri.");
    }
}
