<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateShipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $address = fn (string $prefix) => [
            "{$prefix}.line1" => ['required', 'string'],
            "{$prefix}.city" => ['required', 'string'],
            "{$prefix}.state" => ['sometimes', 'string'],
            "{$prefix}.country" => ['required', 'string', 'size:2'],
            "{$prefix}.postalCode" => ['sometimes', 'string'],
        ];

        return [
            ...$address('originAddress'),
            ...$address('destinationAddress'),
            'weightKg' => ['required', 'numeric', 'gt:0'],
            'dimensionsCm.length' => ['required', 'numeric', 'gt:0'],
            'dimensionsCm.width' => ['required', 'numeric', 'gt:0'],
            'dimensionsCm.height' => ['required', 'numeric', 'gt:0'],
            'declaredValue' => ['required', 'numeric', 'gt:0'],
            'declaredValueCurrency' => ['sometimes', 'string', 'size:3'],
            'customsCategory' => ['required', Rule::in(['DOCUMENTS', 'GIFTS', 'COMMERCIAL_SAMPLE', 'PERSONAL_EFFECTS', 'ELECTRONICS', 'MERCHANDISE', 'OTHER'])],
            'shippingMethod' => ['required', Rule::in(['AIR', 'SEA', 'ROAD'])],
        ];
    }
}
