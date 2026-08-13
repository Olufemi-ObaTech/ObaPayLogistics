<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type'); // P2P_TRANSFER | BILL_PAYMENT | MERCHANT_SETTLEMENT | FX_CONVERSION | SHIPPING_PAYMENT | SHIPPING_REFUND | WALLET_TOPUP | WALLET_WITHDRAWAL
            $table->string('status')->default('PENDING'); // PENDING | COMPLETED | FAILED | REVERSED
            $table->decimal('amount', 20, 4);
            $table->string('currency', 3);
            $table->decimal('fee_amount', 20, 4)->default(0);
            $table->decimal('fx_spread_amount', 20, 4)->default(0);

            $table->uuid('source_wallet_id')->nullable();
            $table->foreign('source_wallet_id')->references('id')->on('wallets')->nullOnDelete();
            $table->uuid('destination_wallet_id')->nullable();
            $table->foreign('destination_wallet_id')->references('id')->on('wallets')->nullOnDelete();

            // Idempotency: caller-supplied key, unique per logical operation, so
            // retried requests (common on unreliable mobile networks) never
            // double-charge a wallet.
            $table->string('idempotency_key')->unique();

            $table->uuid('shipment_id')->nullable();
            $table->foreign('shipment_id')->references('id')->on('shipments')->nullOnDelete();

            $table->uuid('reference')->unique();
            $table->string('narration')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index('shipment_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
