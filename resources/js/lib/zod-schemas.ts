import { z } from 'zod';

// =========================================================
// Schema Validasi Zod — e-KASUARI
// Sesuai BRD.md FR codes & Business Rules
// =========================================================

// --- FR-IAM: User Management ---
export const userSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter').optional(),
    nip: z.string().max(20).optional(),
    phone: z.string().max(20).optional(),
    organization_id: z.number().positive().optional(),
    role_ids: z.array(z.number()).min(1, 'Pilih minimal satu role'),
    is_active: z.boolean().default(true),
});

// --- FR-MD: Master Organisasi ---
export const organizationSchema = z.object({
    code: z.string().min(2).max(20, 'Kode maksimal 20 karakter'),
    name: z.string().min(3, 'Nama minimal 3 karakter').max(200),
    type: z.enum(['province', 'city', 'district', 'opd', 'unit']),
    parent_id: z.number().positive().nullable().optional(),
    head_name: z.string().max(100).optional(),
    head_title: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
});

// --- FR-MD: Periode Kinerja ---
export const periodSchema = z.object({
    name: z.string().min(3).max(100),
    year: z.number().int().min(2000).max(2100),
    start_date: z.string(),
    end_date: z.string(),
    status: z.enum(['draft', 'active', 'closed']).default('draft'),
});

// --- FR-MD: Indikator Kinerja (BR-IND-001: 13 atribut wajib) ---
export const indicatorSchema = z.object({
    code: z.string().min(2).max(50, 'Kode indikator maksimal 50 karakter'),
    name: z.string().min(3).max(300),
    definition: z.string().min(10, 'Definisi minimal 10 karakter'),
    owner_organization_id: z.number().positive('Pemilik wajib dipilih'),
    goal_id: z.number().positive('Sasaran wajib dipilih'),
    unit_id: z.number().positive('Satuan wajib dipilih'),
    // BR-IND-002: 5 tipe polaritas
    polarity: z.enum(['higher_is_better', 'lower_is_better', 'exact_target', 'binary', 'custom']),
    calculation_formula: z.string().optional(),
    data_source: z.string().max(200, 'Sumber data maksimal 200 karakter'),
    frequency: z.enum(['monthly', 'quarterly', 'semester', 'annual']),
    base_year: z.number().int().optional(),
    base_value: z.number().optional(),
    status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

// --- FR-PLN: Perjanjian Kinerja ---
export const agreementSchema = z.object({
    title: z.string().min(5).max(300),
    organization_id: z.number().positive(),
    period_id: z.number().positive(),
    signatory_name: z.string().max(100),
    signatory_title: z.string().max(100),
    signed_date: z.string().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'locked']).default('draft'),
    notes: z.string().max(1000).optional(),
});

// --- FR-PLN: Rencana Aksi ---
export const actionPlanSchema = z.object({
    agreement_id: z.number().positive(),
    indicator_id: z.number().positive(),
    activity_name: z.string().min(5).max(300),
    start_date: z.string(),
    end_date: z.string(),
    budget: z.number().min(0).optional(),
    responsible_party: z.string().max(200).optional(),
    output: z.string().max(500).optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'delayed']).default('not_started'),
});

// --- FR-PLN: Manajemen Risiko ---
export const riskSchema = z.object({
    indicator_id: z.number().positive(),
    period_id: z.number().positive(),
    risk_name: z.string().min(5).max(300),
    description: z.string().max(1000).optional(),
    category: z.enum(['strategic', 'operational', 'financial', 'compliance', 'reputational']),
    // Likelihood & Impact: skala 1-5
    likelihood: z.number().int().min(1).max(5),
    impact: z.number().int().min(1).max(5),
    mitigation: z.string().max(1000).optional(),
    owner: z.string().max(100).optional(),
    status: z.enum(['identified', 'mitigated', 'accepted', 'closed']).default('identified'),
});

// --- FR-MSR: Realisasi Kinerja ---
export const realizationSchema = z.object({
    target_id: z.number().positive(),
    measurement_period_id: z.number().positive(),
    // BR: Nilai 0 dan null berbeda secara semantik
    realized_value: z.number().nullable(),
    narrative: z.string().min(10, 'Narasi minimal 10 karakter').max(2000),
    constraints: z.string().max(1000).optional(),
    notes: z.string().max(500).optional(),
});

// --- FR-EVL: Evaluasi Kinerja ---
export const evaluationSchema = z.object({
    period_id: z.number().positive(),
    title: z.string().min(5).max(300),
    evaluator_id: z.number().positive(),
    start_date: z.string(),
    end_date: z.string(),
    evaluation_type: z.enum(['internal', 'external', 'self']),
    status: z.enum(['draft', 'active', 'completed']).default('draft'),
});

// --- FR-EWS: Alert Rule ---
export const alertRuleSchema = z.object({
    name: z.string().min(3).max(200),
    // FR-EWS-001 s.d. 005: 5 tipe rule
    rule_type: z.enum([
        'input_delay',
        'performance_deviation',
        'missing_evidence',
        'stale_data',
        'overdue_recommendation',
    ]),
    severity: z.enum(['info', 'warning', 'critical']),
    threshold_value: z.number().optional(),
    threshold_unit: z.string().max(50).optional(),
    is_active: z.boolean().default(true),
    description: z.string().max(500).optional(),
});

// --- FR-KB: Knowledge Document ---
export const knowledgeSchema = z.object({
    title: z.string().min(5).max(300),
    category: z.enum(['regulation', 'guideline', 'faq', 'news', 'tutorial']),
    content: z.string().min(10),
    tags: z.array(z.string()).optional(),
    access: z.enum(['public', 'internal']).default('internal'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    external_url: z.string().url().optional().or(z.literal('')),
});

// Type exports
export type UserFormData = z.infer<typeof userSchema>;
export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type PeriodFormData = z.infer<typeof periodSchema>;
export type IndicatorFormData = z.infer<typeof indicatorSchema>;
export type AgreementFormData = z.infer<typeof agreementSchema>;
export type ActionPlanFormData = z.infer<typeof actionPlanSchema>;
export type RiskFormData = z.infer<typeof riskSchema>;
export type RealizationFormData = z.infer<typeof realizationSchema>;
export type EvaluationFormData = z.infer<typeof evaluationSchema>;
export type AlertRuleFormData = z.infer<typeof alertRuleSchema>;
export type KnowledgeFormData = z.infer<typeof knowledgeSchema>;
