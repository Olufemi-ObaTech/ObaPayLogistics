<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('phone')->unique();
            $table->string('password_hash');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('country', 2); // ISO 3166-1 alpha-2
            $table->string('preferred_currency', 3)->default('USD');
            $table->string('kyc_tier')->default('TIER_1'); // TIER_1 | TIER_2 | TIER_3
            $table->string('status')->default('PENDING_VERIFICATION'); // ACTIVE | SUSPENDED | PENDING_VERIFICATION | CLOSED

            $table->text('totp_secret')->nullable();
            $table->boolean('totp_enabled')->default(false);

            $table->string('business_name')->nullable();
            $table->string('business_reg_number')->nullable();

            $table->timestamps();
            $table->index('country');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
