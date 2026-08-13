<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $walletIds = Wallet::query()->where('user_id', $request->user()->id)->pluck('id');

        return Transaction::query()
            ->whereIn('source_wallet_id', $walletIds)
            ->orWhereIn('destination_wallet_id', $walletIds)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();
    }
}
