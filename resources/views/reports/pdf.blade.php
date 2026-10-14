<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1a1a1a; margin: 0; padding: 20px; }
h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
.subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 16px; }
.meta { font-size: 10px; color: #555; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 10px; }
tr:nth-child(even) td { background: #f5f7fa; }
.footer { margin-top: 24px; font-size: 9px; color: #888; text-align: center; }
.badge-good { color: #15803d; font-weight: bold; }
.badge-warning { color: #d97706; font-weight: bold; }
.badge-critical { color: #dc2626; font-weight: bold; }
.header-block { display: table; width: 100%; margin-bottom: 12px; }
.logo-area { display: table-cell; width: 80px; vertical-align: middle; }
.title-area { display: table-cell; vertical-align: middle; }
</style>
</head>
<body>
<div class="header-block">
  <div class="logo-area">
    <img src="{{ $logoBase64 ?? (file_exists(public_path('logo-flat.jpg')) ? public_path('logo-flat.jpg') : public_path('logo.png')) }}" style="height: 55px; max-width: 55px;" alt="Logo PUPR Mimika">
  </div>
  <div class="title-area">
    <h1>LAPORAN KINERJA</h1>
    <div class="subtitle">Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP)</div>
    <div class="subtitle">Dinas Pekerjaan Umum dan Penataan Ruang Kabupaten Mimika</div>
  </div>
</div>
<hr style="border:1px solid #1e3a5f;">
<div class="meta">
  <strong>Judul:</strong> {{ $report->title }}<br>
  <strong>Tipe:</strong> {{ strtoupper($report->type) }}<br>
  <strong>Periode:</strong> {{ $report->planningPeriod?->name ?? '-' }}<br>
  <strong>Organisasi:</strong> {{ $report->organization?->name ?? 'Semua OPD' }}<br>
  <strong>Tanggal Generate:</strong> {{ now()->format('d-m-Y H:i') }} WIT<br>
  <strong>Dibuat oleh:</strong> {{ $report->generator?->name ?? 'Sistem' }}
</div>

@if(!empty($rows) && count($rows) > 0)
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Kode</th>
      <th>Indikator</th>
      <th>OPD</th>
      <th>Target</th>
      <th>Realisasi</th>
      <th>Capaian (%)</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($rows as $i => $row)
    <tr>
      <td>{{ $i + 1 }}</td>
      <td>{{ $row['indicator_code'] ?? '-' }}</td>
      <td>{{ $row['indicator_name'] ?? '-' }}</td>
      <td>{{ $row['organization'] ?? '-' }}</td>
      <td>{{ $row['target_value'] ?? '-' }}</td>
      <td>{{ $row['realization_value'] ?? '-' }}</td>
      <td>
        @if(isset($row['achievement']))
          @php $pct = $row['achievement']; @endphp
          <span class="@if($pct >= 80) badge-good @elseif($pct >= 60) badge-warning @else badge-critical @endif">
            {{ number_format($pct, 1) }}%
          </span>
        @else
          -
        @endif
      </td>
      <td>
        @if(isset($row['achievement']))
          @if($row['achievement'] >= 80) Baik
          @elseif($row['achievement'] >= 60) Perlu Perhatian
          @else Kritis
          @endif
        @else
          Belum Ada Data
        @endif
      </td>
    </tr>
    @endforeach
  </tbody>
</table>
@else
<p style="text-align:center; color:#888; padding:20px;">Belum ada data realisasi yang tersedia untuk periode ini.</p>
@endif

<div class="footer">
  Dokumen ini digenerate secara otomatis oleh Sistem e-SAKIP pada {{ now()->toIso8601String() }}.<br>
  Bersifat informatif — untuk penggunaan resmi harap verifikasi dengan data sumber.
</div>
</body>
</html>
