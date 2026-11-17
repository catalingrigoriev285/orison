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
        Schema::create('maintenances', function (Blueprint $table) {
            $table->id();
            $table->json('title');
            $table->json('description')->nullable();
            $table->timestamp('scheduled_start');
            $table->timestamp('scheduled_end');
            $table->string('status')->default('scheduled');
            $table->timestamps();
        });

        Schema::create('component_maintenance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();
            $table->foreignId('maintenance_id')->constrained()->cascadeOnDelete();

            $table->unique(['component_id', 'maintenance_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('component_maintenance');
        Schema::dropIfExists('maintenances');
    }
};
