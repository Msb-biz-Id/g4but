<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'email',
        'email_verified_at',
        'password',
        'employee_number',
        'job_title',
        'is_active',
        'must_change_password',
        'mfa_enabled',
        'last_login_at',
        'last_login_ip',
        'locale',
        'password_changed_at',
        'is_service_account',
        // FR-IAM-007: Google2FA MFA
        'google2fa_secret',
        'google2fa_enabled',
        'google2fa_confirmed_at',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
        'google2fa_secret', // jangan pernah expose secret ke frontend
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'mfa_enabled' => 'boolean',
            'google2fa_enabled' => 'boolean',
            'google2fa_confirmed_at' => 'datetime',
            'is_service_account' => 'boolean',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_user')
            ->withPivot('is_default')
            ->withTimestamps();
    }

    public function defaultOrganization(): ?Organization
    {
        return $this->organizations()
            ->wherePivot('is_default', true)
            ->first() ?? $this->organizations()->first();
    }

    public function getOrganizationAttribute(): ?Organization
    {
        return $this->defaultOrganization();
    }

    public function getOrganizationIdAttribute(): ?int
    {
        return $this->defaultOrganization()?->id;
    }

    public function isProvincialAdmin(): bool
    {
        return $this->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
    }

    public function isProvincialLevel(): bool
    {
        return $this->roles()->whereIn('name', [
            'Super Admin', 'Admin Provinsi', 'Pimpinan Provinsi', 'Evaluator Provinsi', 'Inspektorat', 'Auditor',
        ])->exists();
    }

    public function isOpdLevel(): bool
    {
        return $this->roles()->whereIn('name', [
            'Admin OPD', 'Operator OPD', 'Validator OPD', 'Kepala OPD',
        ])->exists();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->permissions()->where('name', $permission)->exists()
            || $this->roles()->whereHas('permissions', fn ($q) => $q->where('name', $permission))->exists();
    }

    /**
     * Alias for hasPermission() — compatible with spatie/laravel-permission API.
     */
    public function hasPermissionTo(string $permission): bool
    {
        return $this->hasPermission($permission);
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }
}
