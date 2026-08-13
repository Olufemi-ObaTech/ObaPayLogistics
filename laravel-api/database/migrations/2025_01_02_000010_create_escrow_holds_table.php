<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Escrow: funds move out of the wallet's spendable balance into held_balance
        // the moment a shipment is paid for, and are only released to the (simulated)
        // courier settlement once the shipment is DELIVERED. If a shipment is
        // RETURNED/CANCELLED pre-pickup, the hold is released back to the user instead.
        Schema::create('escrow_holds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shipment_id')->unique();
            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->uuid('wallet_id');
            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
            $table->decimal('amount', 20, 4);
            $table->string('currency', 3);
            $table->string('status')->default('HELD'); // HELD | RELEASED_TO_COURIER | REFUNDED_TO_USER
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escrow_holds');
    }
};
