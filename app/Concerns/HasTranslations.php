<?php

namespace App\Concerns;

/**
 * Stores user-facing copy as JSON maps of locale => text ({"ro": "...", "ru": "...", "en": "..."})
 * and reads them back in the active locale, falling back to the default locale.
 */
trait HasTranslations
{
    /**
     * Read a translatable attribute in the given (or current) locale.
     */
    public function translate(string $attribute, ?string $locale = null): ?string
    {
        /** @var array<string, string|null>|null $values */
        $values = $this->getAttribute($attribute);

        if (! is_array($values) || $values === []) {
            return null;
        }

        $locale ??= app()->getLocale();
        $fallback = config('status.default_locale', 'ro');

        foreach ([$locale, $fallback] as $candidate) {
            if (filled($values[$candidate] ?? null)) {
                return $values[$candidate];
            }
        }

        foreach ($values as $value) {
            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }
}
