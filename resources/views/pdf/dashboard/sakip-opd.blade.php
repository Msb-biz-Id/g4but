<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Matriks Dokumen SAKIP Perangkat Daerah {{ $year }}</title>
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
table.data-table th { padding:3.5px 2px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.data-table td { padding:2.5px 2px; border:1px solid #e2e8f0; vertical-align:middle; }
table.data-table tr:nth-child(even) td { background:#f8fafc; }

.tc { text-align:center; }
.tr { text-align:right; }
.g { color:#15803d; font-weight:bold; }
.w { color:#b45309; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; }
.n { color:#9ca3af; }

.badge { display:inline-block; padding:1px 4px; border-radius:3px; font-size:6.5px; font-weight:bold; }
.b-green { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
.b-yellow { background:#fef3c7; color:#b45309; border:1px solid #fde68a; }
.b-red { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }

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
  <div class="doc-title">MATRIKS KELENGKAPAN DOKUMEN SAKIP SELURUH PERANGKAT DAERAH</div>
  <div class="doc-sub">12 Dokumen Baku SAKIP &nbsp;|&nbsp; Tahun Evaluasi: {{ $year }} &nbsp;|&nbsp; Sistem {{ $appName ?? 'e-KASUARI' }}</div>
</div>

<div class="meta">
  <div class="meta-l">
    <strong>Ringkasan:</strong> Total {{ $matrix['total_opd'] ?? count($matrix['rows']) }} OPD &nbsp;|&nbsp;
    OPD Lengkap (100%): <strong>{{ $matrix['opd_lengkap'] ?? 0 }} OPD ({{ $matrix['pct_lengkap'] ?? 0 }}%)</strong> &nbsp;|&nbsp;
    OPD Belum Lengkap: <strong>{{ $matrix['opd_belum_lengkap'] ?? 0 }} OPD</strong>
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

<table class="data-table">
  <thead>
    <tr>
      <th style="width:20px">No</th>
      <th style="width:40px">Kode</th>
      <th style="width:130px">Perangkat Daerah</th>
      @foreach($matrix['columns'] as $colKey => $colLabel)
        <th style="font-size:6px;width:35px">{{ $colLabel }}</th>
      @endforeach
      <th style="width:26px">Ada</th>
      <th style="width:26px">Total</th>
      <th style="width:36px">%</th>
      <th style="width:55px">Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($matrix['rows'] as $r)
    @php
      $pct = (float)($r['percentage'] ?? 0);
      $st = $r['status'] ?? 'Belum Lengkap';
      $badge = match($st) {
        'Lengkap' => 'b-green',
        'Belum Lengkap' => 'b-yellow',
        default => 'b-red',
      };
    @endphp
    <tr>
      <td class="tc">{{ $r['no'] }}</td>
      <td class="tc">{{ $r['organization_code'] }}</td>
      <td><strong>{{ $r['organization_name'] }}</strong></td>
      @foreach(array_keys($matrix['columns']) as $k)
        @php
          $hasDoc = !empty($r['checks'][$k]);
          $hasFile = !empty($r['doc_details'][$k]['has_file']);
        @endphp
        <td class="tc">
          @if($hasDoc)
            <span class="g">&#10003;</span>
          @else
            <span class="n">&mdash;</span>
          @endif
        </td>
      @endforeach
      <td class="tc">{{ $r['available_count'] }}</td>
      <td class="tc">{{ $r['total_required'] }}</td>
      <td class="tc font-bold {{ $pct >= 100 ? 'g' : ($pct >= 80 ? 'w' : 'r') }}">{{ $pct }}%</td>
      <td class="tc"><span class="badge {{ $badge }}">{{ $st }}</span></td>
    </tr>
    @endforeach
  </tbody>
</table>

<div class="footer">
  <div class="fl">Sistem Informasi Akuntabilitas Kinerja Terintegrasi (e-KASUARI) &bull; Provinsi Papua Barat</div>
  <div class="fr">Laporan Resmi SAKIP &bull; Dicetak: {{ $generatedAt }} WIT</div>
</div>

</body>
</html>
