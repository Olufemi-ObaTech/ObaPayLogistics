<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadCustomsDocumentRequest;
use App\Services\CustomsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class CustomsController extends Controller
{
    public function __construct(private readonly CustomsService $customsService)
    {
    }

    public function upload(UploadCustomsDocumentRequest $request)
    {
        return $this->customsService->uploadDocument($request->user()->id, $request->validated());
    }

    public function status(Request $request, string $shipmentId)
    {
        return $this->customsService->getStatus($shipmentId, $request->user()->id);
    }

    public function form(Request $request, string $shipmentId)
    {
        $pdf = $this->customsService->generateCustomsForm($shipmentId, $request->user()->id);

        return Response::make($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"customs-{$shipmentId}.pdf\"",
        ]);
    }
}
