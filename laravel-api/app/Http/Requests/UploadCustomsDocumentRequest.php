<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadCustomsDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipmentId' => ['required', 'string'],
            'documentType' => ['required', Rule::in(['INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'ID_DOCUMENT', 'OTHER'])],
            // In production this would be a multipart file upload streamed to
            // S3/Cloud Storage by a dedicated upload endpoint; the API here
            // accepts the resulting object URL to keep the storage layer swappable.
            'fileUrl' => ['required', 'url'],
        ];
    }
}
