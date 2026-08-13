<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_partners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique(); // DHL | ARAMEX | SENDY
            $table->string('name');
            $table->string('api_endpoint');
            // NOTE: plaintext for MVP parity with the mock integration. In a real
            // deployment this belongs in a secrets manager, not a DB column.
            $table->string('api_key');
            $table->json('supported_countries'); // string[] ISO2
            $table->json('supported_methods'); // ShippingMethod[]
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courier_partners');
    }
};
