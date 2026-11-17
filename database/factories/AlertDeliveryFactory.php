<?php

namespace Database\Factories;

use App\Enums\AlertEvent;
use App\Models\AlertDelivery;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AlertDelivery>
 */
class AlertDeliveryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'event' => AlertEvent::Test,
            'payload' => ['event' => 'test'],
            'target_url' => 'https://example.com/hooks/status',
            'response_code' => 200,
            'attempts' => 1,
            'delivered_at' => now(),
        ];
    }
}
