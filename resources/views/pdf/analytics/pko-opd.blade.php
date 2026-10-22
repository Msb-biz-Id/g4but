<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>PKO Unit Kerja / Bidang {{ $year }}</title>
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
      <div class="instansi">Pemerintah Kabupaten Mimika</div>
<div class="doc-title">CAPAIAN PKO Unit Kerja / Bidang</div>
<div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; SIPERFORMA PUPR</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta"><div class="meta-l"><strong>Total Unit Kerja:</strong> {{ count($rows) }}</div><div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div></div>
@if(count($rows)>0)
<table><thead><tr><th style="width:30px">No</th><th>Unit Kerja / Bidang</th><th style="width:70px">Nilai PKO</th><th style="width:90px">Predikat</th><th style="width:60px">Peringkat</th><th style="width:40px">Tren</th></tr></thead><tbody>
@foreach($rows as $i => $r)
@php $n = (float)($r['nilai_pko']??0); @endphp
<tr><td class="tc">{{ $i+1 }}</td><td>{{ $r['perangkat_daerah']??'-' }}</td>
<td class="tc"><strong class="{{ $n>=80?'g':($n>=60?'w':'r') }}">{{ number_format($n,2) }}</strong></td>
<td class="tc">{{ $r['predikat']??'-' }}</td><td class="tc">{{ $r['peringkat']??'-' }}</td>
<td class="tc">{{ $r['tren']??'→' }}</td></tr>
@endforeach
</tbody></table>
@else<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data PKO unit kerja.</p>@endif
<div style="margin-top:10px; padding:6px 8px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:4px;">
  <div style="font-weight:bold; font-size:7.5px; color:#1e3a5f; margin-bottom:4px; text-transform:uppercase;">
    Keterangan Klasifikasi Predikat Nilai Kinerja Organisasi (NKO / PKO)
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
<div class="footer"><div class="fl">SIPERFORMA PUPR — SAKIP Kabupaten Mimika</div><div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div></div>
</body></html>
