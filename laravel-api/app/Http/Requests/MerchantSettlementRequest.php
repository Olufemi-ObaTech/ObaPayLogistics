<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MerchantSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Merchant is identified by their ObaPay user id, never a raw wallet id.
            'merchantUserId' => ['required', 'string'],
            'currency' => [
                'required',
                Rule::in(['NGN', 'KES', 'ZAR', 'GHS', 'USD', 'EUR', 'XOF', 'EGP']),
            ],
            'amount' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
