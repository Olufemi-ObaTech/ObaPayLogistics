<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->json('origin_address'); // { line1, city, state, country, postalCode, lat?, lng? }
            $table->json('destination_address');

            $table->decimal('weight_kg', 10, 3);
            $table->json('dimensions_cm'); // { length, width, height }
            $table->decimal('declared_value', 20, 4);
            $table->string('declared_value_currency', 3)->default('USD');
            $table->string('customs_category'); // DOCUMENTS | GIFTS | COMMERCIAL_SAMPLE | PERSONAL_EFFECTS | ELECTRONICS | MERCHANDISE | OTHER
            $table->string('shipping_method'); // AIR | SEA | ROAD

            $table->uuid('courier_partner_id')->nullable();
            $table->foreign('courier_partner_id')->references('id')->on('courier_partners')->nullOnDelete();
            $table->decimal('quoted_rate', 20, 4)->nullable();
            $table->decimal('final_price', 20, 4)->nullable();
            $table->string('price_currency', 3)->nullable();
            $table->decimal('margin_amount', 20, 4)->nullable();

            $table->string('tracking_number')->nullable()->unique();
            $table->string('status')->default('DRAFT');
            // Set when the shipment enters CUSTOMS_CLEARANCE; a cron sweep clears
            // it once this passes rather than relying on an in-process timer.
            $table->timestamp('customs_clear_at')->nullable();

            $table->timestamps();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->index('user_id');
            $table->index('status');
            $table->index('tracking_number');
            $table->index(['status', 'customs_clear_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
