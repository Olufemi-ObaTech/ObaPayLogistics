<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shared idempotency ledger across all mutating endpoints (shipment
        // creation, payment confirmation, transfers, etc). Keeps the *response*
        // of the first successful call so retried requests get the exact same
        // result instead of re-executing side effects.
        Schema::create('idempotency_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();
            $table->uuid('user_id');
            $table->string('request_path');
            $table->json('response_body')->nullable();
            $table->integer('status_code')->nullable();
            $table->timestamp('locked_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_records');
    }
};
