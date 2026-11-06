<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Staff, admins and residents. Everyone needs an account to use the site.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // `role`, `is_active` and `google_id` are deliberately absent, so they can only be set on purpose.
    protected $fillable = ['name', 'email', 'phone', 'password'];

    protected $hidden = ['password', 'remember_token', 'google_id'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['staff', 'admin'], true);
    }

    /** Philippine numbers are stored as +63…, so 0917…, 63917… and +63 917… all match. */
    public static function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            $digits = '63'.substr($digits, 1);
        }

        return strlen($digits) >= 10 && strlen($digits) <= 15 ? '+'.$digits : null;
    }

    /** Finds an account by email address or phone number. */
    public static function findByLogin(string $login): ?self
    {
        if (str_contains($login, '@')) {
            return self::where('email', strtolower(trim($login)))->first();
        }

        $phone = self::normalizePhone($login);

        return $phone ? self::where('phone', $phone)->first() : null;
    }
}
