<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Brand
    |--------------------------------------------------------------------------
    |
    | The name shown in the status page header and browser title, and an
    | optional link back to your main website in the footer. These are only
    | defaults: everything here can be changed under Admin → Settings.
    |
    */

    'brand' => [
        'name' => env('STATUS_BRAND_NAME', 'Orison'),
        'description' => null,
        'website_url' => env('STATUS_WEBSITE_URL'),
        'logo' => null,
        'favicon' => null,
        'accent_color' => '#0071e3',
        'scene' => 'factory',
    ],

    /*
    |--------------------------------------------------------------------------
    | Locales
    |--------------------------------------------------------------------------
    |
    | Languages offered on the status page, in the order they appear in the
    | language switcher. The first one is the default and the fallback for
    | any incident or component text that has not been translated.
    |
    */

    'locales' => ['ro', 'ru', 'en'],

    'default_locale' => 'ro',

    /*
    |--------------------------------------------------------------------------
    | Display timezone
    |--------------------------------------------------------------------------
    |
    | Everything is stored in UTC. Days on the uptime bars and dates on the
    | page are cut and shown in this timezone.
    |
    */

    'timezone' => env('STATUS_TIMEZONE', 'Europe/Chisinau'),

    /*
    |--------------------------------------------------------------------------
    | Uptime history
    |--------------------------------------------------------------------------
    */

    'history_days' => 90,

    'check_retention_days' => 90,

    /*
    | A heartbeat monitor is marked down when no ping arrived within its
    | interval plus this grace period.
    */

    'heartbeat_grace_seconds' => 60,

    /*
    | A component is "degraded" when its latest response time is this many
    | times slower than the monitor's 24 hour average.
    */

    'degraded_response_multiplier' => 3,

    'degraded_response_min_ms' => 1500,

    /*
    |--------------------------------------------------------------------------
    | Alert webhook
    |--------------------------------------------------------------------------
    |
    | Every alert is POSTed as JSON to the webhook URL set on Admin → Alerts
    | (your own application or an automation tool), which decides who gets
    | notified and how. The URL and the signing secret are stored in the
    | settings table (App\Services\Alerts\WebhookSettings), not in .env.
    |
    | Headers sent with every request:
    |   X-Status-Event      e.g. "monitor.down"
    |   X-Status-Delivery   UUID, identical across retries of the same alert
    |   X-Status-Timestamp  Unix timestamp of this attempt
    |   X-Status-Signature  "sha256=" . hash_hmac('sha256', "{timestamp}.{raw body}", secret)
    |
    | The receiver should recompute the signature, compare it with
    | hash_equals(), reject timestamps older than ~5 minutes and treat the
    | delivery UUID as an idempotency key. Respond with any 2xx status;
    | anything else is retried with backoff (10s, 1m, 5m, 15m).
    |
    | Events: monitor.down, monitor.up, incident.created, incident.updated,
    | incident.resolved, maintenance.scheduled, maintenance.started,
    | maintenance.completed, test.
    |
    */

    'webhook' => [
        'timeout' => (int) env('STATUS_WEBHOOK_TIMEOUT', 10),
    ],

];
