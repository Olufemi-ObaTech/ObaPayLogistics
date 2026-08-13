<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'email', 'phone', 'password_hash', 'first_name', 'last_name', 'country',
        'preferred_currency', 'kyc_tier', 'status', 'totp_secret', 'totp_enabled',
        'business_name', 'business_reg_number',
    ];

    protected $hidden = ['password_hash', 'totp_secret'];

    protected function casts(): array
    {
        return [
            'totp_enabled' => 'boolean',
        ];
    }

    public function wallets()
    {
        return $this->hasMany(Wallet::class);
    }

    public function devices()
    {
        return $this->hasMany(DeviceFingerprint::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function refreshTokens()
    {
        return $this->hasMany(RefreshToken::class);
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // --- Tymon\JWTAuth\Contracts\JWTSubject ---

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'email' => $this->email,
            'kycTier' => $this->kyc_tier,
        ];
    }
}
