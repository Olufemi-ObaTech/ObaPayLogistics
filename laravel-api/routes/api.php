<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AirtimeController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CryptoController;
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
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/2fa/enable', [AuthController::class, 'enableTotp'])->middleware('throttle:twofa');
    Route::post('/auth/2fa/confirm', [AuthController::class, 'confirmTotp'])->middleware('throttle:twofa');

    Route::get('/wallet/balances', [WalletController::class, 'balances']);
    Route::post('/wallet/transfer', [WalletController::class, 'transfer'])->middleware('idempotent');
    Route::post('/wallet/send', [WalletController::class, 'send'])->middleware('idempotent');
    Route::post('/wallet/settle', [WalletController::class, 'settle'])->middleware('idempotent');

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::get('/fx/rate', [FxController::class, 'rate']);

    Route::get('/rates', [ShipmentController::class, 'rates']);
    Route::post('/shipment/create', [ShipmentController::class, 'create'])->middleware('idempotent');
    Route::post('/shipment/confirm', [ShipmentController::class, 'confirm'])->middleware('idempotent');
    Route::get('/shipment/{id}/track', [ShipmentController::class, 'track']);
    Route::get('/shipment/history', [ShipmentController::class, 'history']);

    Route::get('/airtime/networks', [AirtimeController::class, 'networks']);
    Route::get('/airtime/data-bundles', [AirtimeController::class, 'dataBundles']);
    Route::post('/airtime/buy', [AirtimeController::class, 'buyAirtime'])->middleware('idempotent');
    Route::post('/airtime/sell', [AirtimeController::class, 'sellAirtime'])->middleware('idempotent');
    Route::post('/airtime/buy-data', [AirtimeController::class, 'buyData'])->middleware('idempotent');

    Route::get('/crypto/prices', [CryptoController::class, 'prices']);
    Route::get('/crypto/holdings', [CryptoController::class, 'holdings']);
    Route::post('/crypto/buy', [CryptoController::class, 'buy'])->middleware('idempotent');
    Route::post('/crypto/sell', [CryptoController::class, 'sell'])->middleware('idempotent');

    Route::post('/customs/upload', [CustomsController::class, 'upload'])->middleware('idempotent');
    Route::get('/customs/status/{shipmentId}', [CustomsController::class, 'status']);
    Route::get('/customs/form/{shipmentId}', [CustomsController::class, 'form']);

    // --- Admin / ops (ADMIN or SUPERADMIN) ---
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{id}', [AdminController::class, 'showUser']);
        Route::patch('/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::get('/transactions', [AdminController::class, 'transactions']);
        Route::get('/shipments', [AdminController::class, 'shipments']);
        Route::get('/fx-rates', [AdminController::class, 'fxRates']);
        Route::post('/fx-rates', [AdminController::class, 'upsertFxRate']);

        // --- Super admin only: manage who is staff ---
        Route::middleware('superadmin')->group(function () {
            Route::get('/team', [AdminController::class, 'team']);
            Route::post('/team/{id}/promote', [AdminController::class, 'promote']);
            Route::post('/team/{id}/demote', [AdminController::class, 'demote']);
        });
    });
});
