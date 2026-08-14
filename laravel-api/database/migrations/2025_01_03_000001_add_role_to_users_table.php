<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // USER | ADMIN | SUPERADMIN. Plain user accounts default to USER;
            // ADMIN/SUPERADMIN are granted only via the obapay:make-admin
            // console command or by an existing SUPERADMIN through the panel.
            $table->string('role')->default('USER')->after('status');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
