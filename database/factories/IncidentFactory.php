<?php

namespace Database\Factories;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Models\Incident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Incident>
 */
class IncidentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => ['ro' => fake()->sentence(4)],
            'impact' => IncidentImpact::Minor,
            'status' => IncidentStatus::Investigating,
            'is_automatic' => false,
            'started_at' => now()->subHour(),
            'resolved_at' => null,
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => IncidentStatus::Resolved,
            'resolved_at' => now(),
        ]);
    }
}
