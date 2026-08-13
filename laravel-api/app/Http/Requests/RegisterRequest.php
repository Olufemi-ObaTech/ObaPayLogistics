<?php

namespace App\Http\Requests;

use App\Support\AfricanCountryCodes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'phone' => ['required', 'regex:/^\+[1-9]\d{6,14}$/'],
            'password' => ['required', 'string', 'min:10'],
            'firstName' => ['required', 'string'],
            'lastName' => ['required', 'string'],
            'country' => ['required', Rule::in(AfricanCountryCodes::CODES)],
            'preferredCurrency' => ['sometimes', 'string'],
            // Trusts the registering device immediately, so the user isn't
            // locked out of their very first login by the unknown-device
            // step-up check (they can't have set up TOTP yet).
            'deviceFingerprint' => ['sometimes', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'phone must be in E.164 format, e.g. +2348012345678',
            'password.min' => 'password must be at least 10 characters',
        ];
    }
}
