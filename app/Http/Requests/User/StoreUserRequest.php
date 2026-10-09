<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Form Request untuk pembuatan user baru (FR-IAM-001).
 * Memisahkan validasi dari controller agar mudah diuji dan di-reuse.
 */
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-users');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'employee_number' => ['nullable', 'string', 'max:50', Rule::unique('users', 'employee_number')],
            'job_title' => ['nullable', 'string', 'max:100'],
            'password' => [
                'required',
                'confirmed',
                Password::min((int) config('ekasuari.password_policy.min_length', 8))
                    ->when(
                        config('ekasuari.password_policy.require_uppercase', true),
                        fn ($p) => $p->mixedCase()
                    )
                    ->when(
                        config('ekasuari.password_policy.require_numbers', true),
                        fn ($p) => $p->numbers()
                    )
                    ->when(
                        config('ekasuari.password_policy.require_symbols', false),
                        fn ($p) => $p->symbols()
                    ),
            ],
            'is_active' => ['boolean'],
            'must_change_password' => ['boolean'],
            'role_ids' => ['array'],
            'role_ids.*' => ['integer', 'exists:roles,id'],
            'organization_ids' => ['array'],
            'organization_ids.*' => ['integer', 'exists:organizations,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'Email ini sudah terdaftar di sistem.',
            'employee_number.unique' => 'NIP/NRK ini sudah digunakan oleh pengguna lain.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'password.min' => 'Password minimal 8 karakter.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama lengkap',
            'email' => 'alamat email',
            'employee_number' => 'NIP/NRK',
            'job_title' => 'jabatan',
            'password' => 'password',
            'is_active' => 'status aktif',
            'must_change_password' => 'wajib ganti password',
            'role_ids' => 'peran',
            'organization_ids' => 'organisasi',
        ];
    }
}
