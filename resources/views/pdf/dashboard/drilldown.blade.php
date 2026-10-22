<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Detail Kinerja {{ $organization->name }} - {{ $periodName }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:7.5px; color:#1a1a2e; padding:14px 18px; }
.hdr-center { width:100%; text-align:center; border-bottom:2px solid #1e3a5f; margin-bottom:8px; padding-bottom:6px; }
.hdr-logo-wrap { text-align:center; margin-bottom:4px; }
.hdr-logo-img { height:48px; width:auto; max-width:55px; display:inline-block; margin:0 auto; }
.instansi { font-size:10.5px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; }
.doc-title { font-size:12.5px; font-weight:bold; color:#111827; margin:2px 0; }
.doc-sub { font-size:8px; color:#4b5563; }
.meta { width:100%; margin-bottom:8px; font-size:7.5px; overflow:hidden; }
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }

/* KPI Summary Cards */
.kpi-table { width:100%; border-collapse:collapse; margin-bottom:10px; }
.kpi-table td { border:1px solid #cbd5e1; padding:6px 8px; vertical-align:middle; background:#f8fafc; text-align:center; }
.kpi-label { font-size:7px; font-weight:bold; color:#64748b; text-transform:uppercase; margin-bottom:2px; }
.kpi-value { font-size:13px; font-weight:bold; color:#0f172a; }

/* Table */
table.data-table { width:100%; border-collapse:collapse; font-size:7px; margin-bottom:8px; }
table.data-table thead tr { background:#1e3a5f; color:#fff; }
table.data-table th { padding:4px 3px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.data-table td { padding:3.5px 3px; border:1px solid #e2e8f0; vertical-align:middle; }
table.data-table tr:nth-child(even) td { background:#f8fafc; }

.tc { text-align:center; }
.tr { text-align:right; }
.tl { text-align:left; }

/* Badges */
.badge { display:inline-block; padding:1.5px 5px; border-radius:3px; font-size:6.5px; font-weight:bold; }
.b-green { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
.b-yellow { background:#fef3c7; color:#b45309; border:1px solid #fde68a; }
.b-red { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }
.b-gray { background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; }

.g { color:#15803d; font-weight:bold; }
.w { color:#b45309; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; }
.n { color:#9ca3af; }

.legend-box { background:#f8fafc; border:1px solid #e2e8f0; padding:5px 8px; font-size:6.5px; color:#475569; margin-top:6px; }
.legend-item { display:inline-block; margin-right:12px; }
.legend-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:3px; vertical-align:middle; }

.footer { margin-top:10px; border-top:1px solid #e5e7eb; padding-top:4px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; }
.fr { float:right; }
</style>
</head>
<body>

<div class="hdr-center">
  @if(!empty($logoBase64))
    <div class="hdr-logo-wrap">
      <img src="{{ $logoBase64 }}" class="hdr-logo-img" alt="Logo PUPR Mimika">
    </div>
  @endif
  <div class="instansi">{{ strtoupper($provinceName ?? \App\Services\PdfService::getProvinceName()) }}</div>
  <div class="doc-title">LAPORAN DETAIL PENCAPAIAN KINERJA Unit Kerja / Bidang</div>
  <div class="doc-sub">
    <strong>{{ $organization->name }}</strong> ({{ $organization->code }}) &nbsp;|&nbsp;
    Periode: <strong>{{ $periodName }}</strong> &nbsp;|&nbsp;
    Sistem {{ $appName ?? 'SIPERFORMA PUPR' }} SAKIP
  </div>
</div>

<div class="meta">
  <div class="meta-l">
    <strong>Unit Kerja / Bidang:</strong> {{ $organization->name }} &nbsp;|&nbsp;
    <strong>Periode:</strong> {{ $periodName }}
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

<!-- 5 Summary KPI Cards -->
<table class="kpi-table">
  <tr>
    <td style="width:20%">
      <div class="kpi-label">Total Indikator</div>
      <div class="kpi-value">{{ $summary['total'] }}</div>
    </td>
    <td style="width:20%">
      <div class="kpi-label">🟢 Tercapai</div>
      <div class="kpi-value g">{{ $summary['green'] }}</div>
    </td>
    <td style="width:20%">
      <div class="kpi-label">🟡 Perlu Perhatian</div>
      <div class="kpi-value w">{{ $summary['yellow'] }}</div>
    </td>
    <td style="width:20%">
      <div class="kpi-label">🔴 Kritis</div>
      <div class="kpi-value r">{{ $summary['red'] }}</div>
    </td>
    <td style="width:20%">
      <div class="kpi-label">Rata-rata Capaian</div>
      <div class="kpi-value">
        @if($summary['avg_pct'] !== null)
          <span class="{{ $summary['avg_pct'] >= 100 ? 'g' : ($summary['avg_pct'] >= 50 ? 'w' : 'r') }}">
            {{ number_format($summary['avg_pct'], 1) }}%
          </span>
        @else
          <span class="n">—</span>
        @endif
      </div>
    </td>
  </tr>
</table>

<!-- Tabel Detail Indikator -->
<table class="data-table">
  <thead>
    <tr>
      <th style="width:24px">No</th>
      <th style="width:75px">Kode Indikator</th>
      <th>Nama Indikator</th>
      <th style="width:65px">Target (Benchmark)</th>
      <th style="width:65px">Realisasi</th>
      <th style="width:60px">Capaian (%)</th>
      <th style="width:75px">Status Kinerja</th>
      <th style="width:50px">Evidence</th>
      <th style="width:60px">Verifikasi</th>
    </tr>
  </thead>
  <tbody>
    @forelse($details as $idx => $d)
    @php
      $badgeClass = match($d['traffic_light']) {
        'green'  => 'b-green',
        'yellow' => 'b-yellow',
        'red'    => 'b-red',
        default  => 'b-gray',
      };
      $badgeText = match($d['traffic_light']) {
        'green'  => 'Tercapai',
        'yellow' => 'Perlu Perhatian',
        'red'    => 'Kritis',
        default  => 'Tidak Dinilai',
      };
    @endphp
    <tr>
      <td class="tc">{{ $idx + 1 }}</td>
      <td class="tc" style="font-family:monospace;font-size:6.5px;">{{ $d['indicator_code'] }}</td>
      <td><strong>{{ $d['indicator_name'] }}</strong></td>
      <td class="tr">{{ $d['target_value'] !== null ? $d['target_value'] . ' ' . $d['unit'] : '—' }}</td>
      <td class="tr">{{ $d['actual_value'] !== null ? $d['actual_value'] . ' ' . $d['unit'] : '—' }}</td>
      <td class="tr font-bold">
        @if($d['achievement_pct'] !== null)
          <span class="{{ $d['achievement_pct'] >= 100 ? 'g' : ($d['achievement_pct'] >= 50 ? 'w' : 'r') }}">
            {{ number_format($d['achievement_pct'], 1) }}%
          </span>
        @else
          <span class="n">—</span>
        @endif
      </td>
      <td class="tc">
        <span class="badge {{ $badgeClass }}">{{ $badgeText }}</span>
      </td>
      <td class="tc">
        @if(($d['evidence_count'] ?? 0) > 0)
          <span class="badge b-gray">{{ $d['evidence_count'] }} Berkas</span>
        @else
          <span class="n">—</span>
        @endif
      </td>
      <td class="tc" style="text-transform:capitalize;">
        <span class="badge {{ ($d['status'] ?? '') === 'approved' ? 'b-green' : 'b-yellow' }}">
          {{ $d['status'] ?? '—' }}
        </span>
      </td>
    </tr>
    @empty
    <tr>
      <td colspan="9" class="tc" style="padding:25px;color:#94a3b8;font-style:italic;">
        Belum ada data realisasi untuk periode ini.
      </td>
    </tr>
    @endforelse
  </tbody>
</table>

<!-- Kriteria Status Kinerja -->
<div class="legend-box">
  <strong>💡 Kriteria Status Kinerja:</strong> &nbsp;&nbsp;
  <span class="legend-item"><span class="legend-dot" style="background:#15803d;"></span><strong>Tercapai:</strong> Capaian ≥ 100%</span>
  <span class="legend-item"><span class="legend-dot" style="background:#d97706;"></span><strong>Perlu Perhatian:</strong> 50% ≤ Capaian &lt; 100%</span>
  <span class="legend-item"><span class="legend-dot" style="background:#dc2626;"></span><strong>Kritis:</strong> Capaian &lt; 50% / Nilai Minus</span>
  <span class="legend-item"><span class="legend-dot" style="background:#9ca3af;"></span><strong>Tidak Dinilai:</strong> Target = 0 &amp; Realisasi = 0</span>
</div>

<div class="footer">
  <div class="fl">SIPERFORMA PUPR — SAKIP Terintegrasi Pemerintah Kabupaten Mimika</div>
  <div class="fr">Dicetak otomatis: {{ $generatedAt }} WIT</div>
</div>

</body>
</html>
