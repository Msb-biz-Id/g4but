<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Monitoring Output {{ $currentYear }}</title>
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
      <div class="instansi">Pemerintah Provinsi Papua Barat</div>
      <div class="doc-title">LAPORAN MONITORING KINERJA FISIK / OUTPUT</div>
      <div class="doc-sub">Pengukuran Kinerja &nbsp;|&nbsp; Tahun {{ $currentYear }} &nbsp;|&nbsp;
        @if($organization) {{ $organization->name }} @else Semua OPD @endif &nbsp;|&nbsp; Sistem e-SAKIP SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta">
  <div class="meta-l"><strong>Total Baris:</strong> {{ count($items) }} &nbsp;|&nbsp;
  <strong>Rata-rata Capaian TW4:</strong> {{ $stats['avg'] }}%</div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>
@if(count($items)>0)
<table>
  <thead>
    <tr>
      <th style="width:18px">No</th>
      <th style="width:65px">Sasaran Strategis</th>
      <th style="width:55px">Indikator Sasaran</th>
      <th style="width:35px">Target Sasaran</th>
      <th style="width:50px">Program</th>
      <th style="width:50px">Kegiatan</th>
      <th style="width:60px">Subkegiatan</th>
      <th style="width:55px">Indikator Subkegiatan</th>
      <th style="width:25px">Satuan</th>
      <th style="width:25px">Pola</th>
      <th style="width:35px">Target Output</th>
      <th style="width:25px">Target TW1</th><th style="width:25px">Realisasi TW1</th>
      <th style="width:25px">Target TW2</th><th style="width:25px">Realisasi TW2</th>
      <th style="width:25px">Target TW3</th><th style="width:25px">Realisasi TW3</th>
      <th style="width:25px">Target TW4</th><th style="width:25px">Realisasi TW4</th>
      <th style="width:35px">Capaian (%)</th>
    </tr>
  </thead>
  <tbody>
    @foreach($items as $i => $item)
    @php
      $t4 = $item->target_tw4 ?? null;
      $r4 = $item->realisasi_tw4 ?? $item->realization_tw4 ?? null;
      $capaian = null;
      if ($t4 !== null && $r4 !== null && $t4 > 0) {
        $capaian = ($item->measurement_pattern ?? '') === 'Negatif'
          ? ($t4 > 0 ? round((2 - $r4/$t4)*100, 1) : null)
          : round($r4/$t4*100, 1);
      }
      $r1 = $item->realisasi_tw1 ?? $item->realization_tw1 ?? null;
      $r2 = $item->realisasi_tw2 ?? $item->realization_tw2 ?? null;
      $r3 = $item->realisasi_tw3 ?? $item->realization_tw3 ?? null;
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
      <td class="tc">{{ $item->measurement_pattern ?? 'Positif' }}</td>
      <td class="tr">{{ $item->target_output_tahunan !== null ? number_format((float)$item->target_output_tahunan,2,',','.') : '—' }}</td>
      <td class="tr">{{ $item->target_tw1 !== null ? number_format((float)$item->target_tw1,2,',','.') : '—' }}</td>
      <td class="tr">{{ $r1 !== null ? number_format((float)$r1,2,',','.') : '—' }}</td>
      <td class="tr">{{ $item->target_tw2 !== null ? number_format((float)$item->target_tw2,2,',','.') : '—' }}</td>
      <td class="tr">{{ $r2 !== null ? number_format((float)$r2,2,',','.') : '—' }}</td>
      <td class="tr">{{ $item->target_tw3 !== null ? number_format((float)$item->target_tw3,2,',','.') : '—' }}</td>
      <td class="tr">{{ $r3 !== null ? number_format((float)$r3,2,',','.') : '—' }}</td>
      <td class="tr">{{ $t4 !== null ? number_format((float)$t4,2,',','.') : '—' }}</td>
      <td class="tr">{{ $r4 !== null ? number_format((float)$r4,2,',','.') : '—' }}</td>
      <td class="tc">@if($capaian!==null)<span class="{{ $capaian>=100?'g':($capaian>=60?'w':'r') }}">{{ number_format($capaian,1,',','.') }}%</span>@else<span class="n">—</span>@endif</td>
    </tr>
    @endforeach
  </tbody>
</table>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data monitoring output.</p>
@endif
<div class="footer">
  <div class="fl">Sistem e-SAKIP — SAKIP Provinsi Papua Barat</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body>
</html>
