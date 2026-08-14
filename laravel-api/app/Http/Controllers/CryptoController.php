<?php

namespace App\Http\Controllers;

use App\Http\Requests\CryptoBuyRequest;
use App\Http\Requests\CryptoSellRequest;
use App\Services\CryptoService;
use App\Services\FxService;
use Illuminate\Http\Request;

class CryptoController extends Controller
{
    public function __construct(
        private readonly CryptoService $crypto,
        private readonly FxService $fx,
    ) {
    }

    public function prices()
    {
        return $this->crypto->getPrices();
    }

    public function holdings(Request $request)
    {
        return $this->crypto->getHoldings($request->user()->id);
    }

    public function buy(CryptoBuyRequest $request)
    {
        $data = $request->validated();
        $data['callerId'] = $request->user()->id;
        $data['idempotencyKey'] = $request->header('Idempotency-Key');

        return $this->crypto->buy($data, $this->fx);
    }

    public function sell(CryptoSellRequest $request)
    {
        $data = $request->validated();
        $data['callerId'] = $request->user()->id;
        $data['idempotencyKey'] = $request->header('Idempotency-Key');

        return $this->crypto->sell($data, $this->fx);
    }
}
