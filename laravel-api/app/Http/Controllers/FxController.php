<?php

namespace App\Http\Controllers;

use App\Services\FxService;
use Illuminate\Http\Request;

class FxController extends Controller
{
    public function __construct(private readonly FxService $fx)
    {
    }

    public function rate(Request $request)
    {
        $request->validate(['base' => ['required', 'string'], 'quote' => ['required', 'string']]);
        $base = $request->query('base');
        $quote = $request->query('quote');

        return ['base' => $base, 'quote' => $quote, 'midMarketRate' => $this->fx->getMidMarketRate($base, $quote)];
    }
}
