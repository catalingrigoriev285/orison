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
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->nullable()->constrained()->nullOnDelete();
            $table->json('title');
            $table->string('impact')->default('minor');
            $table->string('status')->default('investigating');
            $table->boolean('is_automatic')->default(false);
            $table->timestamp('started_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('started_at');
        });

        Schema::create('component_incident', function (Blueprint $table) {
            $table->id();
            $table->foreignId('component_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incident_id')->constrained()->cascadeOnDelete();
            $table->string('component_status')->default('partial_outage');

            $table->unique(['component_id', 'incident_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('component_incident');
        Schema::dropIfExists('incidents');
    }
};
