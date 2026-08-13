<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GetRatesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'originLine1' => ['required', 'string'],
            'originCity' => ['required', 'string'],
            'originCountry' => ['required', 'string', 'size:2'],
            'destinationLine1' => ['required', 'string'],
            'destinationCity' => ['required', 'string'],
            'destinationCountry' => ['required', 'string', 'size:2'],
            'weightKg' => ['required', 'numeric', 'gt:0'],
            // Field names (length/width/height, not lengthCm/widthCm/heightCm)
            // must match what the frontend's getRates() call actually sends.
            'length' => ['required', 'numeric', 'gt:0'],
            'width' => ['required', 'numeric', 'gt:0'],
            'height' => ['required', 'numeric', 'gt:0'],
            'shippingMethod' => ['required', Rule::in(['AIR', 'SEA', 'ROAD'])],
        ];
    }

    /** Shape matches CourierService::shop()'s expected $order array exactly. */
    public function toOrder(): array
    {
        $data = $this->validated();

        return [
            'origin' => ['line1' => $data['originLine1'], 'city' => $data['originCity'], 'country' => $data['originCountry']],
            'destination' => ['line1' => $data['destinationLine1'], 'city' => $data['destinationCity'], 'country' => $data['destinationCountry']],
            'weightKg' => $data['weightKg'],
            'dimensions' => ['length' => $data['length'], 'width' => $data['width'], 'height' => $data['height']],
            'shippingMethod' => $data['shippingMethod'],
        ];
    }
}
