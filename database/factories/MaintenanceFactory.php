<?php

namespace Database\Factories;

use App\Enums\MaintenanceStatus;
use App\Models\Maintenance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Maintenance>
 */
class MaintenanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => ['ro' => fake()->sentence(3)],
            'description' => ['ro' => fake()->sentence()],
            'scheduled_start' => now()->addDay(),
            'scheduled_end' => now()->addDay()->addHours(2),
            'status' => MaintenanceStatus::Scheduled,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'scheduled_start' => now()->subHour(),
            'scheduled_end' => now()->addHour(),
            'status' => MaintenanceStatus::InProgress,
        ]);
    }
}
