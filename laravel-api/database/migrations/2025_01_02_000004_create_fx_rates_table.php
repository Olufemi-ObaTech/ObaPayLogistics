<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fx_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('base_currency', 3);
            $table->string('quote_currency', 3);
            $table->decimal('rate', 20, 8); // 1 base = rate * quote (mid-market)
            $table->decimal('spread_pct', 5, 2)->default(0.5);
            $table->string('source')->default('internal');
            $table->timestamp('fetched_at')->useCurrent();

            $table->unique(['base_currency', 'quote_currency']);
            $table->index('fetched_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fx_rates');
    }
};
