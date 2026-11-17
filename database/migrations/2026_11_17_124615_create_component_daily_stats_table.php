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
        Schema::create('component_daily_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('uptime_percent', 6, 3)->nullable();
            $table->unsignedInteger('downtime_minutes')->default(0);
            $table->string('worst_status')->default('operational');
            $table->timestamps();

            $table->unique(['component_id', 'date']);
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {

        Schema::dropIfExists('component_daily_stats');
    }
};
