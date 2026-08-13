<?php

namespace App\Services;

use App\Models\RefreshToken;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthService
{
    // Brute-force defense: beyond the per-IP login throttle, lock the *account*
    // out after repeated failures so a distributed attacker (many IPs, one
    // target account) can't just spread requests to dodge the IP-based limit.
    private const MAX_FAILED_LOGIN_ATTEMPTS = 5;

    private const LOCKOUT_TTL_SECONDS = 15 * 60;

    public function __construct(
        private readonly DeviceFingerprintService $deviceFingerprint,
        private readonly Google2FA $google2fa,
    ) {
    }

    public function register(array $data, ?string $ip = null, ?string $userAgent = null): array
    {
        $existing = User::query()
            ->where('email', $data['email'])
            ->orWhere('phone', $data['phone'])
            ->first();

        if ($existing) {
            throw new ConflictHttpException('An account with this email or phone already exists');
        }

        $preferredCurrency = $data['preferredCurrency'] ?? 'USD';

        $user = DB::transaction(function () use ($data, $preferredCurrency) {
            $user = User::query()->create([
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password_hash' => Hash::make($data['password']),
                'first_name' => $data['firstName'],
                'last_name' => $data['lastName'],
                'country' => $data['country'],
                'preferred_currency' => $preferredCurrency,
                // KYC Tier 1 by default: email+phone captured, wallet-only limits
                // apply until ID verification (Tier 2) or business registration (Tier 3).
                'kyc_tier' => 'TIER_1',
                'status' => 'PENDING_VERIFICATION',
            ]);

            Wallet::query()->create(['user_id' => $user->id, 'currency' => $preferredCurrency]);

            return $user;
        });

        if (! empty($data['deviceFingerprint'])) {
            $this->deviceFingerprint->recordDevice($user->id, $data['deviceFingerprint'], $userAgent, $ip, true);
        }

        logger()->info('user_registered', ['userId' => $user->id, 'country' => $user->country]);

        return $this->issueTokens($user);
    }

    public function login(string $emailOrPhone, string $password, ?string $totpCode, string $deviceFingerprint, string $ip, string $userAgent): array
    {
        $identifierKey = mb_strtolower($emailOrPhone);
        $lockoutKey = "login-lockout:{$identifierKey}";
        $failCountKey = "login-fails:{$identifierKey}";

        if (Cache::get($lockoutKey)) {
            throw new UnauthorizedHttpException('', 'Too many failed attempts. Try again in a few minutes.');
        }

        $user = User::query()
            ->where('email', $emailOrPhone)
            ->orWhere('phone', $emailOrPhone)
            ->first();

        $fail = function (string $reason) use ($failCountKey, $lockoutKey, $emailOrPhone, $ip) {
            $attempts = (int) Cache::get($failCountKey, 0) + 1;
            Cache::put($failCountKey, $attempts, self::LOCKOUT_TTL_SECONDS);
            if ($attempts >= self::MAX_FAILED_LOGIN_ATTEMPTS) {
                Cache::put($lockoutKey, true, self::LOCKOUT_TTL_SECONDS);
                logger()->warning('account_locked_out', ['identifier' => $emailOrPhone, 'ip' => $ip]);
            }
            logger()->warning('login_failed', ['reason' => $reason, 'identifier' => $emailOrPhone, 'ip' => $ip]);
            throw new UnauthorizedHttpException('', 'Invalid credentials');
        };

        if (! $user || ! Hash::check($password, $user->password_hash)) {
            $fail('bad_credentials');
        }

        if (! in_array($user->status, ['ACTIVE', 'PENDING_VERIFICATION'], true)) {
            $fail('account_not_active');
        }

        $isKnownDevice = $this->deviceFingerprint->isKnownDevice($user->id, $deviceFingerprint);

        if ($user->totp_enabled || ! $isKnownDevice) {
            // Step-up auth required: either the user opted into 2FA, or this is
            // an unrecognized device (classic ATO defense even without 2FA enabled).
            if (! $totpCode) {
                throw new UnauthorizedHttpException('', $user->totp_enabled
                    ? 'TOTP code required'
                    : 'Unrecognized device: TOTP code required to confirm identity');
            }
            if (! $user->totp_secret || ! $this->verifyTotp($user->totp_secret, $totpCode)) {
                $fail('bad_totp');
            }
        }

        // Successful login: clear any accumulated failure count.
        Cache::forget($failCountKey);
        Cache::forget($lockoutKey);

        $this->deviceFingerprint->recordDevice($user->id, $deviceFingerprint, $userAgent, $ip, true);

        logger()->info('user_login', ['userId' => $user->id, 'ip' => $ip]);

        return $this->issueTokens($user);
    }

    /** Rotates a refresh token: the old one is revoked, a new pair is issued. */
    public function refresh(string $rawRefreshToken): array
    {
        $tokenHash = hash('sha256', $rawRefreshToken);
        $stored = RefreshToken::query()->where('token_hash', $tokenHash)->first();

        if (! $stored || $stored->revoked || $stored->expires_at->isPast()) {
            if ($stored && $stored->revoked) {
                // Presenting an already-revoked refresh token strongly suggests
                // it was stolen; kill every active session for this user rather
                // than trust it.
                RefreshToken::query()->where('user_id', $stored->user_id)->where('revoked', false)->update(['revoked' => true]);
                logger()->warning('refresh_token_reuse_detected', ['userId' => $stored->user_id]);
            }
            throw new UnauthorizedHttpException('', 'Invalid or expired refresh token');
        }

        $stored->update(['revoked' => true]);

        $user = User::query()->findOrFail($stored->user_id);

        return $this->issueTokens($user);
    }

    /** Revokes one refresh token (single device) or all of the user's tokens (global logout). */
    public function logout(string $userId, ?string $rawRefreshToken): array
    {
        if ($rawRefreshToken) {
            $tokenHash = hash('sha256', $rawRefreshToken);
            RefreshToken::query()->where('user_id', $userId)->where('token_hash', $tokenHash)->update(['revoked' => true]);
        } else {
            RefreshToken::query()->where('user_id', $userId)->where('revoked', false)->update(['revoked' => true]);
        }

        return ['loggedOut' => true];
    }

    public function enableTotp(string $userId): array
    {
        $user = User::query()->findOrFail($userId);
        $secret = $this->google2fa->generateSecretKey();
        $user->update(['totp_secret' => $secret]);

        $otpAuthUrl = $this->google2fa->getQRCodeUrl(
            config('app.name', 'ObaPay'),
            $user->email,
            $secret,
        );

        return ['secret' => $secret, 'otpAuthUrl' => $otpAuthUrl];
    }

    public function confirmTotp(string $userId, string $code): array
    {
        $user = User::query()->findOrFail($userId);
        if (! $user->totp_secret || ! $this->verifyTotp($user->totp_secret, $code)) {
            throw new UnauthorizedHttpException('', 'Invalid TOTP code');
        }
        $user->update(['totp_enabled' => true]);

        return ['totpEnabled' => true];
    }

    private function verifyTotp(string $secret, string $code): bool
    {
        try {
            return $this->google2fa->verifyKey($secret, $code) === true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function issueTokens(User $user): array
    {
        $accessToken = JWTAuth::fromUser($user);

        $refreshTtlDays = (int) config('obapay.jwt_refresh_ttl_days', 7);
        $rawRefreshToken = Str::random(80);

        RefreshToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $rawRefreshToken),
            'expires_at' => now()->addDays($refreshTtlDays),
        ]);

        return [
            'accessToken' => $accessToken,
            'refreshToken' => $rawRefreshToken,
            'userId' => $user->id,
        ];
    }
}
