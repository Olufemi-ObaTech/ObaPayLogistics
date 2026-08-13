<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class P2pTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sourceWalletId' => ['required', 'string'],
            'destinationWalletId' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'narration' => ['sometimes', 'string'],
        ];
    }
}
