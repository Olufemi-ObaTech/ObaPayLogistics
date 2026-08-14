<?php

namespace App\Http\Requests;

use App\Services\AirtimeService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BuyDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'network' => ['required', Rule::in(AirtimeService::NETWORKS)],
            'phoneNumber' => ['required', 'string', 'regex:/^\+[1-9]\d{6,14}$/'],
            'currency' => ['required', Rule::in(['NGN', 'KES', 'ZAR', 'GHS', 'USD', 'EUR', 'XOF', 'EGP'])],
            'bundleCode' => ['required', 'string'],
        ];
    }
}
