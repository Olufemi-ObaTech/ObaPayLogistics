<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RefreshTokenRequest;
use App\Http\Requests\RegisterRequest;
use App\Services\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function register(RegisterRequest $request)
    {
        return $this->authService->register($request->validated(), $request->ip(), $request->userAgent() ?? 'unknown');
    }

    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        return $this->authService->login(
            $data['emailOrPhone'],
            $data['password'],
            $data['totpCode'] ?? null,
            $data['deviceFingerprint'],
            $request->ip(),
            $request->userAgent() ?? 'unknown',
        );
    }

    public function refresh(RefreshTokenRequest $request)
    {
        return $this->authService->refresh($request->validated()['refreshToken']);
    }

    public function logout(Request $request)
    {
        $userId = $request->user()->id;
        $refreshToken = $request->input('refreshToken');

        return $this->authService->logout($userId, $refreshToken);
    }

    public function enableTotp(Request $request)
    {
        return $this->authService->enableTotp($request->user()->id);
    }

    public function confirmTotp(Request $request)
    {
        $request->validate(['code' => ['required', 'string']]);

        return $this->authService->confirmTotp($request->user()->id, $request->input('code'));
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return [
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'country' => $user->country,
            'kycTier' => $user->kyc_tier,
            'totpEnabled' => $user->totp_enabled,
            'memberSince' => $user->created_at,
        ];
    }
}
