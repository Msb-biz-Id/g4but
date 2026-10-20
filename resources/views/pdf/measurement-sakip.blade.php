<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Evaluasi SAKIP {{ $year }}</title>
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
table { width:100%; border-collapse:collapse; font-size:8px; }
thead tr { background:#1e3a5f; color:#fff; }
th { padding:5px 4px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
td { padding:4px 4px; border:1px solid #e2e8f0; vertical-align:middle; }
tr:nth-child(even) td { background:#f8fafc; }
.tc { text-align:center; } .tr { text-align:right; }
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; } .n { color:#9ca3af; }
.badge { display:inline-block; padding:2px 6px; border-radius:3px; font-size:8px; font-weight:bold; color:#fff; }
.badge-istimewa { background:#2563eb; } .badge-baik { background:#16a34a; }
.badge-butuh-perbaikan { background:#ca8a04; color:#fff; }
.badge-kurang { background:#ea580c; } .badge-sangat-kurang { background:#dc2626; }
.badge-aa { background:#15803d; } .badge-a { background:#16a34a; }
.badge-bb { background:#0369a1; } .badge-b { background:#2563eb; }
.badge-cc { background:#d97706; } .badge-c { background:#ea580c; }
.badge-d { background:#dc2626; } .badge-def { background:#6b7280; }
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
      <div class="doc-title">LAPORAN EVALUASI SAKIP — REKAP PREDIKAT</div>
      <div class="doc-sub">Evaluasi Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; SIPERFORMA PUPR</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta">
  <div class="meta-l"><strong>Tahun Evaluasi:</strong> {{ $year }} &nbsp;|&nbsp;
  <strong>Total Unit Kerja:</strong> {{ count($rows) }} &nbsp;|&nbsp;
  <strong>Istimewa/Baik:</strong> {{ $stats['sangat_baik'] }} &nbsp;|&nbsp;
  <strong>Butuh Perbaikan:</strong> {{ $stats['baik'] }} &nbsp;|&nbsp;
  <strong>Kurang/Sangat Kurang:</strong> {{ $stats['rendah'] }}</div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>
@if(count($rows)>0)
<table>
  <thead>
    <tr>
      <th style="width:22px">No</th>
      <th style="width:160px">Nama Unit Kerja</th>
      <th style="width:55px">Perencanaan</th>
      <th style="width:55px">Pengukuran</th>
      <th style="width:55px">Pelaporan</th>
      <th style="width:55px">Evaluasi Internal</th>
      <th style="width:55px">Pencapaian Kinerja</th>
      <th style="width:50px">Total Nilai</th>
      <th style="width:55px">Predikat</th>
    </tr>
  </thead>
  <tbody>
    @foreach($rows as $i => $row)
    @php
      $predikat = $row['predikat'] ?? '-';
      $badgeClass = match(strtoupper($predikat)) {
        'AA', 'ISTIMEWA' => 'badge-aa',
        'A', 'BAIK' => 'badge-a',
        'BB', 'BUTUH PERBAIKAN' => 'badge-bb',
        'B' => 'badge-b',
        'CC' => 'badge-cc',
        'C', 'KURANG' => 'badge-c',
        'D', 'SANGAT KURANG' => 'badge-d',
        default => 'badge-def'
      };
    @endphp
    <tr>
      <td class="tc">{{ $i+1 }}</td>
      <td>{{ $row['organization'] ?? '-' }}</td>
      <td class="tc">{{ isset($row['perencanaan']) ? number_format((float)$row['perencanaan'],2,',','.') : '—' }}</td>
      <td class="tc">{{ isset($row['pengukuran']) ? number_format((float)$row['pengukuran'],2,',','.') : '—' }}</td>
      <td class="tc">{{ isset($row['pelaporan']) ? number_format((float)$row['pelaporan'],2,',','.') : '—' }}</td>
      <td class="tc">{{ isset($row['evaluasi_internal']) ? number_format((float)$row['evaluasi_internal'],2,',','.') : '—' }}</td>
      <td class="tc">{{ isset($row['pencapaian_kinerja']) ? number_format((float)$row['pencapaian_kinerja'],2,',','.') : '—' }}</td>
      <td class="tc"><strong>{{ isset($row['total']) ? number_format((float)$row['total'],2,',','.') : '—' }}</strong></td>
      <td class="tc"><span class="badge {{ $badgeClass }}">{{ $predikat }}</span></td>
    </tr>
    @endforeach
  </tbody>
</table>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data evaluasi SAKIP untuk tahun {{ $year }}.</p>
@endif
<div style="margin-top:12px; padding:6px 8px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:4px;">
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
  <div class="fl">SIPERFORMA PUPR — SAKIP Kabupaten Mimika</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body>
</html>
