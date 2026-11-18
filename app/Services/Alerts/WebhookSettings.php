<?php

namespace App\Services\Alerts;

use App\Models\Setting;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

/**
 * Where alerts are POSTed and the secret that signs them, edited on
 * Admin → Alerts and stored in the settings table (not .env).
 *
 * Read at the moment of use rather than copied into config at boot: the
 * queue worker that sends the webhook is a long-running process, and a
 * secret regenerated in the panel must be used by the very next attempt.
 */
class WebhookSettings
{
    public const URL = 'webhook_url';

    public const SECRET = 'webhook_secret';

    public function url(): ?string
    {
        return $this->value(self::URL);
    }

    public function secret(): ?string
    {
        return $this->value(self::SECRET);
    }

    public function store(?string $url, ?string $secret): void
    {
        Setting::store([
            self::URL => filled($url) ? trim($url) : null,
            self::SECRET => filled($secret) ? trim($secret) : null,
        ]);
    }

    /**
     * A new random signing secret (64 characters).
     */
    public static function generateSecret(): string
    {
        return Str::random(64);
    }

    private function value(string $key): ?string
    {
        try {
            $value = Setting::cached()[$key] ?? null;
        } catch (QueryException) {
            return null; // Not migrated yet.
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}
