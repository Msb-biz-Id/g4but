<?php

namespace App\Http\Controllers\Whatsapp;

use App\Http\Controllers\Controller;
use App\Models\WhatsappHandoff;
use App\Models\WhatsappIdentity;
use App\Models\WhatsappMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $identities = WhatsappIdentity::with('user')
            ->when(! $user->hasPermissionTo('config:manage'), fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->get();

        $messages = WhatsappMessage::latest()->limit(50)->get();

        $handoffs = WhatsappHandoff::with(['user', 'resolver'])->latest()->get();

        $statusLabels = [
            'verified' => 'Terverifikasi',
            'unverified' => 'Belum Verifikasi',
            'active' => 'Aktif',
            'inactive' => 'Nonaktif',
        ];

        $directionLabels = ['inbound' => 'Masuk', 'outbound' => 'Keluar'];
        $messageStatusLabels = ['sent' => 'Terkirim', 'failed' => 'Gagal', 'blocked' => 'Diblokir', 'pending' => 'Menunggu'];
        $handoffStatusLabels = ['pending' => 'Menunggu', 'resolved' => 'Selesai', 'closed' => 'Tutup'];

        return Inertia::render('Whatsapp/Index', [
            'identities' => $identities,
            'messages' => $messages,
            'handoffs' => $handoffs,
            'canManage' => $user->hasPermissionTo('config:manage'),
            'canAudit' => $user->hasPermissionTo('audit:view'),
            'statusLabels' => $statusLabels,
            'directionLabels' => $directionLabels,
            'messageStatusLabels' => $messageStatusLabels,
            'handoffStatusLabels' => $handoffStatusLabels,
        ]);
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'phone_number' => 'required|string|max:20|unique:whatsapp_identities,phone_number',
            'display_number' => 'nullable|string|max:100',
        ]);

        WhatsappIdentity::create([
            ...$data,
            'user_id' => $request->user()->id,
            'is_verified' => false,
            'is_active' => false,
        ]);

        return back()->with('success', 'Nomor WhatsApp berhasil didaftarkan. Hubungi administrator untuk verifikasi.');
    }

    public function verify(WhatsappIdentity $whatsapp): RedirectResponse
    {
        $whatsapp->update(['is_verified' => true]);

        return back()->with('success', 'Nomor berhasil diverifikasi.');
    }

    public function toggle(WhatsappIdentity $whatsapp): RedirectResponse
    {
        $whatsapp->update(['is_active' => ! $whatsapp->is_active]);

        return back()->with('success', 'Status nomor berhasil diubah.');
    }

    public function destroy(WhatsappIdentity $whatsapp): RedirectResponse
    {
        $whatsapp->delete();

        return back()->with('success', 'Nomor WhatsApp berhasil dihapus.');
    }

    public function resolveHandoff(WhatsappHandoff $handoff, Request $request): RedirectResponse
    {
        $handoff->update([
            'status' => 'resolved',
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Handoff berhasil diselesaikan.');
    }
}
