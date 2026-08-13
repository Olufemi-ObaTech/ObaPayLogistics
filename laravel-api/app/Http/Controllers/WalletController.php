<?php

namespace App\Http\Controllers;

use App\Http\Requests\MerchantSettlementRequest;
use App\Http\Requests\P2pTransferRequest;
use App\Services\WalletService;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(private readonly WalletService $walletService)
    {
    }

    public function balances(Request $request)
    {
        return $this->walletService->getBalances($request->user()->id);
    }

    public function transfer(P2pTransferRequest $request)
    {
        $data = $request->validated();
        $data['idempotencyKey'] = $request->header('Idempotency-Key');
        // callerId is derived from the verified JWT, never from the request
        // body, so a caller can never move funds out of a wallet they don't own.
        $data['callerId'] = $request->user()->id;

        return $this->walletService->p2pTransfer($data);
    }

    /**
     * Merchant settlement: payer pays a merchant (identified by userId, not a
     * raw wallet id) and ObaPay captures its 1.5% fee. The payer wallet is
     * always the caller's own wallet in the given currency — never client-supplied.
     */
    public function settle(MerchantSettlementRequest $request)
    {
        $data = $request->validated();
        $data['idempotencyKey'] = $request->header('Idempotency-Key');
        $data['callerId'] = $request->user()->id;

        return $this->walletService->merchantSettlement($data);
    }
}
