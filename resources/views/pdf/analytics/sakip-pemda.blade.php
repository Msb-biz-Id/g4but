<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Evaluasi SAKIP Pemda {{ $year }}</title>
<style>* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8.5px; color:#1a1a2e; padding:14px 18px; }
.hdr-table { width:100%; border-collapse:collapse; border:none; border-bottom:2px solid #1e3a5f; margin-bottom:10px; padding-bottom:8px; }
.hdr-table tr, .hdr-table tr td { border:none !important; background:transparent !important; padding:0 !important; }
.hdr-logo-cell { width:60px; text-align:left; vertical-align:middle; }
.hdr-logo-cell img { height:48px; width:48px; display:block; }
.hdr-title-cell { text-align:center; vertical-align:middle; }
.hdr-spacer-cell { width:60px; }
.instansi { font-size:11px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; }
.doc-title { font-size:13px; font-weight:bold; color:#111827; margin:3px 0; } .doc-sub { font-size:8px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:8px; overflow:hidden; } .meta-l { float:left; } .meta-r { float:right; color:#6b7280; }
.score-box { background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:8px 12px; margin-bottom:12px; }
.score-box table { width:100%; border:none; }
.score-box td { border:none; padding:2px 4px; vertical-align:middle; }
table { width:100%; border-collapse:collapse; font-size:8px; margin-bottom:10px; } thead tr { background:#1e3a5f; color:#fff; }
th { padding:5px 4px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
td { padding:4px 4px; border:1px solid #e2e8f0; vertical-align:middle; } tr:nth-child(even) td { background:#f8fafc; }
.tc { text-align:center; } .tr { text-align:right; }
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; } .r { color:#dc2626; font-weight:bold; }
.badge { display:inline-block; padding:2px 6px; border-radius:3px; font-weight:bold; font-size:8px; }
.badge-a { background:#dcfce7; color:#15803d; }
.lhe-box { background:#faf5ff; border:1px solid #e9d5ff; border-radius:4px; padding:8px 10px; margin-top:8px; margin-bottom:10px; font-size:7.5px; }
.lhe-title { font-weight:bold; color:#6b21a8; font-size:8.5px; margin-bottom:4px; }
.footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:5px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }</style></head><body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Provinsi Papua Barat</div>
<div class="doc-title">EVALUASI SAKIP PEMERINTAH DAERAH (KEMENPANRB)</div>
<div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; Sistem e-KASUARI SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>

@php
  $p = $sakip_pemda ?? [];
  $nilai = (float)($p['nilai'] ?? 86.0);
  $predikat = $p['predikat'] ?? 'A';
  $komponen = $p['komponen'] ?? [];
  $trend = $p['trend'] ?? [];
  $lhe = $p['lhe'] ?? [];
  $predikatLabel = match(strtoupper($predikat)) {
    'AA' => 'Sangat Memuaskan',
    'A' => 'Memuaskan',
    'BB' => 'Sangat Baik',
    'B' => 'Baik',
    'CC' => 'Cukup / Memadai',
    'C' => 'Kurang',
    'D' => 'Sangat Kurang',
    default => 'Memuaskan'
  };
@endphp

<div class="meta">
  <div class="meta-l"><strong>Entitas:</strong> {{ $p['organization_name'] ?? 'Pemerintah Provinsi Papua Barat' }} ({{ $p['organization_code'] ?? 'PEMPROV-PB' }})</div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

<div class="score-box">
  <table>
    <tr>
      <td style="width:30%"><strong>Nilai Akuntabilitas Kinerja:</strong> <span class="g" style="font-size:13px">{{ number_format($nilai, 2) }}</span></td>
      <td style="width:25%"><strong>Predikat Mutu:</strong> <span class="badge badge-a" style="font-size:10px">{{ $predikat }} - {{ $predikatLabel }}</span></td>
      <td style="width:45%"><strong>Status Evaluasi:</strong> {{ $p['status_evaluasi'] ?? 'Final (KemenPANRB)' }}</td>
    </tr>
  </table>
</div>

<h4 style="font-size:9px; margin-bottom:4px; color:#1e3a5f;">Rincian 4 Komponen Akuntabilitas Kinerja (PermenPANRB No. 88/2021)</h4>
<table>
  <thead>
    <tr>
      <th style="width:25px">No</th>
      <th style="width:140px">Komponen Akuntabilitas</th>
      <th style="width:50px">Bobot</th>
      <th style="width:60px">Nilai Capaian</th>
      <th style="width:65px">Persentase</th>
      <th style="width:50px">Predikat</th>
      <th>Deskripsi Evaluasi</th>
    </tr>
  </thead>
  <tbody>
    @foreach($komponen as $k)
    <tr>
      <td class="tc">{{ $k['no'] }}</td>
      <td><strong>{{ $k['komponen'] }}</strong></td>
      <td class="tc">{{ number_format((float)$k['bobot'], 1) }}</td>
      <td class="tc"><strong class="g">{{ number_format((float)$k['nilai'], 2) }}</strong></td>
      <td class="tc">{{ number_format((float)$k['persen'], 1) }}%</td>
      <td class="tc"><span class="badge badge-a">{{ $k['predikat'] }}</span></td>
      <td>{{ $k['deskripsi'] }}</td>
    </tr>
    @endforeach
    <tr style="background:#e2e8f0; font-weight:bold;">
      <td colspan="2" class="tc"><strong>TOTAL NILAI SAKIP PEMDA</strong></td>
      <td class="tc">100.0</td>
      <td class="tc"><strong class="g" style="font-size:10px">{{ number_format($nilai, 2) }}</strong></td>
      <td class="tc">{{ number_format($nilai, 1) }}%</td>
      <td class="tc"><span class="badge badge-a">{{ $predikat }}</span></td>
      <td>Hasil Evaluasi Akuntabilitas Kinerja Instansi Pemerintah Tingkat Pemda</td>
    </tr>
  </tbody>
</table>

<div class="lhe-box">
  <div class="lhe-title">Laporan Hasil Evaluasi (LHE) Resmi KemenPANRB</div>
  <table style="margin-bottom:0;">
    <tr>
      <td style="width:100px; border:none; font-weight:bold;">Nomor LHE</td>
      <td style="border:none;">: {{ $lhe['nomor_lhe'] ?? '-' }} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Tanggal:</strong> {{ $lhe['tanggal'] ?? '-' }}</td>
    </tr>
    <tr>
      <td style="border:none; font-weight:bold;">Evaluator</td>
      <td style="border:none;">: {{ $lhe['evaluator'] ?? 'Kementerian PAN-RB' }}</td>
    </tr>
    <tr>
      <td style="border:none; font-weight:bold;">Catatan Evaluasi</td>
      <td style="border:none;">: {{ $lhe['catatan'] ?? '-' }}</td>
    </tr>
    <tr>
      <td style="border:none; font-weight:bold;">Rekomendasi Utama</td>
      <td style="border:none;">: {{ $lhe['rekomendasi'] ?? '-' }}</td>
    </tr>
  </table>
</div>

@if(count($trend) > 0)
<h4 style="font-size:9px; margin-top:8px; margin-bottom:4px; color:#1e3a5f;">Tren Multi-Tahun SAKIP Pemda (Siklus RPJMD 2025–2029)</h4>
<table>
  <thead>
    <tr>
      @foreach($trend as $t)
      <th class="tc">Tahun {{ $t['tahun'] }}</th>
      @endforeach
    </tr>
  </thead>
  <tbody>
    <tr>
      @foreach($trend as $t)
      <td class="tc">
        <strong class="g">{{ number_format((float)$t['nilai'], 2) }}</strong><br>
        <span style="font-size:7px; color:#64748b;">Predikat {{ $t['predikat'] }}</span>
      </td>
      @endforeach
    </tr>
  </tbody>
</table>
@endif

<div style="margin-top:10px; padding:6px 8px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:4px;">
  <div style="font-weight:bold; font-size:7.5px; color:#1e3a5f; margin-bottom:4px; text-transform:uppercase;">
    Keterangan Klasifikasi Predikat &amp; Rentang Nilai SAKIP
  </div>
  <table style="width:100%; border-collapse:collapse; margin-bottom:3px; font-size:6.5px;">
    <thead>
      <tr style="background:#1e3a5f; color:#fff;">
        <th style="padding:2px 4px; border:1px solid #2d5282; width:28%;">Rentang Nilai</th>
        <th style="padding:2px 4px; border:1px solid #2d5282; width:18%;">Predikat</th>
        <th style="padding:2px 4px; border:1px solid #2d5282; width:54%; text-align:left;">Kategori / Keterangan Mutu Akuntabilitas</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai &gt; 90 hingga 100</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#15803d; color:#fff; font-weight:bold;">AA</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Sangat Memuaskan</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai &gt; 80 hingga 90</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#16a34a; color:#fff; font-weight:bold;">A</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Memuaskan</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai &gt; 70 hingga 80</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#0369a1; color:#fff; font-weight:bold;">BB</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Sangat Baik</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai &gt; 60 hingga 70</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#2563eb; color:#fff; font-weight:bold;">B</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Baik</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai &gt; 50 hingga 60</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#d97706; color:#fff; font-weight:bold;">CC</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Cukup / Memadai</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai &gt; 30 hingga 50</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#ea580c; color:#fff; font-weight:bold;">C</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Kurang</td></tr>
      <tr><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center;">Nilai 0 hingga 30 / Minus (&lt; 0)</td><td style="padding:2px 4px; border:1px solid #e2e8f0; text-align:center; background:#dc2626; color:#fff; font-weight:bold;">D</td><td style="padding:2px 4px; border:1px solid #e2e8f0;">Sangat Kurang</td></tr>
    </tbody>
  </table>
  <div style="font-size:6px; color:#64748b; font-style:italic;">
    * Standar Evaluasi Akuntabilitas Kinerja Instansi Pemerintah (PermenPANRB No. 88/2021)
  </div>
</div>

<div class="footer">
  <div class="fl">Sistem e-KASUARI — SAKIP Pemerintah Provinsi Papua Barat</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body></html>
