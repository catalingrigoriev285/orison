<?php

namespace Database\Factories;

use App\Enums\ComponentStatus;
use App\Models\Component;
use App\Models\ComponentDailyStat;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ComponentDailyStat>
 */
class ComponentDailyStatFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'component_id' => Component::factory(),
            'date' => now()->toDateString(),
            'uptime_percent' => 100,
            'downtime_minutes' => 0,
            'worst_status' => ComponentStatus::Operational,
        ];
    }
}
