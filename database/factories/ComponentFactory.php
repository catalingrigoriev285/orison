<?php

namespace Database\Factories;

use App\Enums\ComponentStatus;
use App\Models\Component;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Component>
 */
class ComponentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ['ro' => $name = fake()->unique()->company(), 'en' => $name],
            'description' => null,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'sort_order' => 0,
            'is_visible' => true,
            'status' => ComponentStatus::Operational,
            'status_override' => null,
        ];
    }

    public function hidden(): static
    {
        return $this->state(fn (array $attributes) => ['is_visible' => false]);
    }
}
