<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Matriks Capaian Sasaran & Indikator RPJMD {{ $year }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:7px; color:#1a1a2e; padding:14px 18px; }
.hdr-center { width:100%; text-align:center; border-bottom:2px solid #1e3a5f; margin-bottom:8px; padding-bottom:6px; }
.hdr-logo-wrap { text-align:center; margin-bottom:4px; }
.hdr-logo-img { height:48px; width:auto; max-width:55px; display:inline-block; margin:0 auto; }
.instansi { font-size:10.5px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; }
.doc-title { font-size:12.5px; font-weight:bold; color:#111827; margin:2px 0; }
.doc-sub { font-size:8px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:7.5px; overflow:hidden; }
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }

table.data-table { width:100%; border-collapse:collapse; font-size:6.5px; margin-bottom:10px; }
table.data-table thead tr { background:#1e3a5f; color:#fff; }
table.data-table th { padding:4px 3px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.data-table td { padding:3px 3px; border:1px solid #e2e8f0; vertical-align:middle; }
table.data-table tr:nth-child(even) td { background:#f8fafc; }

.tc { text-align:center; }
.tr { text-align:right; }
.tl { text-align:left; }

.badge { display:inline-block; padding:1.5px 4px; border-radius:3px; font-size:6px; font-weight:bold; }
.b-green { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
.b-yellow { background:#fef3c7; color:#b45309; border:1px solid #fde68a; }
.b-orange { background:#ffedd5; color:#c2410c; border:1px solid #fed7aa; }
.b-red { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }
.b-gray { background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; }

.cap-badge { display:inline-block; padding:1.5px 4px; border-radius:3px; font-weight:bold; font-size:6.5px; }
.cap-green { color:#15803d; }
.cap-yellow { color:#b45309; }
.cap-orange { color:#c2410c; }
.cap-red { color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; font-weight:bold; }

.footer { margin-top:10px; border-top:1px solid #e5e7eb; padding-top:4px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; }
.fr { float:right; }
</style>
</head>
<body>

<div class="hdr-center">
  @if(!empty($logoBase64))
    <div class="hdr-logo-wrap">
      <img src="{{ $logoBase64 }}" class="hdr-logo-img" alt="Logo Papua Barat">
    </div>
  @endif
  <div class="instansi">PEMERINTAH {{ strtoupper($provinceName ?? 'PROVINSI PAPUA BARAT') }}</div>
  <div class="doc-title">MATRIKS CAPAIAN SASARAN &amp; INDIKATOR RPJMD</div>
  <div class="doc-sub">Monitoring &amp; Evaluasi Kinerja Pembangunan Daerah &nbsp;|&nbsp; Tahun Evaluasi: {{ $year }} &nbsp;|&nbsp; Sistem {{ $appName ?? 'e-KASUARI' }}</div>
</div>

<div class="meta">
  <div class="meta-l">
    <strong>Ringkasan Kinerja:</strong> Total: {{ $matrix['summary']['total_indikator'] ?? count($matrix['rows']) }} Indikator &nbsp;|&nbsp;
    Rata-rata Capaian: <strong>{{ number_format($matrix['summary']['rata_capaian'] ?? 0, 2) }}%</strong> &nbsp;|&nbsp;
    Tercapai: <span style="color:#15803d;font-weight:bold;">{{ $matrix['summary']['tercapai'] ?? 0 }}</span> &nbsp;|&nbsp;
    Perlu Perhatian: <span style="color:#b45309;font-weight:bold;">{{ $matrix['summary']['perlu_perhatian'] ?? 0 }}</span> &nbsp;|&nbsp;
    Kritis: <span style="color:#b91c1c;font-weight:bold;">{{ $matrix['summary']['kritis'] ?? 0 }}</span>
    @if(($matrix['summary']['tidak_dinilai'] ?? 0) > 0)
    &nbsp;|&nbsp; Tidak Dinilai: <span style="color:#64748b;font-weight:bold;">{{ $matrix['summary']['tidak_dinilai'] }}</span>
    @endif
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

<table class="data-table">
  <thead>
    <tr>
      <th style="width:20px">No</th>
      <th style="width:130px">Tujuan</th>
      <th style="width:140px">Sasaran RPJMD</th>
      <th style="width:50px">Kode</th>
      <th>Indikator Kinerja</th>
      <th style="width:40px">Satuan</th>
      <th style="width:50px">Target</th>
      <th style="width:50px">Realisasi</th>
      <th style="width:55px">Capaian</th>
      <th style="width:75px">Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($matrix['rows'] as $r)
    @php
      $cap = $r['capaian'];
      $st = $r['status'];
      $badgeClass = match($st) {
        'Tercapai' => 'b-green',
        'Perlu Perhatian' => 'b-yellow',
        'Tidak Dinilai' => 'b-gray',
        default => 'b-red',
      };
      $capClass = match(true) {
        $cap === null => '',
        $cap < 0 || $cap < 50 => 'cap-red',
        $cap >= 100 => 'cap-green',
        default => 'cap-yellow',
      };
    @endphp
    <tr>
      <td class="tc">{{ $r['no'] }}</td>
      <td>{{ $r['tujuan'] }}</td>
      <td><strong>{{ $r['sasaran'] }}</strong></td>
      <td class="tc font-mono">{{ $r['kode'] }}</td>
      <td>{{ $r['indikator'] }}</td>
      <td class="tc">{{ $r['satuan'] }}</td>
      <td class="tr font-mono">{{ $r['target'] !== null ? number_format($r['target'], 2, ',', '.') : '-' }}</td>
      <td class="tr font-mono font-bold">{{ $r['realisasi'] !== null ? number_format($r['realisasi'], 2, ',', '.') : '-' }}</td>
      <td class="tr font-mono">
        @if($cap !== null)
          <span class="cap-badge {{ $capClass }}">{{ number_format($cap, 2, ',', '.') }}%</span>
        @else
          <span style="color:#94a3b8">-</span>
        @endif
      </td>
      <td class="tc"><span class="badge {{ $badgeClass }}">{{ $r['status'] }}</span></td>
    </tr>
    @endforeach
  </tbody>
</table>
<div style="margin-top:6px;font-size:7px;color:#64748b;"><strong>Kriteria Status Kinerja:</strong> <span class="cap-green" style="font-weight:bold;">Tercapai (&ge; 100%)</span> &nbsp;|&nbsp; <span class="cap-yellow" style="font-weight:bold;">Perlu Perhatian (50% - 99.9%)</span> &nbsp;|&nbsp; <span class="cap-red">Kritis (&lt; 50% / Minus)</span> &nbsp;|&nbsp; <span style="color:#64748b;font-weight:bold;">Tidak Dinilai (Target = 0 &amp; Realisasi = 0)</span></div>

<div class="footer">
  <div class="fl">Sistem Informasi Akuntabilitas Kinerja Terintegrasi (e-KASUARI) &bull; Provinsi Papua Barat</div>
  <div class="fr">Laporan Resmi SAKIP RPJMD &bull; Dicetak: {{ $generatedAt }} WIT</div>
</div>

</body>
</html>
