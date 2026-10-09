<?php

namespace App\Http\Requests\Measurement;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form Request untuk submit realisasi kinerja baru (FR-MSR-001, FR-MSR-002).
 * Memvalidasi bahwa indikator, OPD, dan periode ada dan konsisten.
 */
class StoreRealizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create-realizations');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'indicator_version_id' => ['required', 'integer', 'exists:indicator_versions,id'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'measurement_period_id' => ['required', 'integer', 'exists:measurement_periods,id'],
            'value' => ['required', 'numeric', 'min:-999999999', 'max:999999999'],
            'narrative' => ['nullable', 'string', 'max:5000'],
            'save_and_submit' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'indicator_version_id.exists' => 'Versi indikator tidak ditemukan.',
            'organization_id.exists' => 'OPD tidak ditemukan.',
            'measurement_period_id.exists' => 'Periode pengukuran tidak ditemukan.',
            'value.required' => 'Nilai realisasi wajib diisi.',
            'value.numeric' => 'Nilai realisasi harus berupa angka.',
            'narrative.max' => 'Narasi maksimal 5.000 karakter.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'indicator_version_id' => 'versi indikator',
            'organization_id' => 'OPD',
            'measurement_period_id' => 'periode pengukuran',
            'value' => 'nilai realisasi',
            'narrative' => 'narasi',
            'save_and_submit' => 'simpan dan submit',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            if ($user && ! app(\App\Services\AuthorizationService::class)->canAccessOrganization($user, (int) $this->input('organization_id'))) {
                $validator->errors()->add('organization_id', 'Organisasi berada di luar wewenang akun Anda.');
            }
        });
    }
}
