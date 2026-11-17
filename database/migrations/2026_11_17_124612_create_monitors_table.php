<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('monitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('component_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('type');
            $table->string('url')->nullable();
            $table->string('host')->nullable();
            $table->unsignedInteger('port')->nullable();
            $table->string('method')->default('GET');
            $table->unsignedSmallInteger('expected_status')->default(200);
            $table->string('keyword')->nullable();
            $table->string('heartbeat_token', 64)->nullable()->unique();
            $table->unsignedInteger('interval_seconds')->default(60);
            $table->unsignedInteger('timeout_seconds')->default(10);
            $table->unsignedInteger('failure_threshold')->default(2);
            $table->boolean('is_active')->default(true);
            $table->string('state')->default('pending');
            $table->unsignedInteger('consecutive_failures')->default(0);
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('state_changed_at')->nullable();
            $table->unsignedInteger('last_response_ms')->nullable();
            $table->text('last_error')->nullable();
            $table->boolean('notify')->default(true);
            $table->boolean('auto_incident')->default(false);
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

        Schema::dropIfExists('monitors');
    }
};
