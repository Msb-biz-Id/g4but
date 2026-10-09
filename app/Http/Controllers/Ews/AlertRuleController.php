<?php

namespace App\Http\Controllers\Ews;

use App\Http\Controllers\Controller;
use App\Models\AlertRule;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AlertRuleController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): Response
    {
        $this->authorize('view-alert-rules');

        $rules = AlertRule::query()->withCount('alerts')->orderBy('code')->get();

        return Inertia::render('Alerts/Rules', ['rules' => $rules]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-alert-rules');

        // Normalisasi input jika dikirim dari modal Alerts/Index.tsx
        $ruleType = $request->input('rule_type') ?? $request->input('type') ?? 'performance_deviation';
        if ($ruleType === 'achievement') {
            $ruleType = 'performance_deviation';
        } elseif ($ruleType === 'progress') {
            $ruleType = 'late_report';
        }

        $severity = $request->input('severity') ?? $request->input('level') ?? 'warning';

        $code = $request->input('code');
        if (empty($code)) {
            $prefix = match ($ruleType) {
                'performance_deviation'              => 'EWS-PD',
                'late_report', 'submission_overdue'  => 'EWS-LR',
                'missing_evidence', 'evidence_empty' => 'EWS-EV',
                'document_overdue'                   => 'EWS-DOC',
                'pk_unsigned'                        => 'EWS-PK',
                default                              => 'EWS-RULE',
            };
            $code = $prefix . '-' . strtoupper(substr(uniqid(), -4));
        }

        $request->merge([
            'code'      => $code,
            'rule_type' => $ruleType,
            'severity'  => $severity,
        ]);

        $validated = $request->validate([
            'code'      => ['required', 'string', 'max:50', 'unique:alert_rules,code'],
            'name'      => ['required', 'string', 'max:200'],
            'rule_type' => ['required', 'string'],
            'severity'  => ['required', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $config = [];
        if ($request->filled('config')) {
            $cfg = $request->input('config');
            $config = is_string($cfg) ? (json_decode($cfg, true) ?: []) : (array) $cfg;
        } else {
            if ($request->filled('threshold')) {
                $config['threshold'] = (float) $request->input('threshold');
            }
            if ($request->filled('operator')) {
                $config['operator'] = $request->input('operator');
            }
            if ($request->filled('notify_roles')) {
                $config['notify_roles'] = (array) $request->input('notify_roles');
            }
            if ($request->filled('description')) {
                $config['description'] = $request->input('description');
            }
        }

        AlertRule::create([
            'code'      => $validated['code'],
            'name'      => $validated['name'],
            'rule_type' => $validated['rule_type'],
            'severity'  => $validated['severity'],
            'config'    => !empty($config) ? $config : null,
            'is_active' => (bool) ($request->input('is_active', true)),
        ]);

        $this->audit->log('create', 'alert_rule', null, null);

        return back()->with('success', 'Aturan alert berhasil dibuat.');
    }

    public function toggle(AlertRule $rule): RedirectResponse
    {
        $this->authorize('manage-alert-rules');

        $rule->update(['is_active' => ! $rule->is_active]);

        $this->audit->log('update', 'alert_rule', $rule->id, null);

        return back()->with('success', 'Status aturan diperbarui.');
    }

    public function destroy(AlertRule $rule): RedirectResponse
    {
        $this->authorize('manage-alert-rules');

        $rule->delete();

        $this->audit->log('delete', 'alert_rule', $rule->id, null);

        return back()->with('success', 'Aturan alert berhasil dihapus.');
    }
}
