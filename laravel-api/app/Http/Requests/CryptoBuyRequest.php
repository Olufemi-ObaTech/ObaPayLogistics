<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CryptoBuyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'symbol' => ['required', Rule::in(['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP'])],
            'currency' => ['required', Rule::in(['NGN', 'KES', 'ZAR', 'GHS', 'USD', 'EUR', 'XOF', 'EGP'])],
            'fiatAmount' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
