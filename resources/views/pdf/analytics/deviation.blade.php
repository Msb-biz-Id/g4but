<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Analitik Deviasi {{ $year }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8px; color:#1a1a2e; padding:14px 18px; }
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
.footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:5px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }
</style></head><body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Kabupaten Mimika</div>
    <div class="doc-title">ANALISIS DEVIASI TARGET VS REALISASI</div>
    <div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; SIPERFORMA PUPR</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta">
  <div class="meta-l"><strong>Total Data:</strong> {{ count($rows) }} baris</div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>
@if(count($rows)>0)
<table><thead><tr>
  <th style="width:20px">No</th>
  <th style="width:60px">Kode</th>
  <th>Indikator Kinerja</th>
  <th style="width:80px">OPD</th>
  <th style="width:35px">Satuan</th>
  <th style="width:50px">Periode</th>
  <th style="width:40px">Target</th>
  <th style="width:40px">Realisasi</th>
  <th style="width:40px">Deviasi</th>
  <th style="width:45px">Capaian</th>
  <th style="width:55px">Status</th>
</tr></thead><tbody>
@foreach($rows as $i => $r)
<tr>
  <td class="tc">{{ $i+1 }}</td>
  <td class="tc">{{ $r['indicator_code'] ?? '-' }}</td>
  <td>{{ $r['indicator_name'] ?? '-' }}</td>
  <td>{{ $r['organization_code'] ?? '-' }}</td>
  <td class="tc">{{ $r['unit'] ?? '-' }}</td>
  <td class="tc">{{ $r['period'] ?? '-' }}</td>
  <td class="tr">{{ $r['target'] ?? '-' }}</td>
  <td class="tr">{{ $r['value'] ?? '-' }}</td>
  <td class="tr">{{ $r['deviation'] ?? '-' }}</td>
  <td class="tc">@if($r['achievement']!==null)<span class="{{ $r['achievement']>=100?'g':($r['achievement']>=60?'w':'r') }}">{{ $r['achievement'] }}%</span>@else<span class="n">-</span>@endif</td>
  <td class="tc"><span class="{{ str_contains(strtolower($r['status']??''),'tercapai')?'g':(str_contains(strtolower($r['status']??''),'perhatian')?'w':'r') }}">{{ $r['status'] ?? '-' }}</span></td>
</tr>
@endforeach
</tbody></table>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data deviasi.</p>
@endif
<div class="footer">
  <div class="fl">SIPERFORMA PUPR — SAKIP Kabupaten Mimika</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body></html>
