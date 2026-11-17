<?php

namespace Database\Factories;

use App\Enums\MonitorState;
use App\Enums\MonitorType;
use App\Models\Monitor;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Monitor>
 */
class MonitorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'component_id' => null,
            'name' => fake()->words(2, true),
            'type' => MonitorType::Http,
            'url' => 'https://'.fake()->domainName(),
            'method' => 'GET',
            'expected_status' => 200,
            'interval_seconds' => 60,
            'timeout_seconds' => 10,
            'failure_threshold' => 2,
            'is_active' => true,
            'state' => MonitorState::Up,
            'consecutive_failures' => 0,
            'notify' => true,
            'auto_incident' => false,
        ];
    }

    public function down(): static
    {
        return $this->state(fn (array $attributes) => [
            'state' => MonitorState::Down,
            'consecutive_failures' => $attributes['failure_threshold'] ?? 2,
            'state_changed_at' => now()->subMinutes(5),
        ]);
    }

    public function paused(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false, 'state' => MonitorState::Paused]);
    }

    public function heartbeat(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => MonitorType::Heartbeat,
            'url' => null,
            'heartbeat_token' => Str::random(40),
            'interval_seconds' => 300,
        ]);
    }

    public function keyword(string $keyword): static
    {
        return $this->state(fn (array $attributes) => ['type' => MonitorType::Keyword, 'keyword' => $keyword]);
    }
}
