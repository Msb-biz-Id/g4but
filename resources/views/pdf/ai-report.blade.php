<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>{{ $title }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8px; color:#1a1a2e; padding:14px 18px; text-align:left; }

/* Kop Surat Resmi Standard e-SAKIP */
.hdr-table { width:100%; border-collapse:collapse; border:none; border-bottom:2px solid #1e3a5f; margin-bottom:10px; padding-bottom:8px; }
.hdr-table tr, .hdr-table tr td { border:none !important; background:transparent !important; padding:0 !important; }
.hdr-logo-cell { width:60px; text-align:left; vertical-align:middle; }
.hdr-logo-cell img { height:48px; width:48px; display:block; }
.hdr-title-cell { text-align:center; vertical-align:middle; }
.hdr-spacer-cell { width:60px; }
.instansi { font-size:11px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; }
.doc-title { font-size:13px; font-weight:bold; color:#111827; margin:3px 0; }
.doc-sub { font-size:8px; color:#6b7280; }

/* Metadata Bar */
.meta { width:100%; margin-bottom:10px; font-size:8px; overflow:hidden; border-bottom:1px solid #e2e8f0; padding-bottom:6px; }
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }

/* Section Titles */
.section-title { font-size:9px; font-weight:bold; color:#1e3a5f; margin:10px 0 6px 0; border-left:3px solid #1e3a5f; padding-left:6px; text-transform:uppercase; }

/* Summary Box */
.summary-card {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-left: 3.5px solid #1e3a5f;
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 8px;
  line-height: 1.6;
  color: #1e293b;
  text-align: justify;
}

/* Data Tables Standard */
table.data-table { width:100%; border-collapse:collapse; font-size:7.5px; margin-bottom:10px; }
table.data-table thead tr { background:#1e3a5f; color:#fff; }
table.data-table th { padding:5px 4px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.data-table td { padding:4px 5px; border:1px solid #cbd5e1; vertical-align:middle; color:#1e293b; }
table.data-table tr:nth-child(even) td { background:#f8fafc; }

.tc { text-align:center; }
.tr { text-align:right; }
.tl { text-align:left; }

/* Content Box untuk fallback teks naratif bebas */
.content-box { margin-bottom:14px; font-size:8px; line-height:1.55; }
.paragraph { font-size:8px; line-height:1.55; color:#1e293b; margin-bottom:5px; text-align:justify; }
.list-item { font-size:8px; line-height:1.5; color:#1e293b; margin-bottom:3px; padding-left:14px; }
.list-num { font-weight:bold; color:#1e3a5f; display:inline-block; width:14px; margin-left:-14px; }
.list-bullet { font-weight:bold; color:#1e3a5f; display:inline-block; width:12px; margin-left:-12px; }
.list-text { display:inline; }
.callout-box { background:#fefce8; border:1px solid #fef08a; border-left:3.5px solid #ca8a04; border-radius:3px; padding:6px 8px; margin:8px 0; font-size:7.5px; color:#854d0e; }

.source-note { margin-top:4px; margin-bottom:12px; font-size:7px; color:#64748b; font-style:italic; }

/* Tanda Tangan & Verifikasi Resmi */
.footer-table { width:100%; margin-top:16px; border-collapse:collapse; }
.footer-table tr, .footer-table td { border:none !important; background:transparent !important; vertical-align:top; }
.legal-note { font-size:7.5px; color:#64748b; line-height:1.4; padding-right:15px; }
.signature-box { width:210px; float:right; text-align:center; }
.sig-title { font-size:8px; margin-bottom:44px; color:#475569; line-height:1.3; }
.sig-name { font-size:8.5px; font-weight:bold; color:#0f172a; text-decoration:underline; }
.sig-role { color:#64748b; font-size:7.5px; margin-top:2px; }

/* Footer Dokumen */
.footer { margin-top:14px; border-top:1px solid #e5e7eb; padding-top:5px; font-size:7px; color:#9ca3af; overflow:hidden; }
.fl { float:left; }
.fr { float:right; }
</style>
</head>
<body>

{{-- KOP SURAT RESMI PEMERINTAH PROVINSI PAPUA BARAT --}}
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell">
      @if(!empty($logoBase64))
        <img src="{{ $logoBase64 }}" alt="Logo">
      @elseif(file_exists(public_path('logo-flat.jpg')))
        <img src="{{ public_path('logo-flat.jpg') }}" alt="Logo">
      @elseif(file_exists(public_path('logo.png')))
        <img src="{{ public_path('logo.png') }}" alt="Logo">
      @endif
    </td>
    <td class="hdr-title-cell">
      <div class="instansi">{{ strtoupper($appName ?? 'e-SAKIP') }} &mdash; SISTEM AKUNTABILITAS KINERJA INSTANSI PEMERINTAH</div>
      <div class="doc-title">{{ strtoupper($title) }}</div>
      <div class="doc-sub">Modul AI Asisten SAKIP &nbsp;|&nbsp; Lingkup: {{ $scope }} &nbsp;|&nbsp; Sistem {{ $appName ?? 'e-SAKIP' }}</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>

{{-- BARIS METADATA --}}
<div class="meta">
  <div class="meta-l">
    <strong>Modul Analisis:</strong> {{ $title }} &nbsp;|&nbsp;
    <strong>Lingkup:</strong> {{ $scope }} &nbsp;|&nbsp;
    <strong>Petugas:</strong> {{ $userName }}
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

{{-- KONTEN UTAMA: JIKA TERSEDIA STRUKTUR PARSED SUMMARY EKSEKUTIF --}}
@if(!empty($parsed) && (!empty($parsed['ringkasan']) || !empty($parsed['perhatian']) || !empty($parsed['rekomendasi'])))

  {{-- I. RINGKASAN EKSEKUTIF --}}
  @if(!empty($parsed['ringkasan']))
    <div class="section-title">I. RINGKASAN EKSEKUTIF ANALISIS</div>
    <div class="summary-card">
      {!! nl2br(e($parsed['ringkasan'])) !!}
    </div>
  @endif

  {{-- II. CATATAN PERHATIAN KHUSUS & KENDALA KINERJA --}}
  @if(!empty($parsed['perhatian']) && count($parsed['perhatian']) > 0)
    <div class="section-title">{{ !empty($parsed['ringkasan']) ? 'II' : 'I' }}. CATATAN PERHATIAN KHUSUS &amp; KENDALA KINERJA</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:28px;">No</th>
          <th style="text-align:left; padding-left:8px;">Uraian Catatan Perhatian / Kendala Signifikan</th>
        </tr>
      </thead>
      <tbody>
        @foreach($parsed['perhatian'] as $idx => $item)
          <tr>
            <td class="tc">{{ $idx + 1 }}</td>
            <td style="padding-left:8px;">{{ is_array($item) ? ($item['catatan'] ?? reset($item)) : $item }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif

  {{-- III. REKOMENDASI TINDAK LANJUT STRATEGIS --}}
  @if(!empty($parsed['rekomendasi']) && count($parsed['rekomendasi']) > 0)
    @php
      $recNum = 1;
      if (!empty($parsed['ringkasan'])) $recNum++;
      if (!empty($parsed['perhatian']) && count($parsed['perhatian']) > 0) $recNum++;
      $roman = match($recNum) { 1 => 'I', 2 => 'II', 3 => 'III', default => 'IV' };
    @endphp
    <div class="section-title">{{ $roman }}. REKOMENDASI TINDAK LANJUT STRATEGIS</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width:28px;">No</th>
          <th style="text-align:left; padding-left:8px;">Rekomendasi / Rencana Tindakan Strategis SAKIP</th>
        </tr>
      </thead>
      <tbody>
        @foreach($parsed['rekomendasi'] as $idx => $item)
          <tr>
            <td class="tc">{{ $idx + 1 }}</td>
            <td style="padding-left:8px;">{{ is_array($item) ? ($item['tindakan'] ?? reset($item)) : $item }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif

  <div class="source-note">
    * Dihasilkan secara otomatis oleh Modul AI Asisten SAKIP Sistem e-SAKIP berdasarkan agregasi data kinerja resmi tervalidasi.
  </div>

@else

  {{-- FALLBACK: RENDERING KONTEN NARASI TERSTRUKTUR --}}
  <div class="content-box">
    {!! $formattedContent !!}
  </div>

@endif

{{-- TANDA TANGAN & VERIFIKASI RESMI SISTEM --}}
<table class="footer-table">
  <tr>
    <td style="width: 58%;">
      <div class="legal-note">
        <strong>Catatan Legalitas &amp; Sistem:</strong><br>
        Dokumen ini diterbitkan secara resmi oleh modul AI Asisten SAKIP {{ $appName ?? 'e-SAKIP' }} Perangkat Daerah berdasarkan agregasi data kinerja dan keuangan yang tervalidasi. Informasi ini merupakan telaah analitis otomatis untuk mendukung perumusan kebijakan dan akuntabilitas kinerja unit kerja.
      </div>
    </td>
    <td style="width: 42%;">
      <div class="signature-box">
        <div class="sig-title">Manokwari, {{ date('d F Y') }}<br>Diverifikasi Sistem {{ $appName ?? 'e-SAKIP' }}</div>
        <div class="sig-name">{{ $userName }}</div>
        <div class="sig-role">Operator / Pejabat Penanggung Jawab</div>
      </div>
    </td>
  </tr>
</table>

{{-- FOOTER HALAMAN DOKUMEN --}}
<div class="footer">
  <div class="fl">Sistem {{ $appName ?? 'e-SAKIP' }} &mdash; SAKIP &amp; Kinerja Perangkat Daerah</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>

</body>
</html>
