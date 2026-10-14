<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Eksekutif Capaian Kinerja & SAKIP {{ $filters['tahun_evaluasi'] }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:7.5px; color:#1a1a2e; padding:14px 18px; }
.hdr-center { width:100%; text-align:center; border-bottom:2px solid #1e3a5f; margin-bottom:8px; padding-bottom:6px; }
.hdr-logo-wrap { text-align:center; margin-bottom:4px; }
.hdr-logo-img { height:48px; width:auto; max-width:55px; display:inline-block; margin:0 auto; }
.instansi { font-size:10.5px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; }
.doc-title { font-size:12.5px; font-weight:bold; color:#111827; margin:2px 0; }
.doc-sub { font-size:8px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:7.5px; overflow:hidden; }
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }

.section-title { font-size:9px; font-weight:bold; color:#1e3a5f; margin:8px 0 4px 0; border-left:3px solid #1e3a5f; padding-left:5px; }

/* KPI Grid Table */
.kpi-table { width:100%; border-collapse:collapse; margin-bottom:8px; }
.kpi-table td { border:1px solid #cbd5e1; padding:5px 6px; vertical-align:top; background:#f8fafc; width:25%; }
.kpi-label { font-size:7px; font-weight:bold; color:#64748b; text-transform:uppercase; }
.kpi-value { font-size:13px; font-weight:bold; color:#0f172a; margin:2px 0; }
.kpi-sub { font-size:7px; color:#475569; }

/* Data Tables */
table.data-table { width:100%; border-collapse:collapse; font-size:7px; margin-bottom:8px; }
table.data-table thead tr { background:#1e3a5f; color:#fff; }
table.data-table th { padding:4px 3px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.data-table td { padding:3px 3px; border:1px solid #e2e8f0; vertical-align:middle; }
table.data-table tr:nth-child(even) td { background:#f8fafc; }

.tc { text-align:center; }
.tr { text-align:right; }
.tl { text-align:left; }

/* Status Badges */
.badge { display:inline-block; padding:1px 4px; border-radius:3px; font-size:6.5px; font-weight:bold; }
.b-green { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
.b-yellow { background:#fef3c7; color:#b45309; border:1px solid #fde68a; }
.b-orange { background:#ffedd5; color:#c2410c; border:1px solid #fed7aa; }
.b-red { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }
.b-gray { background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; }

.g { color:#15803d; font-weight:bold; }
.w { color:#b45309; font-weight:bold; }
.o { color:#c2410c; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; }
.n { color:#9ca3af; }

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
  <div class="instansi">PEMERINTAH {{ strtoupper($provinceName ?? 'KABUPATEN MIMIKA') }}</div>
  <div class="doc-title">LAPORAN EKSEKUTIF CAPAIAN KINERJA &amp; SAKIP</div>
  <div class="doc-sub">Tahun Evaluasi: {{ $filters['tahun_evaluasi'] }} &nbsp;|&nbsp; Triwulan: {{ $filters['triwulan'] }} &nbsp;|&nbsp; Sistem {{ $appName ?? 'e-SAKIP' }} SAKIP</div>
</div>

<div class="meta">
  <div class="meta-l">
    <strong>Filter:</strong> Perangkat Daerah: {{ $filters['organization_id'] ? 'OPD Terpilih' : 'Seluruh OPD' }} &nbsp;|&nbsp;
    Status: {{ $filters['status_kinerja'] }}
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

<!-- 8 KPI UTAMA -->
<table class="kpi-table">
    <td>
      <div class="kpi-label">Rata-rata Capaian Kinerja OPD</div>
      <div class="kpi-value g">{{ number_format($kpi['rata_capaian_opd']['pct'], 2) }}%</div>
      <div class="kpi-sub">
        <span class="badge {{ $kpi['rata_capaian_opd']['status'] === 'Tercapai' ? 'b-green' : ($kpi['rata_capaian_opd']['status'] === 'Perlu Perhatian' ? 'b-yellow' : ($kpi['rata_capaian_opd']['status'] === 'Terlambat' ? 'b-orange' : 'b-red')) }}">
          {{ $kpi['rata_capaian_opd']['status'] }}
        </span>
      </div>
    </td>
    <td>
      <div class="kpi-label">Rata-rata Nilai PKO Unit Kerja</div>
      <div class="kpi-value" style="color:#0891b2">
        {{ number_format($kpi['rata_nilai_pko_opd']['nilai'] ?? $kpi['rata_rata_pko_pemda']['nilai'] ?? 0, 2) }}
      </div>
      <div class="kpi-sub">
        Predikat: <strong>{{ $kpi['rata_nilai_pko_opd']['predikat'] ?? $kpi['rata_rata_pko_pemda']['predikat'] ?? 'BELUM DINILAI' }}</strong>
      </div>
    </td>
    <td>
      <div class="kpi-label">Rata-rata Capaian OPD</div>
      <div class="kpi-value {{ $kpi['rata_capaian_opd']['pct'] >= 100 ? 'g' : ($kpi['rata_capaian_opd']['pct'] >= 80 ? 'w' : ($kpi['rata_capaian_opd']['pct'] >= 50 ? 'o' : 'r')) }}">
        {{ number_format($kpi['rata_capaian_opd']['pct'], 2) }}%
      </div>
      <div class="kpi-sub">
        <span class="badge {{ $kpi['rata_capaian_opd']['status'] === 'Tercapai' ? 'b-green' : ($kpi['rata_capaian_opd']['status'] === 'Perlu Perhatian' ? 'b-yellow' : ($kpi['rata_capaian_opd']['status'] === 'Terlambat' ? 'b-orange' : 'b-red')) }}">
          {{ $kpi['rata_capaian_opd']['status'] }}
        </span>
      </div>
    </td>
    <td>
      <div class="kpi-label">Rata-rata Nilai SAKIP OPD</div>
      <div class="kpi-value" style="color:#2563eb">{{ number_format($kpi['rata_nilai_sakip_opd']['nilai'], 2) }}</div>
      <div class="kpi-sub">Predikat: <strong>{{ $kpi['rata_nilai_sakip_opd']['predikat'] }}</strong></div>
    </td>
  </tr>
  <tr>
    <td>
      <div class="kpi-label">Nilai PKO OPD</div>
      <div class="kpi-value" style="color:#0891b2">{{ number_format($kpi['nilai_pko_pemda']['nilai'], 2) }}</div>
      <div class="kpi-sub">Predikat: <strong>{{ $kpi['nilai_pko_pemda']['predikat'] }}</strong></div>
    </td>
    <td>
      <div class="kpi-label">OPD Kritis (Kinerja)</div>
      <div class="kpi-value r">{{ $kpi['opd_kritis']['jumlah'] }} <span style="font-size:8px;font-weight:normal;">OPD</span></div>
      <div class="kpi-sub"><span class="badge b-red">Kritis</span></div>
    </td>
    <td>
      <div class="kpi-label">Kelengkapan SAKIP OPD</div>
      <div class="kpi-value {{ $kpi['kelengkapan_pemda']['pct'] >= 100 ? 'g' : ($kpi['kelengkapan_pemda']['pct'] >= 80 ? 'w' : 'r') }}">
        {{ number_format($kpi['kelengkapan_pemda']['pct'], 1) }}%
      </div>
      <div class="kpi-sub">{{ $kpi['kelengkapan_pemda']['tersedia'] }}/{{ $kpi['kelengkapan_pemda']['total'] }} Dokumen</div>
    </td>
    <td>
      <div class="kpi-label">OPD SAKIP Lengkap</div>
      <div class="kpi-value {{ $kpi['opd_sakip_lengkap']['pct'] >= 100 ? 'g' : ($kpi['opd_sakip_lengkap']['pct'] >= 80 ? 'w' : 'r') }}">
        {{ number_format($kpi['opd_sakip_lengkap']['pct'], 1) }}%
      </div>
      <div class="kpi-sub">{{ $kpi['opd_sakip_lengkap']['lengkap'] }}/{{ $kpi['opd_sakip_lengkap']['total'] }} Perangkat Daerah</div>
    </td>
  </tr>
</table>

<!-- DISTRIBUSI STATUS CAPAIAN -->
<div class="section-title">Distribusi Status Capaian Kinerja</div>
<table class="data-table" style="margin-bottom:10px;">
  <thead>
    <tr>
      <th style="width:24%">Kategori Kinerja</th>
      <th style="width:16%">Total Indikator</th>
      <th style="width:20%;background:#15803d;">Tercapai (&ge; 100%)</th>
      <th style="width:20%;background:#b45309;">Perlu Perhatian (50% - &lt; 100%)</th>
      <th style="width:20%;background:#b91c1c;">Kritis (&lt; 50% / Minus)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Capaian Kinerja Unit Kerja / Bidang</strong></td>
      <td class="tc">{{ $opd_status['total'] ?? 0 }}</td>
      <td class="tc g">{{ $opd_status['tercapai'] ?? 0 }}</td>
      <td class="tc w">{{ $opd_status['perlu_perhatian'] ?? 0 }}</td>
      <td class="tc r">{{ $opd_status['kritis'] ?? 0 }}</td>
    </tr>
  </tbody>
</table>

<!-- TABEL CAPAIAN KINERJA OPD -->
<div class="section-title">Peringkat &amp; Capaian Kinerja Seluruh Perangkat Daerah (OPD)</div>
<table class="data-table">
  <thead>
    <tr>
      <th style="width:24px">No</th>
      <th style="width:50px">Kode</th>
      <th>Nama Perangkat Daerah</th>
      <th style="width:55px">Jml Indikator</th>
      <th style="width:65px">Rata-rata Capaian</th>
      <th style="width:48px">Terlambat</th>
      <th style="width:48px">Kritis</th>
      <th style="width:70px">Status</th>
    </tr>
  </thead>
  <tbody>
    @forelse($opd_ranking as $opd)
    @php
      $cap = (float)($opd['rata_capaian'] ?? 0);
      $st = $opd['status'] ?? 'Terlambat';
      $badgeClass = match($st) {
        'Tercapai' => 'b-green',
        'Perlu Perhatian' => 'b-yellow',
        'Terlambat' => 'b-orange',
        'Kritis' => 'b-red',
        default => 'b-gray',
      };
      $capClass = match(true) {
        $cap >= 100 => 'g',
        $cap >= 80 => 'w',
        $cap >= 50 => 'o',
        default => 'r',
      };
    @endphp
    <tr>
      <td class="tc">{{ $opd['rank'] ?? '-' }}</td>
      <td class="tc">{{ $opd['kode'] ?? '-' }}</td>
      <td><strong>{{ $opd['nama'] ?? '-' }}</strong></td>
      <td class="tc">{{ $opd['jumlah_indikator'] ?? 0 }}</td>
      <td class="tr font-bold {{ $capClass }}">{{ number_format($cap, 2) }}%</td>
      <td class="tc">{{ !empty($opd['terlambat']) ? $opd['terlambat'] : '-' }}</td>
      <td class="tc {{ !empty($opd['kritis']) ? 'r' : '' }}">{{ !empty($opd['kritis']) ? $opd['kritis'] : '-' }}</td>
      <td class="tc"><span class="badge {{ $badgeClass }}">{{ $st }}</span></td>
    </tr>
    @empty
    <tr>
      <td colspan="8" class="tc n" style="padding:10px;">Tidak ada data perangkat daerah yang sesuai filter.</td>
    </tr>
    @endforelse
  </tbody>
</table>

<div class="footer">
  <div class="fl">Sistem Informasi Akuntabilitas Kinerja Terintegrasi (e-SAKIP) &bull; Pemerintah Kabupaten Mimika</div>
  <div class="fr">Laporan Resmi Eksekutif &bull; Dicetak: {{ $generatedAt }} WIT</div>
</div>

</body>
</html>
