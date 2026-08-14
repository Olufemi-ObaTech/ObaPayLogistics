<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Simulated crypto holdings — see CryptoService docblock: there is no
        // real exchange/custody integration, prices are a mock feed, and this
        // table exists purely so the buy/sell UX has somewhere real to persist to.
        Schema::create('crypto_holdings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('symbol', 10);
            $table->decimal('quantity', 24, 8)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crypto_holdings');
    }
};
