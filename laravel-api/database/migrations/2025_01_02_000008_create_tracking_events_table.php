<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracking_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shipment_id');
            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->timestamp('timestamp')->useCurrent();
            $table->string('location');
            $table->string('status'); // ShipmentStatus
            $table->string('description');
            $table->string('source')->default('internal'); // "internal" | courier partner code

            $table->index(['shipment_id', 'timestamp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracking_events');
    }
};
