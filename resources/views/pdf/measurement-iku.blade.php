<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Capaian IKU PEMDA {{ $currentYear }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:9px; color:#1a1a2e; padding:16px 20px; }
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
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }
table { width:100%; border-collapse:collapse; font-size:7.5px; }
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
      <div class="doc-title">LAPORAN CAPAIAN IKU PEMDA</div>
      <div class="doc-sub">Pengukuran Kinerja &nbsp;|&nbsp; Tahun {{ $currentYear }} &nbsp;|&nbsp; Sistem e-KASUARI SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta">
  <div class="meta-l"><strong>Total IKU PEMDA:</strong> {{ $stats['total'] }} &nbsp;|&nbsp;
  <strong>Rata-rata:</strong> {{ $stats['avg'] }}% &nbsp;|&nbsp;
  <strong>Tercapai:</strong> {{ $stats['tercapai'] }} &nbsp;|&nbsp;
  <strong>Perlu Perhatian:</strong> {{ $stats['perhatian'] }} &nbsp;|&nbsp;
  <strong>Kritis:</strong> {{ $stats['kritis'] }}
  @if(($stats['tidak_dinilai'] ?? 0) > 0)
  &nbsp;|&nbsp; <strong>Tidak Dinilai:</strong> {{ $stats['tidak_dinilai'] }}
  @endif
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>
@if(count($items)>0)
<table>
  <thead>
    <tr>
      <th style="width:20px">No</th>
      <th style="width:160px">Indikator IKU PEMDA</th>
      <th style="width:35px">Satuan</th>
      <th style="width:40px">Pola</th>
      @foreach($years as $yr)
      <th style="width:32px">Target {{ $yr }}</th>
      <th style="width:32px">Realisasi {{ $yr }}</th>
      <th style="width:35px">Capaian {{ $yr }}</th>
      @endforeach
      <th style="width:55px">Status {{ $currentYear }}</th>
    </tr>
  </thead>
  <tbody>
    @foreach($items as $i => $item)
    <tr>
      <td class="tc">{{ $i+1 }}</td>
      <td>{{ $item->indicator_name ?? '-' }}</td>
      <td class="tc">{{ $item->unit ?? '-' }}</td>
      <td class="tc">{{ $item->measurement_pattern ?? 'Positif' }}</td>
      @foreach($years as $yr)
        @php $c=$item->calculations[$yr]??null; $t=$c['target']??null; $r=$c['realization']??null; $a=$c['achievement']??null; @endphp
        <td class="tr">{{ $t!==null?number_format((float)$t,2,',','.'):'—' }}</td>
        <td class="tr">{{ $r!==null?number_format((float)$r,2,',','.'):'—' }}</td>
        <td class="tc">@if($a!==null)<span class="{{ $a>=100?'g':($a>=50?'w':'r') }}">{{ number_format($a,1,',','.') }}%</span>@else<span class="n">—</span>@endif</td>
      @endforeach
      <td class="tc">@php $s=($item->calculations[$currentYear]??null)['status']??null; @endphp<span class="{{ $s==='Tercapai'?'g':($s==='Perlu Perhatian'?'w':($s==='Kritis'?'r':'n')) }}">{{ $s??'—' }}</span></td>
    </tr>
    @endforeach
  </tbody>
</table>
<div style="margin-top:6px;font-size:7px;color:#64748b;">Kriteria Status: <span class="g">Tercapai (&ge; 100%)</span> &nbsp;|&nbsp; <span class="w">Perlu Perhatian (50% - 99.9%)</span> &nbsp;|&nbsp; <span class="r">Kritis (&lt; 50%)</span> &nbsp;|&nbsp; <span class="n">Tidak Dinilai (Target=0 &amp; Real=0)</span></div>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data realisasi IKU Pemda.</p>
@endif
<div class="footer">
  <div class="fl">Sistem e-KASUARI — SAKIP Provinsi Papua Barat</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body>
</html>
