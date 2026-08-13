<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('currency', 3); // ISO 4217: NGN, KES, ZAR, GHS, USD, EUR, XOF, EGP
            $table->decimal('balance', 20, 4)->default(0);
            // Funds committed to in-flight shipments (escrow) — not spendable, not yet paid to courier.
            $table->decimal('held_balance', 20, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'currency']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
