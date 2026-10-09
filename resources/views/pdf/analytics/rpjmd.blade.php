<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Capaian RPJMD {{ $year }}</title>
<style>* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:7.5px; color:#1a1a2e; padding:14px 18px; }
.hdr-table { width:100%; border-collapse:collapse; border:none; border-bottom:2px solid #1e3a5f; margin-bottom:10px; padding-bottom:8px; }
.hdr-table tr, .hdr-table tr td { border:none !important; background:transparent !important; padding:0 !important; }
.hdr-logo-cell { width:60px; text-align:left; vertical-align:middle; }
.hdr-logo-cell img { height:48px; width:48px; display:block; }
.hdr-title-cell { text-align:center; vertical-align:middle; }
.hdr-spacer-cell { width:60px; }
.instansi { font-size:11px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; }
.doc-title { font-size:13px; font-weight:bold; color:#111827; margin:3px 0; } .doc-sub { font-size:8px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:8px; overflow:hidden; } .meta-l { float:left; } .meta-r { float:right; color:#6b7280; }
table { width:100%; border-collapse:collapse; font-size:6.5px; } thead tr { background:#1e3a5f; color:#fff; }
th { padding:3px 2px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
td { padding:2px 2px; border:1px solid #e2e8f0; vertical-align:middle; } tr:nth-child(even) td { background:#f8fafc; }
.tc { text-align:center; } .tr { text-align:right; }
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; } .r { color:#dc2626; font-weight:bold; } .n { color:#9ca3af; }
.footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:5px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }</style></head><body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Provinsi Papua Barat</div>
<div class="doc-title">ANALISIS CAPAIAN RPJMD</div>
<div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; Sistem e-KASUARI SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta"><div class="meta-l"><strong>Total Indikator:</strong> {{ count($rows) }}
@if(isset($summary))
&nbsp;|&nbsp; <strong>Rata-rata:</strong> {{ number_format($summary['rata_capaian'] ?? 0, 2) }}%
&nbsp;|&nbsp; <span class="g">Tercapai: {{ $summary['tercapai'] ?? 0 }}</span>
&nbsp;|&nbsp; <span class="w">Perlu Perhatian: {{ $summary['perlu_perhatian'] ?? 0 }}</span>
&nbsp;|&nbsp; <span class="r">Kritis: {{ $summary['kritis'] ?? 0 }}</span>
@if(($summary['tidak_dinilai'] ?? 0) > 0)
&nbsp;|&nbsp; <span class="n">Tidak Dinilai: {{ $summary['tidak_dinilai'] }}</span>
@endif
@endif
</div><div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div></div>
@if(count($rows)>0)
<table><thead><tr><th>No</th><th>Tujuan</th><th>Sasaran RPJMD</th><th>Indikator</th><th>Satuan</th>
<th>Target {{ $year }}</th><th>Realisasi {{ $year }}</th><th>Capaian {{ $year }}</th><th>Status</th></tr></thead><tbody>
@foreach($rows as $r)
@php $c=$r['capaian']??null; @endphp
<tr><td class="tc" style="font-weight:bold; font-family:monospace;">{{ $r['no']??'-' }}</td><td>{{ $r['tujuan']??'-' }}</td><td>{{ $r['sasaran']??'-' }}</td>
<td>{{ $r['indikator']??'-' }}</td><td class="tc">{{ $r['satuan']??'-' }}</td>
<td class="tr">{{ $r['target']??'-' }}</td><td class="tr">{{ $r['realisasi']??'-' }}</td>
<td class="tc">@if($c!==null)<span class="{{ $c>=100?'g':($c>=50?'w':'r') }}">{{ $c }}%</span>@else<span class="n">-</span>@endif</td>
<td class="tc">{{ $r['status']??'-' }}</td></tr>
@endforeach
</tbody></table>
<div style="margin-top:6px;font-size:7px;color:#64748b;"><strong>Kriteria Status Kinerja:</strong> <span class="g">Tercapai (&ge; 100%)</span> &nbsp;|&nbsp; <span class="w">Perlu Perhatian (50% - 99.9%)</span> &nbsp;|&nbsp; <span class="r">Kritis (&lt; 50% / Minus)</span> &nbsp;|&nbsp; <span class="n">Tidak Dinilai (Target = 0 &amp; Realisasi = 0)</span></div>
@else<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data RPJMD.</p>@endif
<div class="footer"><div class="fl">Sistem e-KASUARI — SAKIP Provinsi Papua Barat</div><div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div></div>
</body></html>
