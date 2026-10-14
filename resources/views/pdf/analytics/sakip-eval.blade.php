<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Nilai SAKIP OPD {{ $year }}</title>
<style>* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8px; color:#1a1a2e; padding:14px 18px; }
.hdr-table { width:100%; border-collapse:collapse; border:none; border-bottom:2px solid #1e3a5f; margin-bottom:10px; padding-bottom:8px; }
.hdr-table tr, .hdr-table tr td { border:none !important; background:transparent !important; padding:0 !important; }
.hdr-logo-cell { width:60px; text-align:left; vertical-align:middle; }
.hdr-logo-cell img { height:48px; width:48px; display:block; }
.hdr-title-cell { text-align:center; vertical-align:middle; }
.hdr-spacer-cell { width:60px; }
.instansi { font-size:11px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; }
.doc-title { font-size:13px; font-weight:bold; color:#111827; margin:3px 0; } .doc-sub { font-size:8px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:8px; overflow:hidden; } .meta-l { float:left; } .meta-r { float:right; color:#6b7280; }
table { width:100%; border-collapse:collapse; font-size:7.5px; } thead tr { background:#1e3a5f; color:#fff; }
th { padding:4px 3px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
td { padding:3px 3px; border:1px solid #e2e8f0; vertical-align:middle; } tr:nth-child(even) td { background:#f8fafc; }
.tc { text-align:center; } .tr { text-align:right; }
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; } .r { color:#dc2626; font-weight:bold; }
.footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:5px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }</style></head><body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Provinsi Papua Barat</div>
<div class="doc-title">NILAI SAKIP OPD — 4 KOMPONEN AKUNTABILITAS</div>
<div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; Sistem e-SAKIP SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta"><div class="meta-l"><strong>Total OPD:</strong> {{ count($rows) }}</div><div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div></div>
@if(count($rows)>0)
<table><thead><tr><th>No</th><th>Kode</th><th>Perangkat Daerah</th><th>Perencanaan (30)</th><th>Pengukuran (30)</th><th>Pelaporan (15)</th><th>Evaluasi Internal (25)</th><th>Nilai SAKIP</th><th>Predikat</th><th>Tren</th><th>Status LHE</th></tr></thead><tbody>
@foreach($rows as $r)
@php $n = $r['nilai'] ?? 0; @endphp
<tr><td class="tc">{{ $r['no']??'-' }}</td><td class="tc">{{ $r['kode']??'-' }}</td><td>{{ $r['perangkat_daerah']??'-' }}</td>
<td class="tc">{{ $r['perencanaan']??'-' }}</td><td class="tc">{{ $r['pengukuran']??'-' }}</td>
<td class="tc">{{ $r['pelaporan']??'-' }}</td><td class="tc">{{ $r['evaluasi_internal']??'-' }}</td>
<td class="tc"><strong class="{{ $n>=80?'g':($n>=60?'w':'r') }}">{{ $n }}</strong></td>
<td class="tc">{{ $r['predikat']??'-' }}</td><td class="tc">{{ $r['tren']??'→' }}</td>
<td class="tc">{{ $r['lhe']['status_dokumen']??'LHE Tersedia' }}</td></tr>
@endforeach
</tbody></table>
@else<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data evaluasi SAKIP.</p>@endif
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
<div class="footer"><div class="fl">Sistem e-SAKIP — SAKIP Provinsi Papua Barat</div><div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div></div>
</body></html>
