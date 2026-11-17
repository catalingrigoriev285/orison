<?php

namespace Database\Seeders;

use App\Enums\ComponentStatus;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Enums\MaintenanceStatus;
use App\Enums\MonitorState;
use App\Enums\MonitorType;
use App\Jobs\AggregateDailyStats;
use App\Models\Component;
use App\Models\ComponentGroup;
use App\Models\Incident;
use App\Models\Maintenance;
use App\Models\Monitor;
use App\Models\MonitorCheck;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Local-only sample data: a set of example services with 90 days of checks,
 * two past incidents and an upcoming maintenance window.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('The demo seeder must not run in production.');
        }

        $this->services();

        $timezone = config('status.timezone');
        $now = CarbonImmutable::now();
        $outages = [
            'realtime' => [[12, 9, 95], [40, 14, 30]],
            'api' => [[3, 20, 25]],
            'file-storage' => [[61, 11, 180]],
        ];

        Monitor::query()->with('component')->each(function (Monitor $monitor) use ($now, $outages) {
            $windows = $outages[$monitor->component->slug ?? ''] ?? [];
            $rows = [];

            for ($at = $now->subDays(89)->startOfDay(); $at->lt($now); $at = $at->addMinutes(30)) {
                $isUp = ! collect($windows)->contains(function (array $window) use ($at, $now) {
                    [$daysAgo, $hour, $minutes] = $window;
                    $start = $now->subDays($daysAgo)->setTime($hour, 0);

                    return $at->betweenIncluded($start, $start->addMinutes($minutes));
                });

                $rows[] = [
                    'monitor_id' => $monitor->id,
                    'is_up' => $isUp,
                    'response_time_ms' => $isUp ? random_int(90, 420) : null,
                    'status_code' => $isUp ? 200 : 503,
                    'error' => $isUp ? null : 'Unexpected status code 503 (expected 200)',
                    'checked_at' => $at,
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                MonitorCheck::insert($chunk);
            }

            $monitor->update([
                'interval_seconds' => 1800,
                'is_active' => true,
                'state' => MonitorState::Up,
                'last_checked_at' => $now,
                'last_response_ms' => random_int(90, 420),
            ]);
        });

        $this->incident(
            'realtime',
            12,
            ['ro' => 'Actualizările în timp real nu sosesc', 'ru' => 'Обновления в реальном времени не приходят', 'en' => 'Real-time updates are not delivered'],
            IncidentImpact::Major,
            [
                [IncidentStatus::Investigating, 0, ['ro' => 'Investigăm rapoartele despre notificări care nu sosesc.', 'ru' => 'Мы изучаем сообщения о том, что уведомления не приходят.', 'en' => 'We are investigating reports of notifications not arriving.']],
                [IncidentStatus::Identified, 35, ['ro' => 'Am identificat o problemă la serverul de websocket și aplicăm o remediere.', 'ru' => 'Мы обнаружили проблему на websocket-сервере и применяем исправление.', 'en' => 'We identified an issue with the websocket server and are applying a fix.']],
                [IncidentStatus::Resolved, 95, ['ro' => 'Actualizările în timp real funcționează normal.', 'ru' => 'Обновления в реальном времени работают в обычном режиме.', 'en' => 'Real-time updates are working normally.']],
            ],
            9,
        );

        $this->incident(
            'api',
            3,
            ['ro' => 'Răspunsuri lente ale API-ului', 'ru' => 'Медленные ответы API', 'en' => 'Slow API responses'],
            IncidentImpact::Minor,
            [
                [IncidentStatus::Investigating, 0, ['ro' => 'Unele cereri către API durează mai mult decât de obicei.', 'ru' => 'Некоторые запросы к API выполняются дольше обычного.', 'en' => 'Some API requests are taking longer than usual.']],
                [IncidentStatus::Resolved, 25, ['ro' => 'Problema a fost rezolvată.', 'ru' => 'Проблема устранена.', 'en' => 'This issue has been resolved.']],
            ],
            20,
        );

        $start = CarbonImmutable::now($timezone)->addDays(3)->setTime(22, 0);
        $maintenance = Maintenance::create([
            'title' => ['ro' => 'Actualizarea serverului de stocare', 'ru' => 'Обновление сервера хранения', 'en' => 'Storage server upgrade'],
            'description' => [
                'ro' => 'Încărcarea și descărcarea fișierelor pot fi indisponibile pentru scurt timp.',
                'ru' => 'Загрузка и скачивание файлов могут быть кратковременно недоступны.',
                'en' => 'File uploads and downloads may be briefly unavailable.',
            ],
            'scheduled_start' => $start->utc(),
            'scheduled_end' => $start->addHours(2)->utc(),
            'status' => MaintenanceStatus::Scheduled,
        ]);
        $maintenance->components()->sync(Component::query()->where('slug', 'file-storage')->pluck('id'));

        for ($daysAgo = 89; $daysAgo >= 1; $daysAgo--) {
            AggregateDailyStats::dispatchSync(CarbonImmutable::now($timezone)->subDays($daysAgo)->toDateString());
        }
    }

    /**
     * Example services, one monitor each. Replace them with your own in the admin panel.
     */
    private function services(): void
    {
        $apps = ComponentGroup::firstOrCreate(
            ['sort_order' => 1],
            ['name' => ['ro' => 'Aplicații', 'ru' => 'Приложения', 'en' => 'Applications']],
        );

        $infrastructure = ComponentGroup::firstOrCreate(
            ['sort_order' => 2],
            ['name' => ['ro' => 'Infrastructură', 'ru' => 'Инфраструктура', 'en' => 'Infrastructure']],
        );

        $definitions = [
            [$apps, 'website', ['ro' => 'Site web', 'ru' => 'Веб-сайт', 'en' => 'Website'], ['ro' => 'Site-ul public', 'ru' => 'Публичный сайт', 'en' => 'The public website'], ['type' => MonitorType::Http, 'url' => 'https://example.com']],
            [$apps, 'web-app', ['ro' => 'Aplicația web', 'ru' => 'Веб-приложение', 'en' => 'Web app'], ['ro' => 'Autentificare și panoul utilizatorului', 'ru' => 'Вход и личный кабинет', 'en' => 'Sign-in and user dashboard'], ['type' => MonitorType::Keyword, 'url' => 'https://example.com', 'keyword' => 'Example Domain']],
            [$apps, 'api', ['ro' => 'API', 'ru' => 'API', 'en' => 'API'], ['ro' => 'API-ul public și aplicațiile mobile', 'ru' => 'Публичный API и мобильные приложения', 'en' => 'Public API and mobile apps'], ['type' => MonitorType::Http, 'url' => 'https://example.com/api', 'expected_status' => 404]],
            [$infrastructure, 'realtime', ['ro' => 'Timp real', 'ru' => 'Реальное время', 'en' => 'Real-time'], ['ro' => 'Notificări și mesaje în timp real', 'ru' => 'Уведомления и сообщения в реальном времени', 'en' => 'Live notifications and messaging'], ['type' => MonitorType::Tcp, 'host' => 'example.com', 'port' => 443]],
            [$infrastructure, 'file-storage', ['ro' => 'Stocare fișiere', 'ru' => 'Хранилище файлов', 'en' => 'File storage'], ['ro' => 'Încărcări și descărcări', 'ru' => 'Загрузка и скачивание файлов', 'en' => 'Uploads and downloads'], ['type' => MonitorType::Http, 'url' => 'https://example.org']],
            [$infrastructure, 'background-jobs', ['ro' => 'Sarcini programate', 'ru' => 'Фоновые задачи', 'en' => 'Background jobs'], ['ro' => 'E-mailuri, notificări și sincronizări', 'ru' => 'Письма, уведомления и синхронизация', 'en' => 'Emails, notifications and syncing'], ['type' => MonitorType::Heartbeat, 'interval_seconds' => 300]],
        ];

        foreach ($definitions as $index => [$group, $slug, $name, $description, $monitor]) {
            $component = Component::firstOrCreate(['slug' => $slug], [
                'component_group_id' => $group->id,
                'name' => $name,
                'description' => $description,
                'sort_order' => $index + 1,
            ]);

            if ($component->monitors()->doesntExist()) {
                $component->monitors()->create([
                    'name' => $name['en'],
                    'method' => 'GET',
                    'expected_status' => 200,
                    ...$monitor,
                    'heartbeat_token' => $monitor['type'] === MonitorType::Heartbeat ? Str::random(40) : null,
                ]);
            }
        }
    }

    /**
     * @param  array<string, string>  $title
     * @param  non-empty-list<array{0: IncidentStatus, 1: int, 2: array<string, string>}>  $updates
     */
    private function incident(string $slug, int $daysAgo, array $title, IncidentImpact $impact, array $updates, int $hour): void
    {
        $startedAt = CarbonImmutable::now()->subDays($daysAgo)->setTime($hour, 0);
        $lastOffset = max(array_column($updates, 1));

        $incident = Incident::create([
            'title' => $title,
            'impact' => $impact,
            'status' => IncidentStatus::Resolved,
            'started_at' => $startedAt,
            'resolved_at' => $startedAt->addMinutes($lastOffset),
        ]);

        $incident->components()->sync(
            Component::query()->where('slug', $slug)->pluck('id')
                ->mapWithKeys(fn (int $id) => [$id => ['component_status' => $impact === IncidentImpact::Major ? ComponentStatus::PartialOutage->value : ComponentStatus::DegradedPerformance->value]])
                ->all(),
        );

        foreach ($updates as [$status, $offset, $message]) {
            $incident->updates()->create([
                'status' => $status,
                'message' => $message,
                'created_at' => $startedAt->addMinutes($offset),
            ]);
        }
    }
}
