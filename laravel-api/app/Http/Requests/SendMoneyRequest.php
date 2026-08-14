<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendMoneyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Recipient is identified by email or phone — never a raw wallet
            // id — matching how P2P transfers work on real neobank apps.
            'recipientIdentifier' => ['required', 'string'],
            'currency' => ['required', Rule::in(['NGN', 'KES', 'ZAR', 'GHS', 'USD', 'EUR', 'XOF', 'EGP'])],
            'amount' => ['required', 'numeric', 'gt:0'],
            'narration' => ['sometimes', 'string', 'max:140'],
        ];
    }
}
