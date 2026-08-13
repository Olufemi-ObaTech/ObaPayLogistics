<?php

namespace App\Services;

use App\Models\CustomsDocument;
use App\Models\Shipment;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CustomsService
{
    // Simplified Harmonized System (HS) code lookup by declared customs
    // category. Real integration would call a tariff classification service
    // per-item; this MVP-level mapping is enough to pre-populate a plausible
    // customs declaration.
    private const HS_CODE_BY_CATEGORY = [
        'DOCUMENTS' => '4901.99',
        'GIFTS' => '9804.00',
        'COMMERCIAL_SAMPLE' => '9811.00',
        'PERSONAL_EFFECTS' => '9805.00',
        'ELECTRONICS' => '8517.62',
        'MERCHANDISE' => '6109.10',
        'OTHER' => '9999.99',
    ];

    public function uploadDocument(string $userId, array $dto): CustomsDocument
    {
        $shipment = Shipment::query()->find($dto['shipmentId']);
        if (! $shipment || $shipment->user_id !== $userId) {
            throw new NotFoundHttpException('Shipment not found');
        }

        // Only accept object URLs from our own trusted storage bucket/CDN — a
        // client-supplied arbitrary URL here would let an attacker point the
        // platform at an internal/private address (SSRF) or serve unmoderated
        // content under ObaPay's domain when the PDF/portal later renders it.
        $trustedPrefix = config('obapay.document_storage_base_url');
        if (! str_starts_with($dto['fileUrl'], $trustedPrefix)) {
            throw new BadRequestHttpException('fileUrl must point to ObaPay-managed document storage');
        }

        // Identity documents are the highest-fraud-risk artifact (they
        // underpin KYC Tier 2/3 upgrades and customs broker eligibility) —
        // auto-verifying them would let anyone unlock higher limits with a
        // fabricated file. Route those to manual/automated review; lower-risk
        // shipment paperwork stays auto-verified for MVP speed.
        $requiresManualReview = $dto['documentType'] === 'ID_DOCUMENT';

        $document = CustomsDocument::query()->create([
            'shipment_id' => $dto['shipmentId'],
            'document_type' => $dto['documentType'],
            'file_url' => $dto['fileUrl'],
            'verification_status' => $requiresManualReview ? 'PENDING' : 'VERIFIED',
            'verified_at' => $requiresManualReview ? null : now(),
        ]);

        logger()->info('customs_document_uploaded', ['shipmentId' => $dto['shipmentId'], 'documentType' => $dto['documentType']]);

        return $document;
    }

    /** GET /customs/status/:shipmentId — simulated clearance progress. */
    public function getStatus(string $shipmentId, string $userId): array
    {
        $shipment = Shipment::query()->with('customsDocuments')->find($shipmentId);
        if (! $shipment || $shipment->user_id !== $userId) {
            throw new NotFoundHttpException('Shipment not found');
        }

        $requiredDocs = ['INVOICE', 'PACKING_LIST'];
        $uploadedTypes = $shipment->customsDocuments->pluck('document_type')->all();
        $missingDocuments = array_values(array_diff($requiredDocs, $uploadedTypes));

        return [
            'shipmentId' => $shipmentId,
            'status' => $shipment->status,
            'isClearanceStage' => $shipment->status === 'CUSTOMS_CLEARANCE',
            'isCleared' => $shipment->status === 'DELIVERED',
            'documents' => $shipment->customsDocuments,
            'missingDocuments' => $missingDocuments,
            'readyForPreClearance' => count($missingDocuments) === 0,
        ];
    }

    /**
     * Generates a pre-filled customs declaration PDF (invoice + packing list +
     * HS codes + declared value) ready for electronic submission to a
     * national single-window portal.
     */
    public function generateCustomsForm(string $shipmentId, string $userId): string
    {
        $shipment = Shipment::query()->with(['user', 'customsDocuments'])->find($shipmentId);
        if (! $shipment || $shipment->user_id !== $userId) {
            throw new NotFoundHttpException('Shipment not found');
        }
        if (! $shipment->tracking_number) {
            throw new BadRequestHttpException('Shipment must be paid and assigned a tracking number before generating customs forms');
        }

        $hsCode = self::HS_CODE_BY_CATEGORY[$shipment->customs_category] ?? self::HS_CODE_BY_CATEGORY['OTHER'];

        $pdf = Pdf::loadView('pdf.customs-form', [
            'shipment' => $shipment,
            'hsCode' => $hsCode,
            'origin' => $shipment->origin_address,
            'destination' => $shipment->destination_address,
            'dims' => $shipment->dimensions_cm,
        ]);

        return $pdf->output();
    }
}
