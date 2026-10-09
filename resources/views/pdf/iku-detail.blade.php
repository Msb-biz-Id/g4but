<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>IKU - {{ $iku->code }}</title>
<style>
    body {
        font-family: 'DejaVu Sans', sans-serif;
        font-size: 10px;
        color: #1f2937;
        margin: 0;
        padding: 20px;
        line-height: 1.4;
    }
    .header-block {
        display: table;
        width: 100%;
        border-bottom: 2px solid #1e3a8a;
        padding-bottom: 12px;
        margin-bottom: 16px;
    }
    .logo-cell {
        display: table-cell;
        width: 65px;
        vertical-align: middle;
    }
    .title-cell {
        display: table-cell;
        vertical-align: middle;
        text-align: center;
    }
    .instansi-title {
        font-size: 13px;
        font-weight: bold;
        color: #1e3a8a;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .doc-title {
        font-size: 12px;
        font-weight: bold;
        margin: 4px 0 2px 0;
        color: #111827;
    }
    .doc-subtitle {
        font-size: 9px;
        color: #6b7280;
    }
    .status-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
    }
    .status-draft { background: #f3f4f6; color: #4b5563; }
    .status-diajukan { background: #dbeafe; color: #1e40af; }
    .status-review { background: #fef9c3; color: #854d0e; }
    .status-perbaikan { background: #ffedd5; color: #9a3412; }
    .status-final { background: #dcfce7; color: #166534; }
    .status-nonaktif { background: #fee2e2; color: #991b1b; }

    .section-title {
        font-size: 11px;
        font-weight: bold;
        color: #1e3a8a;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
        margin-top: 14px;
        margin-bottom: 8px;
        text-transform: uppercase;
    }
    table.data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
    }
    table.data-table th, table.data-table td {
        padding: 6px 8px;
        font-size: 9.5px;
        border: 1px solid #e5e7eb;
    }
    table.data-table th {
        background-color: #f8fafc;
        color: #374151;
        font-weight: bold;
        text-align: left;
    }
    table.table-striped th {
        background-color: #1e3a8a;
        color: #ffffff;
        text-align: center;
    }
    table.table-striped td {
        text-align: center;
    }
    .label-col {
        width: 28%;
        background-color: #f9fafb;
        font-weight: bold;
        color: #4b5563;
    }
    .value-col {
        width: 72%;
    }
    .footer {
        margin-top: 25px;
        border-top: 1px solid #e5e7eb;
        padding-top: 8px;
        font-size: 8.5px;
        color: #9ca3af;
        text-align: right;
    }
</style>
</head>
<body>

<div class="header-block">
    <div class="logo-cell">
        <img src="{{ $logoBase64 ?? public_path('logo.png') }}" style="height: 50px; max-width: 50px;" alt="Logo">
    </div>
    <div class="title-cell">
        <h2 class="instansi-title">Pemerintah Provinsi Papua Barat</h2>
        <div class="doc-title">LEMBAR INDIKATOR KINERJA UTAMA (IKU)</div>
        <div class="doc-subtitle">Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) e-KASUARI</div>
    </div>
</div>

<div style="margin-bottom: 12px; display: table; width: 100%;">
    <div style="display: table-cell; vertical-align: middle;">
        <strong>Kode IKU:</strong> {{ $iku->code }} &nbsp;|&nbsp;
        <strong>Tanggal Cetak:</strong> {{ now()->format('d/m/Y H:i') }} WIT
    </div>
    <div style="display: table-cell; text-align: right; vertical-align: middle;">
        @php
            $st = $iku->iku_status ?? 'draft';
        @endphp
        <span class="status-badge status-{{ $st }}">STATUS: {{ strtoupper($st) }}</span>
    </div>
</div>

<div class="section-title">1. Identitas Indikator</div>
<table class="data-table">
    <tr>
        <td class="label-col">Periode Perencanaan</td>
        <td class="value-col">{{ $iku->planningPeriod?->name ?? ($iku->planningPeriod?->year ? 'TA ' . $iku->planningPeriod->year : '-') }}</td>
    </tr>
    <tr>
        <td class="label-col">Level Indikator</td>
        <td class="value-col">{{ $iku->level === 'pemda' ? 'Pemerintah Daerah' : 'Perangkat Daerah' }}</td>
    </tr>
    @if($iku->level === 'perangkat_daerah')
    <tr>
        <td class="label-col">Perangkat Daerah</td>
        <td class="value-col">{{ $iku->ownerOrganization?->name ?? '-' }}</td>
    </tr>
    @endif
    <tr>
        <td class="label-col">Tujuan Strategis</td>
        <td class="value-col">{{ $iku->strategicGoal?->name ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Sasaran Strategis</td>
        <td class="value-col">{{ $iku->strategicObjective?->name ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Nama Indikator (IKU)</td>
        <td class="value-col" style="font-weight: bold; color: #1e3a8a;">{{ $iku->name }}</td>
    </tr>
    <tr>
        <td class="label-col">Satuan Pengukuran</td>
        <td class="value-col">{{ $iku->measurementUnit?->name ?? '-' }} ({{ $iku->measurementUnit?->symbol ?? '-' }})</td>
    </tr>
</table>

<div class="section-title">2. Metadata & Parameter Teknis</div>
<table class="data-table">
    <tr>
        <td class="label-col">Definisi Operasional</td>
        <td class="value-col">{{ $iku->definition ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Formula / Rumus Perhitungan</td>
        <td class="value-col">{{ $iku->formula_notes ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Nilai Baseline</td>
        <td class="value-col" style="font-weight: bold;">{{ $iku->baseline_value !== null ? number_format((float) $iku->baseline_value, 2, ',', '.') : '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Tahun Baseline</td>
        <td class="value-col">{{ $iku->baseline_year ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Format Baseline Dokumen</td>
        <td class="value-col">{{ $iku->formatted_baseline }}</td>
    </tr>
    <tr>
        <td class="label-col">Keterangan Sumber Baseline</td>
        <td class="value-col">{{ $iku->baseline_note ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Polarisasi Target</td>
        <td class="value-col">
            @if($iku->polarization === 'positif')
                Positif (Semakin tinggi semakin baik)
            @elseif($iku->polarization === 'negatif')
                Negatif (Semakin rendah semakin baik)
            @elseif($iku->polarization === 'stabil')
                Stabil (Nilai target tetap / rentang)
            @else
                {{ ucfirst($iku->polarization ?? '-') }}
            @endif
        </td>
    </tr>
    <tr>
        <td class="label-col">Sumber Data</td>
        <td class="value-col">{{ $iku->data_source ?? '-' }}</td>
    </tr>
    <tr>
        <td class="label-col">Frekuensi Pengukuran</td>
        <td class="value-col">
            @php
                $freqMap = [
                    'monthly' => 'Bulanan',
                    'quarterly' => 'Triwulanan',
                    'semester' => 'Semesteran',
                    'annual' => 'Tahunan',
                ];
            @endphp
            {{ $freqMap[$iku->frequency] ?? ucfirst($iku->frequency ?? '-') }}
        </td>
    </tr>
    <tr>
        <td class="label-col">Pejabat Penanggung Jawab</td>
        <td class="value-col">{{ $iku->responsibleOfficer?->name ?? '-' }}</td>
    </tr>
</table>

<div class="section-title">3. Target Kinerja Tahunan</div>
<table class="data-table table-striped">
    <thead>
        <tr>
            <th style="width: 15%;">Tahun</th>
            <th style="width: 35%;">Nilai Target</th>
            <th style="width: 25%;">Satuan</th>
            <th style="width: 25%;">Status Target</th>
        </tr>
    </thead>
    <tbody>
        @forelse($iku->targets as $t)
        <tr>
            <td style="font-weight: bold;">{{ $t->year ?? ($t->planningPeriod?->year ?? '-') }}</td>
            <td style="font-size: 11px; font-weight: bold; color: #1e3a8a;">{{ number_format((float)$t->target_value, 2, ',', '.') }}</td>
            <td>{{ $iku->measurementUnit?->symbol ?? '-' }}</td>
            <td>{{ ucfirst($t->status ?? 'Draft') }}</td>
        </tr>
        @empty
        <tr>
            <td colspan="4" style="text-align: center; color: #9ca3af; padding: 12px;">Belum ada target tahunan yang ditetapkan.</td>
        </tr>
        @endforelse
    </tbody>
</table>

@if($iku->ikuHistories && count($iku->ikuHistories) > 0)
<div class="section-title">4. Riwayat Verifikasi & Perubahan (Audit Trail)</div>
<table class="data-table">
    <thead>
        <tr style="background-color: #f1f5f9;">
            <th style="width: 20%;">Waktu</th>
            <th style="width: 20%;">Tindakan</th>
            <th style="width: 25%;">Pengguna</th>
            <th style="width: 35%;">Catatan</th>
        </tr>
    </thead>
    <tbody>
        @foreach($iku->ikuHistories as $h)
        <tr>
            <td style="font-size: 8.5px;">{{ \Carbon\Carbon::parse($h->created_at)->format('d/m/Y H:i') }}</td>
            <td style="font-weight: bold; text-transform: uppercase;">{{ $h->action }}</td>
            <td>{{ $h->user?->name ?? '-' }}</td>
            <td style="color: #4b5563;">{{ $h->notes ?? '-' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endif

<div class="footer">
    Dokumen ini dicetak otomatis oleh Sistem Akuntabilitas Kinerja Instansi Pemerintah (e-KASUARI) Papua Barat pada {{ now()->format('d/m/Y H:i:s') }} WIT.
</div>

</body>
</html>
