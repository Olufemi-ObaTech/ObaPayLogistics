<?php

namespace App\Http\Controllers;

use App\Http\Requests\AirtimeRequest;
use App\Http\Requests\BuyDataRequest;
use App\Services\AirtimeService;
use Illuminate\Http\Request;

class AirtimeController extends Controller
{
    public function __construct(private readonly AirtimeService $airtime)
    {
    }

    public function networks()
    {
        return AirtimeService::NETWORKS;
    }

    public function dataBundles()
    {
        return AirtimeService::DATA_BUNDLES;
    }

    public function buyAirtime(AirtimeRequest $request)
    {
        $data = $request->validated();
        $data['callerId'] = $request->user()->id;
        $data['idempotencyKey'] = $request->header('Idempotency-Key');

        return $this->airtime->buyAirtime($data);
    }

    public function sellAirtime(AirtimeRequest $request)
    {
        $data = $request->validated();
        $data['callerId'] = $request->user()->id;
        $data['idempotencyKey'] = $request->header('Idempotency-Key');

        return $this->airtime->sellAirtime($data);
    }

    public function buyData(BuyDataRequest $request)
    {
        $data = $request->validated();
        $data['callerId'] = $request->user()->id;
        $data['idempotencyKey'] = $request->header('Idempotency-Key');

        return $this->airtime->buyData($data);
    }
}
