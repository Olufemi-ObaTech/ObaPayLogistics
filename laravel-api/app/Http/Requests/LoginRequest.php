<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emailOrPhone' => ['required', 'string'],
            'password' => ['required', 'string'],
            'totpCode' => ['sometimes', 'string'],
            // Raw client-side device fingerprint (canvas/UA/screen composite hash).
            'deviceFingerprint' => ['required', 'string'],
        ];
    }
}
