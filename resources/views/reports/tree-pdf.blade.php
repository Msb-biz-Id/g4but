<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Pohon Kinerja</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 10px; color: #1a1a2e; }
        .header { background: #1a3a6b; color: white; padding: 16px 20px; margin-bottom: 16px; }
        .header h1 { font-size: 14px; font-weight: bold; }
        .header p  { font-size: 9px; opacity: 0.8; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a3a6b; color: white; padding: 6px 8px; text-align: left; font-size: 9px; }
        td { border-bottom: 1px solid #e5e7eb; padding: 5px 8px; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        .level-0 { font-weight: bold; color: #1a3a6b; }
        .level-1 { padding-left: 16px; }
        .level-2 { padding-left: 32px; color: #555; }
        .level-3 { padding-left: 48px; color: #777; font-size: 9px; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; }
        .badge-active  { background: #d1fae5; color: #065f46; }
        .badge-draft   { background: #fef3c7; color: #92400e; }
        .badge-default { background: #f3f4f6; color: #374151; }
        .footer { margin-top: 16px; padding: 8px 20px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #888; }
    </style>
</head>
<body>
<div class="header">
    <h1>POHON KINERJA — {{ $org ? strtoupper($org->name) : 'Semua Unit Kerja' }}</h1>
    <p>SIPERFORMA PUPR · Dicetak: {{ $generatedAt }}</p>
</div>

<table>
    <thead>
        <tr>
            <th style="width:40%">Nama Sasaran / Tujuan</th>
            <th style="width:15%">Kode</th>
            <th style="width:20%">Organisasi</th>
            <th style="width:10%">Level</th>
            <th style="width:15%">Status</th>
        </tr>
    </thead>
    <tbody>
        @forelse($trees as $tree)
        @php
            $levelMap = [
                'outcome' => 0,
                'csf' => 1,
                'kondisi_antara' => 2,
                'kondisi_operasional' => 3,
            ];
            $numericLevel = is_numeric($tree->level) ? (int)$tree->level : ($levelMap[$tree->level] ?? 0);
            $cls     = "level-{$numericLevel}";
            $status  = $tree->status ?? ($tree->is_active ? 'active' : 'draft');
            $badgeCls = match($status) { 'active', 'approved' => 'badge-active', 'draft' => 'badge-draft', default => 'badge-default' };
            $indent  = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;', $numericLevel);
        @endphp
        <tr>
            <td class="{{ $cls }}">{!! $indent !!}
                @if($numericLevel > 0)↳ @endif
                {{ $tree->name ?? '—' }}
            </td>
            <td style="font-family: monospace; font-size:9px;">{{ $tree->code ?? '—' }}</td>
            <td>{{ $tree->organization?->code ?? '—' }}</td>
            <td style="text-align:center;">{{ strtoupper(str_replace('_', ' ', $tree->level ?? '-')) }}</td>
            <td><span class="badge {{ $badgeCls }}">{{ strtoupper($status) }}</span></td>
        </tr>
        @empty
        <tr>
            <td colspan="5" style="text-align:center; padding:20px; color:#888; font-style:italic;">
                Belum ada data pohon kinerja.
            </td>
        </tr>
        @endforelse
    </tbody>
</table>

<div class="footer">
    Total {{ $trees->count() }} node · SIPERFORMA PUPR
</div>
</body>
</html>
