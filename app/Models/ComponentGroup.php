<?php

namespace App\Models;

use App\Concerns\HasTranslations;
use Carbon\CarbonImmutable;
use Database\Factories\ComponentGroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property array<string, string|null> $name
 * @property int $sort_order
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['name', 'sort_order'])]
class ComponentGroup extends Model
{
    /** @use HasFactory<ComponentGroupFactory> */
    use HasFactory, HasTranslations;

    /**
     * @return HasMany<Component, $this>
     */
    public function components(): HasMany
    {
        return $this->hasMany(Component::class)->orderBy('sort_order');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
        ];
    }
}
