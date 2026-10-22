<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Monitoring Anggaran {{ $currentYear }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8.5px; color:#1a1a2e; padding:16px 20px; }
.hdr-table { width:100%; border-collapse:collapse; border:none; border-bottom:2px solid #1e3a5f; margin-bottom:10px; padding-bottom:8px; }
.hdr-table tr, .hdr-table tr td { border:none !important; background:transparent !important; padding:0 !important; }
.hdr-logo-cell { width:60px; text-align:left; vertical-align:middle; }
.hdr-logo-cell img { height:48px; width:48px; display:block; }
.hdr-title-cell { text-align:center; vertical-align:middle; }
.hdr-spacer-cell { width:60px; }
.instansi { font-size:11px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; }
.doc-title { font-size:13px; font-weight:bold; color:#111827; margin:3px 0; }
.doc-sub { font-size:8px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:8px; overflow:hidden; }
.meta-l { float:left; } .meta-r { float:right; color:#6b7280; }
table { width:100%; border-collapse:collapse; font-size:7px; }
thead tr { background:#1e3a5f; color:#fff; }
th { padding:4px 3px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
td { padding:3px 3px; border:1px solid #e2e8f0; vertical-align:middle; }
tr:nth-child(even) td { background:#f8fafc; }
.tc { text-align:center; } .tr { text-align:right; }
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; } .n { color:#9ca3af; }
.footer { margin-top:14px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }
</style>
</head>
<body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Kabupaten Mimika</div>
      <div class="doc-title">LAPORAN MONITORING KINERJA ANGGARAN</div>
      <div class="doc-sub">Pengukuran Kinerja &nbsp;|&nbsp; Tahun {{ $currentYear }} &nbsp;|&nbsp;
        @if($organization) {{ $organization->name }} @else Semua Unit Kerja @endif &nbsp;|&nbsp; SIPERFORMA PUPR</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta">
  <div class="meta-l"><strong>Total Baris:</strong> {{ count($items) }} &nbsp;|&nbsp;
  <strong>Rata-rata Serapan:</strong> {{ $stats['avg'] }}%</div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>
@if(count($items)>0)
<table>
  <thead>
    <tr>
      <th style="width:18px">No</th>
      <th style="width:65px">Sasaran Strategis</th>
      <th style="width:55px">Indikator Sasaran</th>
      <th style="width:32px">Target Sasaran</th>
      <th style="width:50px">Program</th>
      <th style="width:50px">Kegiatan</th>
      <th style="width:60px">Subkegiatan</th>
      <th style="width:55px">Indikator Subkegiatan</th>
      <th style="width:25px">Satuan</th>
      <th style="width:42px">Pagu Tahunan (Rp)</th>
      <th style="width:32px">Pagu TW1</th><th style="width:32px">Realisasi TW1</th>
      <th style="width:32px">Pagu TW2</th><th style="width:32px">Realisasi TW2</th>
      <th style="width:32px">Pagu TW3</th><th style="width:32px">Realisasi TW3</th>
      <th style="width:32px">Pagu TW4</th><th style="width:32px">Realisasi TW4</th>
      <th style="width:35px">Serapan (%)</th>
    </tr>
  </thead>
  <tbody>
    @foreach($items as $i => $item)
    @php
      $pagu = $item->pagu_tahunan ?? $item->annual_budget ?? null;
      $p1 = $item->pagu_tw1 ?? $item->budget_tw1 ?? null;
      $r1 = $item->realisasi_tw1 ?? $item->realization_tw1 ?? null;
      $p2 = $item->pagu_tw2 ?? $item->budget_tw2 ?? null;
      $r2 = $item->realisasi_tw2 ?? $item->realization_tw2 ?? null;
      $p3 = $item->pagu_tw3 ?? $item->budget_tw3 ?? null;
      $r3 = $item->realisasi_tw3 ?? $item->realization_tw3 ?? null;
      $p4 = $item->pagu_tw4 ?? $item->budget_tw4 ?? null;
      $r4 = $item->realisasi_tw4 ?? $item->realization_tw4 ?? null;
      $serapan = ($pagu && $pagu > 0 && $r4 !== null) ? round($r4/$pagu*100,1) : null;
    @endphp
    <tr>
      <td class="tc">{{ $i+1 }}</td>
      <td>{{ $item->sasaran_strategis ?? $item->strategic_objective ?? '-' }}</td>
      <td>{{ $item->indikator_sasaran ?? $item->strategic_objective_indicator ?? '-' }}</td>
      <td class="tr">{{ $item->target_sasaran_tahunan !== null ? number_format((float)$item->target_sasaran_tahunan,2,',','.') : '—' }}</td>
      <td>{{ $item->program ?? '-' }}</td>
      <td>{{ $item->kegiatan ?? $item->activity ?? '-' }}</td>
      <td>{{ $item->subkegiatan ?? $item->sub_activity ?? '-' }}</td>
      <td>{{ $item->indikator_subkegiatan ?? $item->sub_activity_indicator ?? '-' }}</td>
      <td class="tc">{{ $item->satuan ?? $item->unit ?? '-' }}</td>
      <td class="tr">{{ $pagu !== null ? number_format((float)$pagu,0,',','.') : '—' }}</td>
      <td class="tr">{{ $p1 !== null ? number_format((float)$p1,0,',','.') : '—' }}</td>
      <td class="tr">{{ $r1 !== null ? number_format((float)$r1,0,',','.') : '—' }}</td>
      <td class="tr">{{ $p2 !== null ? number_format((float)$p2,0,',','.') : '—' }}</td>
      <td class="tr">{{ $r2 !== null ? number_format((float)$r2,0,',','.') : '—' }}</td>
      <td class="tr">{{ $p3 !== null ? number_format((float)$p3,0,',','.') : '—' }}</td>
      <td class="tr">{{ $r3 !== null ? number_format((float)$r3,0,',','.') : '—' }}</td>
      <td class="tr">{{ $p4 !== null ? number_format((float)$p4,0,',','.') : '—' }}</td>
      <td class="tr">{{ $r4 !== null ? number_format((float)$r4,0,',','.') : '—' }}</td>
      <td class="tc">@if($serapan!==null)<span class="{{ $serapan>=90?'g':($serapan>=70?'w':'r') }}">{{ number_format($serapan,1,',','.') }}%</span>@else<span class="n">—</span>@endif</td>
    </tr>
    @endforeach
  </tbody>
</table>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data monitoring anggaran.</p>
@endif
<div class="footer">
  <div class="fl">SIPERFORMA PUPR — SAKIP Kabupaten Mimika</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body>
</html>
