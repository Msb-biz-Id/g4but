<?php

namespace App\Http\Requests\Measurement;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Form Request untuk update nilai realisasi kinerja (FR-MSR-008).
 * Hanya nilai, narasi, dan flag save_and_submit yang dapat diubah saat edit.
 */
class UpdateRealizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit-realizations');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
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
            'value' => 'nilai realisasi',
            'narrative' => 'narasi',
        ];
    }
}
