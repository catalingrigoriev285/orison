# Orison

A self-hosted status page with built-in uptime monitoring. Visitors get one simple public page showing whether your services are up, what is being worked on and what is planned. You get an admin panel to run the monitors, post incidents and schedule maintenance.

Orison is not tied to any product: the name, logo, colours, languages and header illustration are all set from the admin panel.

## Features

**Public status page**

- Overall status bar, component groups and 90-day uptime bars
- Active incidents with a timeline of updates, plus past incidents
- Scheduled maintenance shown at the top of the page
- Romanian, Russian and English, with a language switcher
- Light and dark theme
- An illustrated header scene whose lights follow the current status: Control room, Data centre, City skyline, Space mission, or Seasons (changes with the calendar month)
- JSON summary at `GET /api/status`

**Admin panel** (`/admin`)

- Monitors: HTTP, keyword, TCP port and heartbeat (for cron jobs and workers)
- Response-time charts and check history
- Components that take their status from monitors or are set by hand
- Incidents and maintenance windows, with text in each language
- Alerts sent as a signed webhook to your own application
- Settings: name, description, logo, favicon, accent colour, header scene, default language and timezone
- Two-factor authentication and passkeys; public registration is disabled

## Requirements

- PHP 8.3 or newer
- Composer
- Node.js 20 or newer
- SQLite, MySQL or PostgreSQL

## Installation

```bash
git clone <your-repository-url> orison
cd orison
composer setup
php artisan status:create-admin you@example.com
```

`composer setup` installs the dependencies, creates `.env`, generates the app key, runs the migrations and builds the frontend. SQLite is the default database; change the `DB_*` values in `.env` before running it if you want another one.

To fill the page with example components, monitors and incidents:

```bash
php artisan db:seed --class=DemoSeeder
```

## Running

For local development, one command starts the web server, queue worker and Vite:

```bash
composer dev
```

In production, two background processes must be running, otherwise no checks are made and no alerts are sent:

```bash
# cron entry: runs the scheduler every minute
* * * * * cd /path/to/orison && php artisan schedule:run >> /dev/null 2>&1

# queue worker (keep it alive with Supervisor or systemd)
php artisan queue:work
```

## Configuration

Most things are edited in **Admin → Settings**. The `.env` values below are only starting defaults or things that have no place in the panel.

| Variable | Purpose |
|---|---|
| `STATUS_BRAND_NAME` | Default name shown in the header |
| `STATUS_WEBSITE_URL` | Default link back to your main website |
| `STATUS_TIMEZONE` | Default display timezone (data is stored in UTC) |
| `STATUS_WEBHOOK_URL` | Where alerts are sent |
| `STATUS_WEBHOOK_SECRET` | Secret used to sign alerts |

Further options, such as how many days of history to keep, are in [config/status.php](config/status.php).

## Alert webhook

Every alert is sent as a JSON `POST` to `STATUS_WEBHOOK_URL`. Your application decides who to notify and how.

Events: `monitor.down`, `monitor.up`, `incident.created`, `incident.updated`, `incident.resolved`, `maintenance.scheduled`, `maintenance.started`, `maintenance.completed`, `test`.

| Header | Value |
|---|---|
| `X-Status-Event` | Event name, for example `monitor.down` |
| `X-Status-Delivery` | UUID, the same across retries of one alert |
| `X-Status-Timestamp` | Unix timestamp of this attempt |
| `X-Status-Signature` | `sha256=` followed by the HMAC of `"{timestamp}.{raw body}"` |

Verifying a request in PHP:

```php
$timestamp = $request->header('X-Status-Timestamp');
$expected = 'sha256='.hash_hmac('sha256', $timestamp.'.'.$request->getContent(), $secret);

abort_unless(hash_equals($expected, (string) $request->header('X-Status-Signature')), 401);
abort_if(abs(time() - (int) $timestamp) > 300, 401);
```

Reply with any `2xx` status. Anything else is retried after 10 seconds, 1 minute, 5 minutes and 15 minutes. Use the delivery UUID to ignore duplicates. You can send a test alert from **Admin → Alerts**.

## Heartbeat monitors

A heartbeat monitor waits for your job to call in. Create one in the admin panel, then request its URL at the end of each run:

```bash
curl -fsS https://status.example.com/api/heartbeat/<token>
```

If no call arrives within the monitor's interval plus a 60-second grace period, the monitor is marked as down.

## Useful commands

| Command | What it does |
|---|---|
| `php artisan status:create-admin <email>` | Create an administrator |
| `php artisan status:aggregate --days=90` | Rebuild the daily uptime figures |
| `composer test` | Code style, static analysis and tests |
| `npm run check` | Frontend lint and formatting |

## Tech stack

Laravel 13, Inertia with React 19, Tailwind CSS 4, Laravel Fortify, Pest and PHPStan.

## License

MIT
