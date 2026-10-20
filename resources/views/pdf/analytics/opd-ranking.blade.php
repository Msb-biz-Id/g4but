<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Ranking Kinerja Unit Kerja {{ $year }}</title>
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
table { width:100%; border-collapse:collapse; font-size:7px; } thead tr { background:#1e3a5f; color:#fff; }
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
<div class="doc-title">RANKING KINERJA Unit Kerja / Bidang</div>
<div class="doc-sub">Dashboard Analitik Kinerja &nbsp;|&nbsp; Tahun {{ $year }} &nbsp;|&nbsp; SIPERFORMA PUPR</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>
<div class="meta"><div class="meta-l"><strong>Total Unit Kerja:</strong> {{ count($rows) }}</div><div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div></div>
@if(count($rows)>0)
<table><thead><tr><th>Peringkat</th><th>Kode</th><th>Unit Kerja / Bidang</th><th>Jml Indikator</th><th>Rata-rata Capaian</th><th>Tercapai</th><th>Perhatian</th><th>Kritis</th><th>Status</th><th>Predikat</th><th>Tren</th></tr></thead><tbody>
@foreach($rows as $r)
<tr><td class="tc">{{ $r['rank'] ?? '-' }}</td><td class="tc">{{ $r['kode'] ?? '-' }}</td><td>{{ $r['perangkat_daerah'] ?? '-' }}</td>
<td class="tc">{{ $r['jumlah_indikator'] ?? 0 }}</td>
<td class="tc"><span class="{{ ($r['rata_capaian']??0)>=100?'g':(($r['rata_capaian']??0)>=50?'w':'r') }}">{{ $r['rata_capaian'] ?? '-' }}%</span></td>
<td class="tc">{{ $r['tercapai'] ?? 0 }}</td><td class="tc">{{ $r['perhatian'] ?? 0 }}</td><td class="tc">{{ $r['kritis'] ?? 0 }}</td>
<td class="tc">{{ $r['status'] ?? '-' }}</td><td class="tc">{{ $r['predikat'] ?? '-' }}</td><td class="tc">{{ $r['tren'] ?? '→' }}</td></tr>
@endforeach
</tbody></table>
<div style="margin-top:8px;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:6.5px;color:#475569;"><strong>Kriteria Status Kinerja:</strong> <span style="color:#15803d;font-weight:bold;">Tercapai:</span> Capaian &ge; 100% | <span style="color:#d97706;font-weight:bold;">Perlu Perhatian:</span> 50% &le; Capaian &lt; 100% | <span style="color:#dc2626;font-weight:bold;">Kritis:</span> Capaian &lt; 50% atau Nilai Minus | <span style="color:#64748b;font-weight:bold;">Tidak Dinilai:</span> Target = 0 dan Realisasi = 0</div>
@else<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data ranking unit kerja.</p>@endif
<div class="footer"><div class="fl">SIPERFORMA PUPR — SAKIP Kabupaten Mimika</div><div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div></div>
</body></html>
