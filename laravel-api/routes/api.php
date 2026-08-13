<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomsController;
use App\Http\Controllers\FxController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/refresh', [AuthController::class, 'refresh'])->middleware('throttle:login');

// --- Authenticated (JWT + active-account check) ---
Route::middleware(['auth:api', 'jwt.active'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/2fa/enable', [AuthController::class, 'enableTotp'])->middleware('throttle:twofa');
    Route::post('/auth/2fa/confirm', [AuthController::class, 'confirmTotp'])->middleware('throttle:twofa');

    Route::get('/wallet/balances', [WalletController::class, 'balances']);
    Route::post('/wallet/transfer', [WalletController::class, 'transfer'])->middleware('idempotent');
    Route::post('/wallet/settle', [WalletController::class, 'settle'])->middleware('idempotent');

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::get('/fx/rate', [FxController::class, 'rate']);

    Route::get('/rates', [ShipmentController::class, 'rates']);
    Route::post('/shipment/create', [ShipmentController::class, 'create'])->middleware('idempotent');
    Route::post('/shipment/confirm', [ShipmentController::class, 'confirm'])->middleware('idempotent');
    Route::get('/shipment/{id}/track', [ShipmentController::class, 'track']);
    Route::get('/shipment/history', [ShipmentController::class, 'history']);

    Route::post('/customs/upload', [CustomsController::class, 'upload'])->middleware('idempotent');
    Route::get('/customs/status/{shipmentId}', [CustomsController::class, 'status']);
    Route::get('/customs/form/{shipmentId}', [CustomsController::class, 'form']);
});
