<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Realisasi RPJMD {{ $currentYear }}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DejaVu Sans',sans-serif; font-size:8px; color:#1a1a2e; padding:12px 16px; }
.hdr-table { width:100%; border-collapse:collapse; border:none; border-bottom:2px solid #1e3a5f; margin-bottom:8px; padding-bottom:6px; }
.hdr-table tr, .hdr-table tr td { border:none !important; background:transparent !important; padding:0 !important; }
.hdr-logo-cell { width:55px; text-align:left; vertical-align:middle; }
.hdr-logo-cell img { height:44px; width:44px; display:block; }
.hdr-title-cell { text-align:center; vertical-align:middle; }
.hdr-spacer-cell { width:55px; }
.instansi { font-size:10.5px; font-weight:bold; color:#1e3a5f; text-transform:uppercase; }
.doc-title { font-size:12px; font-weight:bold; color:#111827; margin:2px 0; }
.doc-sub { font-size:7.5px; color:#6b7280; }
.meta { width:100%; margin-bottom:8px; font-size:7.5px; overflow:hidden; }
.meta-l { float:left; }
.meta-r { float:right; color:#6b7280; }
table.matrix { width:100%; border-collapse:collapse; font-size:6.5px; }
table.matrix thead tr { background:#1e3a5f; color:#fff; }
table.matrix th { padding:3px 2px; text-align:center; border:1px solid #2d5282; font-weight:bold; vertical-align:middle; }
table.matrix td { padding:2.5px 2px; border:1px solid #cbd5e1; vertical-align:top; line-height:1.2; }
.tc { text-align:center; }
.tr { text-align:right; }
.g { color:#15803d; font-weight:bold; }
.w { color:#d97706; font-weight:bold; }
.r { color:#dc2626; font-weight:bold; }
.n { color:#9ca3af; }
.bg-goal { background:#fdf2f4 !important; }
.bg-obj { background:#ffffff !important; }
.bg-target { background:#f0f7ff !important; }
.bg-real { background:#f0fdf4 !important; }
.bg-ach { background:#fffbeb !important; }
.badge-goal { background:#ffe4e6; color:#9f1239; padding:1px 2.5px; border-radius:2px; font-size:5.5px; font-weight:bold; display:inline-block; margin-bottom:1px; }
.badge-obj { background:#dcfce7; color:#166534; padding:1px 2.5px; border-radius:2px; font-size:5.5px; font-weight:bold; display:inline-block; margin-bottom:1px; }
.badge-status { padding:1px 3px; border-radius:2px; font-size:5.5px; font-weight:bold; display:inline-block; }
.status-tercapai { background:#dcfce7; color:#15803d; }
.status-perhatian { background:#fef3c7; color:#b45309; }
.status-kritis { background:#fee2e2; color:#b91c1c; }
.status-td { background:#f3f4f6; color:#6b7280; }
.footer { margin-top:10px; border-top:1px solid #e5e7eb; padding-top:4px; font-size:6.5px; color:#9ca3af; overflow:hidden; }
.fl { float:left; }
.fr { float:right; }
</style>
</head>
<body>
<table class="hdr-table">
  <tr>
    <td class="hdr-logo-cell"><img src="{{ $logoBase64 ?? public_path('logo.png') }}" alt="Logo"></td>
    <td class="hdr-title-cell">
      <div class="instansi">Pemerintah Provinsi Papua Barat</div>
      <div class="doc-title">LAPORAN REALISASI KINERJA — RPJMD</div>
      <div class="doc-sub">Pengukuran Kinerja &nbsp;|&nbsp; Tahun {{ $currentYear }} &nbsp;|&nbsp; Sistem e-KASUARI SAKIP</div>
    </td>
    <td class="hdr-spacer-cell"></td>
  </tr>
</table>

<div class="meta">
  <div class="meta-l">
    <strong>Total:</strong> {{ $stats['total'] }} indikator &nbsp;|&nbsp;
    <strong>Rata-rata Capaian:</strong> {{ $stats['avg'] }}% &nbsp;|&nbsp;
    <strong>Tercapai:</strong> {{ $stats['tercapai'] }} &nbsp;|&nbsp;
    <strong>Perlu Perhatian:</strong> {{ $stats['perhatian'] }} &nbsp;|&nbsp;
    <strong>Kritis:</strong> {{ $stats['kritis'] }}
    @if(($stats['tidak_dinilai'] ?? 0) > 0)
    &nbsp;|&nbsp; <strong>Tidak Dinilai:</strong> {{ $stats['tidak_dinilai'] }}
    @endif
  </div>
  <div class="meta-r">Dicetak: {{ $generatedAt }} WIT</div>
</div>

@if((isset($goals) && count($goals) > 0) || (isset($items) && count($items) > 0))
<table class="matrix">
  <thead>
    <tr>
      <th rowspan="2" style="width:18px">No</th>
      <th rowspan="2" style="width:65px">Misi RPJMD</th>
      <th rowspan="2" style="width:70px">Tujuan RPJMD</th>
      <th rowspan="2" style="width:65px">Indikator Tujuan</th>
      <th rowspan="2" style="width:22px">Sat</th>
      <th rowspan="2" style="width:70px">Sasaran RPJMD</th>
      <th rowspan="2" style="width:70px">Indikator Sasaran</th>
      <th rowspan="2" style="width:22px">Sat</th>
      <th rowspan="2" style="width:24px">Pola</th>
      {{-- Distinct Colors: Target (Blue), Realisasi (Emerald), Capaian (Amber) --}}
      <th colspan="{{ count($years) }}" style="background:#1e40af; color:#fff; border-color:#1e3a8a;">TARGET TAHUNAN</th>
      <th colspan="{{ count($years) }}" style="background:#065f46; color:#fff; border-color:#064e3b;">REALISASI TAHUNAN</th>
      <th colspan="{{ count($years) }}" style="background:#92400e; color:#fff; border-color:#78350f;">CAPAIAN KINERJA (%)</th>
      <th rowspan="2" style="width:40px">Status {{ $currentYear }}</th>
    </tr>
    <tr>
      @foreach($years as $yr)
      <th style="background:#dbeafe; color:#1e3a8a; border-color:#bfdbfe;">{{ $yr }}</th>
      @endforeach
      @foreach($years as $yr)
      <th style="background:#d1fae5; color:#064e3b; border-color:#a7f3d0;">{{ $yr }}</th>
      @endforeach
      @foreach($years as $yr)
      <th style="background:#fef3c7; color:#78350f; border-color:#fde68a;">{{ $yr }}</th>
      @endforeach
    </tr>
  </thead>
  <tbody>
    @if(isset($goals) && count($goals) > 0)
      @php
        $rawMissionGroups = [];
        foreach($goals as $goal) {
          $m = trim($goal->mission ?: 'Misi RPJMD');
          $rawMissionGroups[$m][] = $goal;
        }

        $missionGroups = [];
        foreach($rawMissionGroups as $m => $mGoals) {
          $gIdx = 1;
          foreach($mGoals as $goal) {
            $goalInds = !empty($goal->goal_indicators_list) ? $goal->goal_indicators_list : [
              [
                'indicator' => $goal->goal_indicator ?: '-',
                'unit' => $goal->goal_indicator_unit ?: '%',
                'measurement_pattern' => $goal->goal_measurement_pattern ?: 'Positif',
                'targets' => $goal->goal_targets ?: ($goal->targets ?: []),
                'realizations' => $goal->goal_realizations ?: ($goal->realizations ?: []),
                'calculations' => $goal->calculations ?: [],
              ]
            ];

            $childrenData = [];
            $totalChildIndRows = 0;
            if ($goal->children && count($goal->children) > 0) {
              foreach ($goal->children as $child) {
                $cInds = !empty($child->objective_indicators_list) ? $child->objective_indicators_list : [
                  [
                    'indicator' => $child->objective_indicator ?: '-',
                    'unit' => $child->unit ?: '%',
                    'measurement_pattern' => $child->measurement_pattern ?: 'Positif',
                    'targets' => $child->targets ?: [],
                    'realizations' => $child->realizations ?: [],
                    'calculations' => $child->calculations ?: [],
                  ]
                ];
                $childrenData[] = ['child' => $child, 'inds' => $cInds];
                $totalChildIndRows += count($cInds);
              }
            }

            $totalGoalRows = count($goalInds) + ($totalChildIndRows > 0 ? $totalChildIndRows : 1);

            $missionGroups[$m][] = [
              'goal' => $goal,
              'goalNo' => $gIdx++,
              'goalInds' => $goalInds,
              'childrenData' => $childrenData,
              'totalGoalRows' => $totalGoalRows,
            ];
          }
        }
      @endphp

      @foreach($missionGroups as $missionName => $groupGoals)
        @php
          $totalMissionRows = array_sum(array_column($groupGoals, 'totalGoalRows'));
        @endphp
        @foreach($groupGoals as $goalIdx => $pGoal)
          @php
            $goal = $pGoal['goal'];
            $gIdx = $pGoal['goalNo'];
            $goalInds = $pGoal['goalInds'];
            $childrenData = $pGoal['childrenData'];
            $totalGoalRows = $pGoal['totalGoalRows'];
          @endphp

          {{-- ── GOAL INDICATOR ROWS ── --}}
          @foreach($goalInds as $giIdx => $gInd)
          <tr class="bg-goal">
            @if($giIdx === 0)
              {{-- Spans entire Goal block (No duplicate Misi or Tujuan) --}}
              <td rowspan="{{ $totalGoalRows }}" class="tc" style="font-weight:bold; font-family:monospace; background:#fff1f2; color:#881337;">
                ({{ $gIdx }})
              </td>
              @if($goalIdx === 0)
                <td rowspan="{{ $totalMissionRows }}" style="background:#fff1f2; font-weight:bold; color:#1e293b;">
                  {{ $missionName }}
                </td>
              @endif
              <td rowspan="{{ $totalGoalRows }}" style="background:#fff1f2;">
                <span class="badge-goal">TUJUAN</span><br>
                <strong>{{ $goal->goal ?? '-' }}</strong>
              </td>
            @endif

          {{-- Indikator Tujuan --}}
          <td>
            @if(count($goalInds) > 1)
              <span style="font-family:monospace; font-weight:bold; color:#be123c;">({{ $gIdx }}.{{ $giIdx + 1 }})</span>
            @endif
            {{ $gInd['indicator'] ?? '-' }}
          </td>

          {{-- Satuan Tujuan --}}
          <td class="tc" style="font-family:monospace;">{{ $gInd['unit'] ?? '-' }}</td>

          {{-- Sasaran Spanned Across Goal Indicators --}}
          @if($giIdx === 0)
            <td rowspan="{{ count($goalInds) }}" class="tc" style="color:#64748b; font-style:italic;">
              Mengayomi {{ count($childrenData) }} Sasaran
            </td>
            <td rowspan="{{ count($goalInds) }}" class="tc" style="color:#94a3b8;">—</td>
            <td rowspan="{{ count($goalInds) }}" class="tc" style="color:#94a3b8;">—</td>
          @endif

          {{-- Pola --}}
          <td class="tc">{{ $gInd['measurement_pattern'] ?? 'Positif' }}</td>

          {{-- Targets (Blue) --}}
          @foreach($years as $yr)
            @php $t = $gInd['targets'][$yr] ?? null; @endphp
            <td class="tr bg-target" style="font-family:monospace;">
              {{ ($t !== null && $t !== '') ? number_format((float)$t, 2, ',', '.') : '—' }}
            </td>
          @endforeach

          {{-- Realisasi (Emerald) --}}
          @foreach($years as $yr)
            @php $r = $gInd['realizations'][$yr] ?? null; @endphp
            <td class="tr bg-real" style="font-family:monospace;">
              {{ ($r !== null && $r !== '') ? number_format((float)$r, 2, ',', '.') : '—' }}
            </td>
          @endforeach

          {{-- Capaian (Amber) --}}
          @foreach($years as $yr)
            @php
              $a = $gInd['calculations'][$yr]['achievement'] ?? null;
              if ($a === null) {
                $tRaw = $gInd['targets'][$yr] ?? null;
                $rRaw = $gInd['realizations'][$yr] ?? null;
                if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                  $pol = $gInd['measurement_pattern'] ?? 'Positif';
                  $a = \App\Services\PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pol);
                }
              }
            @endphp
            <td class="tr bg-ach" style="font-family:monospace; font-weight:bold;">
              @if($a !== null)
                <span class="{{ $a >= 100 ? 'g' : ($a >= 50 ? 'w' : 'r') }}">{{ number_format((float)$a, 1, ',', '.') }}%</span>
              @else
                <span class="n">—</span>
              @endif
            </td>
          @endforeach

          {{-- Status Evaluasi --}}
          <td class="tc">
            @php
              $st = $gInd['calculations'][$currentYear]['status'] ?? null;
              if ($st === null || $st === 'Tidak Dinilai') {
                $tRaw = $gInd['targets'][$currentYear] ?? null;
                $rRaw = $gInd['realizations'][$currentYear] ?? null;
                if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                  $pol = $gInd['measurement_pattern'] ?? 'Positif';
                  $ach = \App\Services\PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pol);
                  $st = \App\Services\PerformanceMeasurementService::determineStatus($ach, (float)$tRaw, (float)$rRaw)['status'];
                }
              }
            @endphp
            @if($st === 'Tercapai')
              <span class="badge-status status-tercapai">Tercapai</span>
            @elseif($st === 'Perlu Perhatian')
              <span class="badge-status status-perhatian">Perhatian</span>
            @elseif($st === 'Kritis')
              <span class="badge-status status-kritis">Kritis</span>
            @else
              <span class="badge-status status-td">Tidak Dinilai</span>
            @endif
          </td>
        </tr>
        @endforeach

        {{-- ── CHILD OBJECTIVES ROWS ── --}}
        @if(count($childrenData) === 0)
          <tr class="bg-obj">
            <td class="tc" style="color:#94a3b8;">—</td>
            <td class="tc" style="color:#94a3b8;">—</td>
            <td colspan="{{ 4 + count($years) * 3 + 1 }}" style="font-style:italic; color:#94a3b8;">
              Belum ada Sasaran di bawah Tujuan ini.
            </td>
          </tr>
        @else
          @foreach($childrenData as $cIdx => $cData)
            @php
              $child = $cData['child'];
              $cInds = $cData['inds'];
            @endphp
            @foreach($cInds as $ciIdx => $cInd)
            <tr class="bg-obj">
              {{-- Empty Tujuan Indicator columns --}}
              @if($ciIdx === 0)
                <td rowspan="{{ count($cInds) }}" class="tc" style="color:#94a3b8;">—</td>
                <td rowspan="{{ count($cInds) }}" class="tc" style="color:#94a3b8;">—</td>
                <td rowspan="{{ count($cInds) }}">
                  <span class="badge-obj">SASARAN ({{ $gIdx }}.{{ $cIdx + 1 }})</span><br>
                  <strong>{{ $child->objective ?? '-' }}</strong>
                </td>
              @endif

              {{-- Indikator Sasaran --}}
              <td>
                @if(count($cInds) > 1)
                  <span style="font-family:monospace; font-weight:bold; color:#047857;">({{ $gIdx }}.{{ $cIdx + 1 }}.{{ $ciIdx + 1 }})</span>
                @endif
                {{ $cInd['indicator'] ?? '-' }}
              </td>

              {{-- Satuan Sasaran --}}
              <td class="tc" style="font-family:monospace;">{{ $cInd['unit'] ?? '-' }}</td>

              {{-- Pola --}}
              <td class="tc">{{ $cInd['measurement_pattern'] ?? 'Positif' }}</td>

              {{-- Targets (Blue) --}}
              @foreach($years as $yr)
                @php $t = $cInd['targets'][$yr] ?? null; @endphp
                <td class="tr bg-target" style="font-family:monospace;">
                  {{ ($t !== null && $t !== '') ? number_format((float)$t, 2, ',', '.') : '—' }}
                </td>
              @endforeach

              {{-- Realisasi (Emerald) --}}
              @foreach($years as $yr)
                @php $r = $cInd['realizations'][$yr] ?? null; @endphp
                <td class="tr bg-real" style="font-family:monospace;">
                  {{ ($r !== null && $r !== '') ? number_format((float)$r, 2, ',', '.') : '—' }}
                </td>
              @endforeach

              {{-- Capaian (Amber) --}}
              @foreach($years as $yr)
                @php
                  $a = $cInd['calculations'][$yr]['achievement'] ?? null;
                  if ($a === null) {
                    $tRaw = $cInd['targets'][$yr] ?? null;
                    $rRaw = $cInd['realizations'][$yr] ?? null;
                    if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                      $pol = $cInd['measurement_pattern'] ?? 'Positif';
                      $a = \App\Services\PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pol);
                    }
                  }
                @endphp
                <td class="tr bg-ach" style="font-family:monospace; font-weight:bold;">
                  @if($a !== null)
                    <span class="{{ $a >= 100 ? 'g' : ($a >= 50 ? 'w' : 'r') }}">{{ number_format((float)$a, 1, ',', '.') }}%</span>
                  @else
                    <span class="n">—</span>
                  @endif
                </td>
              @endforeach

              {{-- Status Evaluasi --}}
              <td class="tc">
                @php
                  $st = $cInd['calculations'][$currentYear]['status'] ?? null;
                  if ($st === null || $st === 'Tidak Dinilai') {
                    $tRaw = $cInd['targets'][$currentYear] ?? null;
                    $rRaw = $cInd['realizations'][$currentYear] ?? null;
                    if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                      $pol = $cInd['measurement_pattern'] ?? 'Positif';
                      $ach = \App\Services\PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pol);
                      $st = \App\Services\PerformanceMeasurementService::determineStatus($ach, (float)$tRaw, (float)$rRaw)['status'];
                    }
                  }
                @endphp
                @if($st === 'Tercapai')
                  <span class="badge-status status-tercapai">Tercapai</span>
                @elseif($st === 'Perlu Perhatian')
                  <span class="badge-status status-perhatian">Perhatian</span>
                @elseif($st === 'Kritis')
                  <span class="badge-status status-kritis">Kritis</span>
                @else
                  <span class="badge-status status-td">Tidak Dinilai</span>
                @endif
              </td>
            </tr>
            @endforeach
          @endforeach
        @endif

        @endforeach
      @endforeach
    @else
      {{-- Fallback for flat $items if $goals not passed --}}
      @foreach($items as $i => $item)
      @php
        $isGoal = ($item->level ?? '') === 'goal';
        $numCode = $item->number_code ?? ($i+1);
      @endphp
      <tr class="{{ $isGoal ? 'bg-goal' : 'bg-obj' }}">
        <td class="tc" style="font-weight:bold; font-family:monospace;">{{ $numCode }}</td>
        <td>{{ $item->mission ?? '-' }}</td>
        <td>{{ $item->goal ?? '-' }}</td>
        <td>{{ $item->goal_indicator ?? '-' }}</td>
        <td class="tc">{{ $item->goal_indicator_unit ?? '-' }}</td>
        <td>{{ $item->objective ?? ($isGoal ? '—' : '-') }}</td>
        <td>{{ $item->objective_indicator ?? '-' }}</td>
        <td class="tc">{{ $item->unit ?? '-' }}</td>
        <td class="tc">{{ $item->measurement_pattern ?? 'Positif' }}</td>
        @foreach($years as $yr)
          @php $c = $item->calculations[$yr] ?? null; $t = $c['target'] ?? null; @endphp
          <td class="tr bg-target">{{ $t !== null ? number_format((float)$t, 2, ',', '.') : '—' }}</td>
        @endforeach
        @foreach($years as $yr)
          @php $c = $item->calculations[$yr] ?? null; $r = $c['realization'] ?? null; @endphp
          <td class="tr bg-real">{{ $r !== null ? number_format((float)$r, 2, ',', '.') : '—' }}</td>
        @endforeach
        @foreach($years as $yr)
          @php
            $c = $item->calculations[$yr] ?? null;
            $a = $c['achievement'] ?? null;
            if ($a === null) {
              $tRaw = $c['target'] ?? ($item->targets[$yr] ?? null);
              $rRaw = $c['realization'] ?? ($item->realizations[$yr] ?? null);
              if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                $pol = $item->measurement_pattern ?? 'Positif';
                $a = \App\Services\PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pol);
              }
            }
          @endphp
          <td class="tr bg-ach font-bold">
            @if($a !== null)
              <span class="{{ $a >= 100 ? 'g' : ($a >= 50 ? 'w' : 'r') }}">{{ number_format((float)$a, 1, ',', '.') }}%</span>
            @else
              <span class="n">—</span>
            @endif
          </td>
        @endforeach
        <td class="tc">
          @php
            $s = ($item->calculations[$currentYear] ?? null)['status'] ?? null;
            if ($s === null || $s === 'Tidak Dinilai') {
              $tRaw = ($item->calculations[$currentYear] ?? null)['target'] ?? ($item->targets[$currentYear] ?? null);
              $rRaw = ($item->calculations[$currentYear] ?? null)['realization'] ?? ($item->realizations[$currentYear] ?? null);
              if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                $pol = $item->measurement_pattern ?? 'Positif';
                $ach = \App\Services\PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pol);
                $s = \App\Services\PerformanceMeasurementService::determineStatus($ach, (float)$tRaw, (float)$rRaw)['status'];
              }
            }
          @endphp
          <span class="{{ $s === 'Tercapai' ? 'g' : ($s === 'Perlu Perhatian' ? 'w' : ($s === 'Kritis' ? 'r' : 'n')) }}">{{ $s ?? '—' }}</span>
        </td>
      </tr>
      @endforeach
    @endif
  </tbody>
</table>
<div style="margin-top:6px;font-size:7px;color:#64748b;"><strong>Kriteria Status Kinerja:</strong> <span class="g">Tercapai (&ge; 100%)</span> &nbsp;|&nbsp; <span class="w">Perlu Perhatian (50% - 99.9%)</span> &nbsp;|&nbsp; <span class="r">Kritis (&lt; 50% / Minus)</span> &nbsp;|&nbsp; <span class="n">Tidak Dinilai (Target = 0 &amp; Realisasi = 0 / Belum Ada Data)</span></div>
@else
<p style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data realisasi RPJMD.</p>
@endif

<div class="footer">
  <div class="fl">Sistem e-KASUARI — SAKIP Provinsi Papua Barat</div>
  <div class="fr">Dicetak otomatis {{ $generatedAt }} WIT</div>
</div>
</body>
</html>
