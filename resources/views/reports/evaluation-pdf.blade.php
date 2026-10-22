<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Evaluasi SAKIP</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
        .header { background: #1a3a6b; color: white; padding: 20px 24px; margin-bottom: 20px; }
        .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .header p { font-size: 11px; opacity: 0.85; }
        .badge-grade { display: inline-block; background: #f0a500; color: #fff; font-size: 28px; font-weight: bold; padding: 8px 20px; border-radius: 6px; }
        .section { margin: 0 24px 16px; }
        .section-title { font-size: 12px; font-weight: bold; border-bottom: 2px solid #1a3a6b; padding-bottom: 4px; margin-bottom: 10px; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-grid { display: table; width: 100%; border-collapse: collapse; }
        .meta-row { display: table-row; }
        .meta-label { display: table-cell; width: 35%; font-weight: bold; padding: 3px 6px 3px 0; color: #555; }
        .meta-value { display: table-cell; padding: 3px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #1a3a6b; color: white; padding: 6px 8px; text-align: left; }
        td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .score-bar-outer { background: #e5e7eb; height: 8px; border-radius: 4px; }
        .score-bar-inner { height: 8px; border-radius: 4px; }
        .summary-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 18px; margin-bottom: 14px; display: table; width: 100%; }
        .summary-col { display: table-cell; text-align: center; width: 25%; }
        .summary-col .val { font-size: 22px; font-weight: bold; color: #1a3a6b; }
        .summary-col .lbl { font-size: 9px; color: #888; margin-top: 2px; }
        .rec-item { border-left: 3px solid #e5e7eb; padding: 6px 10px; margin-bottom: 8px; }
        .rec-item.high { border-color: #ef4444; }
        .rec-item.medium { border-color: #f59e0b; }
        .rec-item.low { border-color: #10b981; }
        .tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
        .tag-open { background: #fee2e2; color: #b91c1c; }
        .tag-done { background: #d1fae5; color: #065f46; }
        .footer { margin-top: 20px; padding: 12px 24px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #888; display: table; width: 100%; }
        .footer-left { display: table-cell; }
        .footer-right { display: table-cell; text-align: right; }
    </style>
</head>
<body>

{{-- HEADER --}}
<div class="header">
    <h1>LAPORAN EVALUASI SAKIP — {{ strtoupper($evaluation->title) }}</h1>
    <p>
        Organisasi: {{ $evaluation->organization->name ?? '—' }} &nbsp;|&nbsp;
        Periode: {{ $evaluation->planningPeriod->name ?? '—' }} &nbsp;|&nbsp;
        Jenis: {{ ucfirst($evaluation->type) }}
    </p>
</div>

{{-- SUMMARY BOX --}}
<div class="section">
    <div class="summary-box">
        <div class="summary-col">
            <div class="val">{{ $percentage }}%</div>
            <div class="lbl">Nilai Akhir</div>
        </div>
        <div class="summary-col">
            <div class="val">{{ $grade }}</div>
            <div class="lbl">Predikat</div>
        </div>
        <div class="summary-col">
            <div class="val">{{ $evaluation->scores->count() }}</div>
            <div class="lbl">Komponen</div>
        </div>
        <div class="summary-col">
            <div class="val">{{ $evaluation->recommendations->count() }}</div>
            <div class="lbl">Rekomendasi</div>
        </div>
    </div>
</div>

{{-- SKOR KOMPONEN --}}
<div class="section">
    <div class="section-title">Skor Komponen Evaluasi</div>
    @if($evaluation->scores->count())
    <table>
        <thead>
            <tr>
                <th>Komponen</th>
                <th>Kriteria</th>
                <th style="width:60px; text-align:right;">Skor</th>
                <th style="width:60px; text-align:right;">Maks</th>
                <th style="width:60px; text-align:right;">%</th>
            </tr>
        </thead>
        <tbody>
            @foreach($evaluation->scores as $score)
            @php $pct = $score->max_score > 0 ? round(($score->score / $score->max_score) * 100, 1) : 0; @endphp
            <tr>
                <td>{{ $score->component }}</td>
                <td>{{ $score->criterion ?? '—' }}</td>
                <td style="text-align:right;">{{ $score->score }}</td>
                <td style="text-align:right;">{{ $score->max_score }}</td>
                <td style="text-align:right; font-weight:bold; color:{{ $pct >= 70 ? '#16a34a' : ($pct >= 50 ? '#d97706' : '#dc2626') }}">{{ $pct }}%</td>
            </tr>
            @if($score->evaluator_comment)
            <tr>
                <td colspan="5" style="color:#666; font-style:italic; padding-left:16px;">↳ {{ $score->evaluator_comment }}</td>
            </tr>
            @endif
            @endforeach
        </tbody>
    </table>
    @else
    <p style="color:#888; font-style:italic;">Belum ada skor komponen.</p>
    @endif
</div>

{{-- REKOMENDASI --}}
<div class="section">
    <div class="section-title">Rekomendasi Perbaikan</div>
    @forelse($evaluation->recommendations as $rec)
    <div class="rec-item {{ $rec->priority }}">
        <strong>{{ $rec->title }}</strong>
        <span class="tag {{ in_array($rec->status, ['verified','closed']) ? 'tag-done' : 'tag-open' }}">{{ strtoupper($rec->status) }}</span>
        @if($rec->description)
        <p style="margin-top:3px; color:#444;">{{ $rec->description }}</p>
        @endif
        @if($rec->due_date)
        <p style="color:#888; margin-top:2px;">Tenggat: {{ \Carbon\Carbon::parse($rec->due_date)->format('d-m-Y') }}</p>
        @endif
        @foreach($rec->followups ?? [] as $fu)
        <p style="margin-top:3px; margin-left:10px; color:#555;">— {{ $fu->description }} <span style="color:#aaa">({{ $fu->status }})</span></p>
        @endforeach
    </div>
    @empty
    <p style="color:#888; font-style:italic;">Tidak ada rekomendasi.</p>
    @endforelse
</div>

{{-- FOOTER --}}
<div class="footer">
    <div class="footer-left">SIPERFORMA PUPR</div>
    <div class="footer-right">Dicetak: {{ $generatedAt }}</div>
</div>

</body>
</html>
