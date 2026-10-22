<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Dokumen SAKIP - {{ $doc->title }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 10px; color: #1e293b; padding: 24px 28px; line-height: 1.45; }
        .hdr-table { width: 100%; border-collapse: collapse; border: none; border-bottom: 2.5px solid #1e3a5f; margin-bottom: 16px; padding-bottom: 10px; }
        .hdr-table tr, .hdr-table tr td { border: none !important; background: transparent !important; padding: 0 !important; }
        .hdr-logo-cell { width: 65px; text-align: left; vertical-align: middle; }
        .hdr-logo-cell img { height: 54px; width: 54px; display: block; }
        .hdr-title-cell { text-align: center; vertical-align: middle; }
        .hdr-spacer-cell { width: 65px; }
        .instansi { font-size: 12px; font-weight: bold; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; }
        .instansi-sub { font-size: 10px; color: #334155; margin-top: 1px; }
        .doc-title { font-size: 13px; font-weight: bold; color: #0f172a; margin: 4px 0 2px 0; text-transform: uppercase; }
        .doc-sub { font-size: 8.5px; color: #64748b; }

        .banner { background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 8px 12px; margin-bottom: 16px; }
        .banner-title { font-size: 10.5px; font-weight: bold; color: #166534; }
        .banner-desc { font-size: 8.5px; color: #15803d; margin-top: 2px; }

        .section-title { font-size: 11px; font-weight: bold; color: #1e3a5f; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.3px; }

        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .meta-table tr td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; vertical-align: top; }
        .meta-table tr:nth-child(even) { background-color: #f8fafc; }
        .meta-label { width: 32%; font-weight: bold; color: #475569; }
        .meta-sep { width: 3%; text-align: center; color: #94a3b8; }
        .meta-value { width: 65%; color: #0f172a; }

        .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 8.5px; font-weight: bold; }
        .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .badge-info { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }

        .seal-box { border: 1.5px dashed #94a3b8; background: #fafafa; border-radius: 6px; padding: 12px 14px; margin-top: 14px; }
        .seal-title { font-size: 9.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin-bottom: 4px; }
        .seal-desc { font-size: 8.5px; color: #64748b; line-height: 1.4; }

        .sig-table { width: 100%; border-collapse: collapse; margin-top: 24px; border: none; }
        .sig-table tr td { border: none !important; background: transparent !important; padding: 0 !important; vertical-align: top; }
        .sig-col { width: 50%; text-align: center; }
        .sig-title { font-size: 9.5px; font-weight: bold; color: #334155; margin-bottom: 50px; }
        .sig-name { font-size: 10px; font-weight: bold; color: #0f172a; text-decoration: underline; }
        .sig-nip { font-size: 8.5px; color: #64748b; margin-top: 2px; }

        .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 7.5px; color: #94a3b8; }
        .footer .fl { float: left; }
        .footer .fr { float: right; }
    </style>
</head>
<body>
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
                <div class="instansi">Pemerintah Kabupaten Mimika</div>
                <div class="instansi-sub">Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP)</div>
                <div class="doc-title">LEMBAR PENGESAHAN DOKUMEN SAKIP</div>
                <div class="doc-sub">SIPERFORMA PUPR &bull; Cetak Otomatis Dashboard Analitik</div>
            </td>
            <td class="hdr-spacer-cell"></td>
        </tr>
    </table>

    <div class="banner">
        <div class="banner-title">&check; Dokumen Terdaftar Resmi dalam Matriks Evaluasi SAKIP</div>
        <div class="banner-desc">
            Dokumen ini telah diverifikasi dan memenuhi standar kelengkapan dokumen SAKIP Pemerintah Kabupaten Mimika.
        </div>
    </div>

    <div class="section-title">Identitas Dokumen Perencanaan & Kinerja</div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Nama Dokumen</td>
            <td class="meta-sep">:</td>
            <td class="meta-value"><strong>{{ $doc->title }}</strong></td>
        </tr>
        <tr>
            <td class="meta-label">Klasifikasi Dokumen SAKIP</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">
                <span class="badge badge-info">{{ strtoupper($doc->type) }}</span>
            </td>
        </tr>
        <tr>
            <td class="meta-label">Nomor Dokumen / Registrasi</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">{{ $doc->document_number ?: ($doc->code ?: '-') }}</td>
        </tr>
        <tr>
            <td class="meta-label">Unit Kerja / Bidang / Instansi</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">
                <strong>{{ $doc->organization?->name ?: 'Pemerintah Kabupaten Mimika' }}</strong>
                @if($doc->organization?->code)
                    ({{ $doc->organization->code }})
                @endif
            </td>
        </tr>
        <tr>
            <td class="meta-label">Tahun / Periode Berlaku</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">
                @if($doc->periode_type === 'lima_tahunan' && $doc->start_year && $doc->end_year)
                    {{ $doc->start_year }} - {{ $doc->end_year }} (Lima Tahunan)
                @else
                    Tahun {{ $doc->year ?: ($year ?? date('Y')) }} (Tahunan)
                @endif
            </td>
        </tr>
        <tr>
            <td class="meta-label">Status Verifikasi Sistem</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">
                <span class="badge badge-success">&check; {{ strtoupper($doc->status ?: 'APPROVED') }}</span>
            </td>
        </tr>
        <tr>
            <td class="meta-label">Tanggal Disetujui / Disahkan</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">
                {{ $doc->approved_at ? $doc->approved_at->format('d-m-Y H:i') . ' WIT' : ($doc->created_at ? $doc->created_at->format('d-m-Y') : '-') }}
            </td>
        </tr>
        <tr>
            <td class="meta-label">Diverifikasi Oleh</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">
                {{ $doc->approver?->name ?: 'Administrator SAKIP Kabupaten Mimika' }}
            </td>
        </tr>
        @if($doc->description)
        <tr>
            <td class="meta-label">Deskripsi / Catatan</td>
            <td class="meta-sep">:</td>
            <td class="meta-value">{{ $doc->description }}</td>
        </tr>
        @endif
    </table>

    <div class="seal-box">
        <div class="seal-title">Keterangan Keabsahan Dokumen Digital</div>
        <div class="seal-desc">
            Dokumen ini diakui secara sah dalam SIPERFORMA PUPR Kabupaten Mimika sebagai bagian dari pemenuhan parameter evaluasi akuntabilitas kinerja SAKIP (12 Dokumen Unit Kerja). Apabila Unit Kerja bersangkutan mengunggah lampiran berkas lengkap (PDF/XLSX), sistem akan secara otomatis menyediakan berkas asli tersebut pada tautan unduh.
        </div>
    </div>

    <table class="sig-table">
        <tr>
            <td class="sig-col">
                <div class="sig-title">
                    Divalidasi di Manokwari,<br>
                    Pengelola SAKIP Kabupaten Mimika
                </div>
                <div class="sig-name">{{ $doc->approver?->name ?: 'Tim Evaluator SAKIP' }}</div>
                <div class="sig-nip">Pemerintah Kabupaten Mimika</div>
            </td>
            <td class="sig-col">
                <div class="sig-title">
                    Mengetahui / Penanggung Jawab,<br>
                    {{ $doc->organization?->name ?: 'Pemerintah Daerah' }}
                </div>
                <div class="sig-name">{{ $doc->creator?->name ?: 'Kepala Unit Kerja / Bidang' }}</div>
                <div class="sig-nip">NIP. -</div>
            </td>
        </tr>
    </table>

    <div class="footer">
        <div class="fl">Sistem Informasi SIPERFORMA PUPR &bull; Dokumen SAKIP {{ $doc->code ?: $doc->id }}</div>
        <div class="fr">Dicetak pada: {{ $generatedAt }}</div>
    </div>
</body>
</html>
