<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Matriks Dokumen SAKIP Pemda {{ $year }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8.5px; color:#1a1a2e; padding:16px 20px; }
.hdr-center { width:100%; text-align:center; border-bottom:2px solid #1e3a5f; margin-bottom:10px; padding-bottom:8px; }
.hdr-logo-wrap { text-align:center; margin-bottom:4px; }
.hdr-logo-img { height:48px; width:auto; max-width:60px; display:inline-block; margin:0 auto; }
.instansi { font-size:11px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; }
.doc-title { font-size:13px; font-weight:bold; color:#111827; margin:3px 0; }
.doc-sub { font-size:8.5px; color:#6b7280; }
.meta { width:100%; margin-bottom:10px; font-size:8px; overflow:hidden; }
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }

table.data-table { width:100%; border-collapse:collapse; font-size:8px; margin-bottom:12px; }
table.data-table thead tr { background:#1e3a5f; color:#fff; }
table.data-table th { padding:5px 4px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.data-table td { padding:4px 4px; border:1px solid #e2e8f0; vertical-align:middle; }
table.data-table tr:nth-child(even) td { background:#f8fafc; }

.tc { text-align:center; }
.g { color:#15803d; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; }
.n { color:#9ca3af; }

.badge { display:inline-block; padding:1.5px 5px; border-radius:3px; font-size:7px; font-weight:bold; }
.b-green { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
.b-red { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }

.footer { margin-top:14px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:7.5px; color:#9ca3af; overflow:hidden; }
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
  <div class="doc-title">MATRIKS KELENGKAPAN DOKUMEN SAKIP PEMERINTAH DAERAH</div>
  <div class="doc-sub">13 Parameter Dokumen Akuntabilitas Kinerja &nbsp;|&nbsp; Tahun Evaluasi: {{ $year }} &nbsp;|&nbsp; Sistem {{ $appName ?? 'e-KASUARI' }}</div>
</div>

<div class="meta">
  <div class="meta-l">
    <strong>Ringkasan:</strong> Tersedia {{ $matrix['available'] }} dari {{ $matrix['total_required'] }} Dokumen ({{ $matrix['percentage'] }}%) &nbsp;|&nbsp;
    Status: <strong>{{ $matrix['status'] }}</strong>
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

<table class="data-table">
  <thead>
    <tr>
      <th style="width:30px">No</th>
      <th>Dokumen Pemerintah Daerah</th>
      <th>Judul Berkas Terunggah</th>
      <th style="width:90px">Tahun / Periode</th>
      <th style="width:75px">Kelengkapan</th>
      <th style="width:85px">Status</th>
      <th style="width:85px">Berkas Fisik</th>
    </tr>
  </thead>
  <tbody>
    @foreach($matrix['rows'] as $r)
    <tr>
      <td class="tc">{{ $r['no'] }}</td>
      <td><strong>{{ $r['name'] }}</strong></td>
      <td style="color:#475569;font-size:7.5px;">{{ $r['document_title'] ?? '-' }}</td>
      <td class="tc">{{ $r['period'] ?? '-' }}</td>
      <td class="tc">
        @if(!empty($r['is_available']))
          <span class="g">&#10003; Tersedia</span>
        @else
          <span class="r">&mdash; Belum</span>
        @endif
      </td>
      <td class="tc">
        <span class="badge {{ !empty($r['is_available']) ? 'b-green' : 'b-red' }}">
          {{ $r['status'] }}
        </span>
      </td>
      <td class="tc">
        @if(!empty($r['has_file']))
          <span class="g">Ada Berkas</span>
        @else
          <span class="n">Tidak Ada</span>
        @endif
      </td>
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
