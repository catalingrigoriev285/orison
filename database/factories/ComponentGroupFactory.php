<?php

namespace Database\Factories;

use App\Models\ComponentGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ComponentGroup>
 */
class ComponentGroupFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ['ro' => fake()->words(2, true)],
            'sort_order' => 0,
        ];
    }
}
