<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>PKO {{ $year }}</title>
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
.meta-l { float:left; } .meta-r { float:right; color:#6b7280; }
.section-label { font-size:10px; font-weight:bold; color:#1e3a5f; border-bottom:1px solid #1e3a5f; padding-bottom:3px; margin:10px 0 6px; text-transform:uppercase; }
table { width:100%; border-collapse:collapse; font-size:8px; margin-bottom:10px; }
thead tr { background:#1e3a5f; color:#fff; }
th { padding:5px 4px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
td { padding:4px 4px; border:1px solid #e2e8f0; vertical-align:middle; }
tr:nth-child(even) td { background:#f8fafc; }
.tc { text-align:center; } .tr { text-align:right; }
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; } .n { color:#9ca3af; }
.footer { margin-top:14px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }
.summary-box { border:1px solid #e5e7eb; padding:8px 12px; margin-bottom:10px; display:table; width:100%; border-radius:4px; }
.sum-cell { display:table-cell; text-align:center; width:25%; }
.sum-val { font-size:16px; font-weight:bold; color:#1e3a5f; }
.sum-lbl { font-size:7.5px; color:#6b7280; }
</style>
</head>
<body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Provinsi Papua Barat</div>
      <div class="doc-title">LAPORAN PENILAIAN KINERJA ORGANISASI (PKO)</div>
      <div class="doc-sub">Evaluasi Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; Tingkat: {{ ucfirst($targetType) }} &nbsp;|&nbsp; Sistem e-KASUARI SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta">
  <div class="meta-l"><strong>Tahun:</strong> {{ $year }} &nbsp;|&nbsp;
  <strong>Tingkat:</strong> {{ $targetType === 'pemda' ? 'Pemerintah Daerah' : 'Perangkat Daerah' }} &nbsp;|&nbsp;
  @if($organization) <strong>OPD:</strong> {{ $organization->name }} @endif</div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>
@if($pkoSummary)
<div class="summary-box">
  <div class="sum-cell"><div class="sum-val">{{ number_format((float)($pkoSummary->nilai_akhir??0),2,',','.') }}</div><div class="sum-lbl">Nilai Akhir PKO</div></div>
  <div class="sum-cell"><div class="sum-val">{{ number_format((float)($pkoSummary->rata_rata_capaian??0),1,',','.') }}%</div><div class="sum-lbl">Rata-rata Capaian</div></div>
  <div class="sum-cell"><div class="sum-val">{{ number_format((float)($pkoSummary->total_koreksi??0),2,',','.') }}</div><div class="sum-lbl">Total Koreksi AKIP</div></div>
  <div class="sum-cell"><div class="sum-val">{{ count($indicators) }}</div><div class="sum-lbl">Jumlah Indikator</div></div>
</div>
@endif
@if(count($indicators)>0)
<table>
  <thead>
    <tr>
      <th style="width:22px">No</th>
      <th style="width:90px">Sasaran</th>
      <th style="width:110px">Indikator</th>
      <th style="width:40px">Satuan</th>
      <th style="width:45px">Target</th>
      <th style="width:45px">Realisasi</th>
      <th style="width:45px">Capaian (%)</th>
      <th style="width:50px">Nilai Normalisasi</th>
      <th style="width:45px">Koreksi AKIP</th>
      <th style="width:50px">Nilai Akhir</th>
    </tr>
  </thead>
  <tbody>
    @foreach($indicators as $i => $ind)
    @php
      $capaian = $ind->capaian_persen ?? null;
    @endphp
    <tr>
      <td class="tc">{{ $i+1 }}</td>
      <td>{{ $ind->sasaran ?? '-' }}</td>
      <td>{{ $ind->indikator ?? '-' }}</td>
      <td class="tc">{{ $ind->satuan ?? '-' }}</td>
      <td class="tr">{{ $ind->target !== null ? number_format((float)$ind->target,2,',','.') : '—' }}</td>
      <td class="tr">{{ $ind->realisasi !== null ? number_format((float)$ind->realisasi,2,',','.') : '—' }}</td>
      <td class="tc">@if($capaian!==null)<span class="{{ $capaian>=100?'g':($capaian>=60?'w':'r') }}">{{ number_format($capaian,1,',','.') }}%</span>@else<span class="n">—</span>@endif</td>
      <td class="tc">{{ $ind->nilai_normalisasi !== null ? number_format((float)$ind->nilai_normalisasi,2,',','.') : '—' }}</td>
      <td class="tc">{{ $ind->koreksi_akip !== null ? number_format((float)$ind->koreksi_akip,2,',','.') : '—' }}</td>
      <td class="tc"><strong>{{ $ind->nilai_akhir !== null ? number_format((float)$ind->nilai_akhir,2,',','.') : '—' }}</strong></td>
    </tr>
    @endforeach
  </tbody>
</table>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data indikator PKO untuk tahun {{ $year }}.</p>
@endif
<div style="margin-top:12px; padding:6px 8px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:4px;">
  <div style="font-weight:bold; font-size:7.5px; color:#1e3a5f; margin-bottom:4px; text-transform:uppercase;">
    Keterangan Klasifikasi Predikat Nilai Kinerja Organisasi (NKO / PKO)
  </div>
  <div style="font-size:6.5px; color:#334155; margin-bottom:3px;">
    <strong>1. Batas Maksimum Normalisasi:</strong> Capaian PK dinormalisasi dengan batas maksimum 110% (<em>N<sub>i</sub> = min(Capaian PK, 110%)</em>).
  </div>
  <div style="font-size:6.5px; color:#334155; margin-bottom:2px;">
    <strong>2. Koreksi Capaian PK Berdasarkan Predikat AKIP:</strong> <em>Nilai Akhir = Normalisasi &times; (1 &minus; Koreksi AKIP)</em>
  </div>
  <table style="width:100%; border-collapse:collapse; margin-bottom:4px; font-size:6px;">
    <thead>
      <tr style="background:#1e3a5f; color:#fff;">
        <th style="padding:2px 4px; border:1px solid #2d5282; width:50%; text-align:center;">Predikat AKIP</th>
        <th style="padding:2px 4px; border:1px solid #2d5282; width:50%; text-align:center;">Koreksi Capaian PK setelah Normalisasi</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">AA</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">0%</td></tr>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">A</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">0%</td></tr>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">BB</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">10%</td></tr>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">B</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">15%</td></tr>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">CC</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">20%</td></tr>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">C</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">30%</td></tr>
      <tr><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center; font-weight:bold;">D</td><td style="padding:1.5px 4px; border:1px solid #e2e8f0; text-align:center;">30%</td></tr>
    </tbody>
  </table>
  <div style="font-size:6.5px; color:#334155; margin-bottom:3px;">
    <strong>3. Tabel Klasifikasi Predikat Nilai Kinerja Organisasi (NKO):</strong>
  </div>
  <table style="width:100%; border-collapse:collapse; margin-bottom:3px; font-size:6.5px;">
    <thead>
      <tr style="background:#1e3a5f; color:#fff;">
        <th style="padding:2px 4px; border:1px solid #2d5282; width:30%;">Rentang Nilai (NKO)</th>
        <th style="padding:2px 4px; border:1px solid #2d5282; width:35%;">Predikat PKO</th>
        <th style="padding:2px 4px; border:1px solid #2d5282; width:35%; text-align:left;">Keterangan Evaluasi</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">X &gt; 100% (hingga 110%)</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#2563eb; color:#fff; font-weight:bold;">ISTIMEWA</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Istimewa (Melampaui target yang diperjanjikan)</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">80% &lt; X &le; 100%</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#16a34a; color:#fff; font-weight:bold;">BAIK</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Baik (Memenuhi target perjanjian kinerja secara optimal)</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">60% &lt; X &le; 80%</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#eab308; color:#020617; font-weight:bold;">BUTUH PERBAIKAN</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Butuh Perbaikan (Perlu evaluasi dan akselerasi perbaikan)</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">20% &lt; X &le; 60%</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#f97316; color:#fff; font-weight:bold;">KURANG</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Kurang (Di bawah target yang diharapkan)</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">0% &le; X &le; 20% / Minus</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#dc2626; color:#fff; font-weight:bold;">SANGAT KURANG</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Sangat Kurang (Realisasi kinerja sangat rendah atau minus)</td></tr>
    </tbody>
  </table>
  <div style="font-size:6px; color:#64748b; font-style:italic;">
    * Rumus: 1. Normalisasi Capaian = min(Capaian PK, 110%) &nbsp;|&nbsp; 2. NKO = Rata-rata Nilai Capaian Seluruh Indikator Kinerja &nbsp;|&nbsp; Standar PermenPANRB No. 22/2024
  </div>
</div>
<div class="footer">
  <div class="fl">Sistem e-KASUARI — SAKIP Provinsi Papua Barat</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body>
</html>
