<?php

namespace App\Concerns;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

trait TranslatableRules
{
    /**
     * Rules for a {ro, ru, en} field. Only the default locale may be required.
     *
     * @return array<string, array<int, string>>
     */
    protected function translatable(string $field, bool $required = true, int $max = 255): array
    {
        $rules = [$field => [$required ? 'required' : 'nullable', 'array']];

        foreach (config('status.locales') as $locale) {
            $rules["{$field}.{$locale}"] = [
                $required && $locale === config('status.default_locale') ? 'required' : 'nullable',
                'string',
                "max:{$max}",
            ];
        }

        return $rules;
    }

    /**
     * The validated {ro, ru, en} map, dropping empty translations.
     *
     * @return array<string, string>|null
     */
    public function translations(string $field): ?array
    {
        $values = array_filter(
            (array) $this->validated($field, []),
            fn (mixed $value, string $locale) => in_array($locale, config('status.locales'), true) && filled($value),
            ARRAY_FILTER_USE_BOTH,
        );

        return $values === [] ? null : $values;
    }

    /**
     * Parse a datetime-local value entered in the status page timezone.
     */
    public function localDate(string $field): ?CarbonInterface
    {
        $value = $this->validated($field);

        return filled($value) ? Date::parse($value, config('status.timezone'))->utc() : null;
    }
}
