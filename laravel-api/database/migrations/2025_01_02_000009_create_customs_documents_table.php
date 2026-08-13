<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customs_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('shipment_id');
            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
            $table->string('document_type'); // INVOICE | PACKING_LIST | CERTIFICATE_OF_ORIGIN | ID_DOCUMENT | OTHER
            $table->string('file_url');
            $table->string('verification_status')->default('PENDING'); // PENDING | VERIFIED | REJECTED
            $table->timestamp('uploaded_at')->useCurrent();
            $table->timestamp('verified_at')->nullable();
            $table->string('rejection_reason')->nullable();

            $table->index('shipment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customs_documents');
    }
};
