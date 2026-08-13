<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmShipmentRequest;
use App\Http\Requests\CreateShipmentRequest;
use App\Http\Requests\GetRatesRequest;
use App\Services\ShipmentService;
use Illuminate\Http\Request;

class ShipmentController extends Controller
{
    public function __construct(private readonly ShipmentService $shipmentService)
    {
    }

    /** GET /rates?originLine1=...&originCity=...&originCountry=NG&... */
    public function rates(GetRatesRequest $request)
    {
        return $this->shipmentService->getRateEstimate($request->toOrder());
    }

    public function create(CreateShipmentRequest $request)
    {
        return $this->shipmentService->createShipment($request->user()->id, $request->validated());
    }

    public function confirm(ConfirmShipmentRequest $request)
    {
        $data = $request->validated();

        return $this->shipmentService->payForShipment(
            $request->user()->id,
            $data['shipmentId'],
            $data['walletId'],
            $request->header('Idempotency-Key'),
        );
    }

    public function track(Request $request, string $id)
    {
        return $this->shipmentService->track($id, $request->user()->id);
    }

    public function history(Request $request)
    {
        return $this->shipmentService->history($request->user()->id);
    }
}
