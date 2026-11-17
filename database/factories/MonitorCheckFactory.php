<?php

namespace Database\Factories;

use App\Models\Monitor;
use App\Models\MonitorCheck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MonitorCheck>
 */
class MonitorCheckFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'monitor_id' => Monitor::factory(),
            'is_up' => true,
            'response_time_ms' => fake()->numberBetween(80, 600),
            'status_code' => 200,
            'error' => null,
            'checked_at' => now(),
        ];
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_up' => false,
            'status_code' => 503,
            'error' => 'Unexpected status code 503',
        ]);
    }
}
