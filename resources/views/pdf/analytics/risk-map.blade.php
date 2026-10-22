<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Peta Risiko Kinerja {{ $year }}</title>
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
.g { color:#15803d; font-weight:bold; } .w { color:#d97706; font-weight:bold; } .r { color:#dc2626; font-weight:bold; } .n { color:#9ca3af; }
.footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:5px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; } .fr { float:right; }</style></head><body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Kabupaten Mimika</div>
<div class="doc-title">PETA RISIKO KINERJA Unit Kerja / Bidang</div>
<div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; SIPERFORMA PUPR</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta"><div class="meta-l"><strong>Total Unit Kerja:</strong> {{ count($rows) }}</div><div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div></div>
@if(count($rows)>0)
<table><thead><tr><th>Peringkat</th><th>Kode</th><th>Unit Kerja / Bidang</th><th>Skor Risiko</th><th>Level Risiko</th><th>Rata-rata Capaian</th><th>Nilai SAKIP</th><th>Kelengkapan Dok.</th><th>Rekomendasi</th></tr></thead><tbody>
@foreach($rows as $r)
@php $s=$r['risk_score']??0; $cls=$s>=70?'r':($s>=40?'w':'g'); @endphp
<tr><td class="tc">{{ $r['rank']??'-' }}</td><td class="tc">{{ $r['kode']??'-' }}</td><td>{{ $r['perangkat_daerah']??'-' }}</td>
<td class="tc"><span class="{{ $cls }}">{{ $s }}</span></td><td class="tc"><span class="{{ $cls }}">{{ $r['risk_level']??'-' }}</span></td>
<td class="tc">{{ $r['rata_capaian']??'-' }}%</td><td class="tc">{{ $r['sakip_nilai']??'-' }}</td><td class="tc">{{ $r['dokumen_persen']??'-' }}%</td>
<td style="font-size:6.5px">{{ implode('; ', (array)($r['rekomendasi']??[])) }}</td></tr>
@endforeach
</tbody></table>
@else<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data peta risiko.</p>@endif
<div class="footer"><div class="fl">SIPERFORMA PUPR — SAKIP Kabupaten Mimika</div><div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div></div>
</body></html>
