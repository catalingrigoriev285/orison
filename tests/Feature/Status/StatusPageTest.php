<?php

use App\Enums\ComponentStatus;
use App\Enums\IncidentStatus;
use App\Models\Component;
use App\Models\ComponentDailyStat;
use App\Models\Incident;
use App\Models\Maintenance;
use Inertia\Testing\AssertableInertia as Assert;

test('the status page shows visible components with their uptime history', function () {
    $component = Component::factory()->create(['name' => ['ro' => 'Platforma', 'ru' => 'Платформа']]);
    Component::factory()->hidden()->create();
    ComponentDailyStat::factory()->for($component)->create([
        'date' => now(config('status.timezone'))->subDays(2)->toDateString(),
        'uptime_percent' => 97.5,
        'worst_status' => ComponentStatus::PartialOutage,
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('status/index')
            ->where('overall', 'operational')
            ->has('groups', 1)
            ->has('groups.0.components', 1)
            ->where('groups.0.components.0.name', 'Platforma')
            ->has('groups.0.components.0.days', 90)
            ->where('groups.0.components.0.days.87.status', 'partial_outage')
            ->where('groups.0.components.0.days.0.status', null),
        );
});

test('the overall status is the worst visible component status', function () {
    Component::factory()->create(['status' => ComponentStatus::DegradedPerformance]);
    Component::factory()->create(['status' => ComponentStatus::MajorOutage]);
    Component::factory()->hidden()->create(['status' => ComponentStatus::MajorOutage]);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('overall', 'major_outage'));
});

test('open incidents and maintenance appear at the top of the status page', function () {
    $incident = Incident::factory()->create(['title' => ['ro' => 'Lecțiile nu pornesc']]);
    $incident->updates()->create(['status' => IncidentStatus::Investigating, 'message' => ['ro' => 'Investigăm.']]);
    Incident::factory()->resolved()->create();
    Maintenance::factory()->inProgress()->create();
    Maintenance::factory()->create();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('activeIncidents', 1)
            ->where('activeIncidents.0.title', 'Lecțiile nu pornesc')
            ->where('activeIncidents.0.updates.0.message', 'Investigăm.')
            ->has('activeMaintenances', 1)
            ->has('upcomingMaintenances', 1)
            ->has('pastDays', 14),
        );
});

test('text is shown in the chosen language and falls back to Romanian', function () {
    Component::factory()->create(['name' => ['ro' => 'Site web', 'ru' => 'Веб-сайт']]);

    $this->get(route('home', ['lang' => 'ru']))
        ->assertCookie('locale', 'ru', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale', 'ru')
            ->where('groups.0.components.0.name', 'Веб-сайт')
            ->where('translations.All systems operational', 'Все системы работают'),
        );

    $this->withUnencryptedCookie('locale', 'en')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale', 'en')
            ->where('groups.0.components.0.name', 'Site web'),
        );
});

test('romanian is the default language', function () {
    $this->get(route('home'), ['Accept-Language' => 'de-DE'])
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'ro'));
});

test('an unsupported language is ignored', function () {
    $this->get(route('home', ['lang' => 'de']), ['Accept-Language' => 'de-DE'])
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'ro'));
});

test('an incident has a public page with its timeline', function () {
    $incident = Incident::factory()->resolved()->create();
    $incident->updates()->create(['status' => IncidentStatus::Investigating, 'message' => ['ro' => 'Primul'], 'created_at' => now()->subHour()]);
    $incident->updates()->create(['status' => IncidentStatus::Resolved, 'message' => ['ro' => 'Rezolvat']]);

    $this->get(route('status.incident', $incident))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('status/incident')
            ->has('incident.updates', 2)
            ->where('incident.updates.0.message', 'Rezolvat'),
        );
});

test('the history page lists resolved incidents newest first', function () {
    Incident::factory()->resolved()->create(['started_at' => now()->subDays(40), 'title' => ['ro' => 'Vechi']]);
    Incident::factory()->resolved()->create(['started_at' => now()->subDay(), 'title' => ['ro' => 'Recent']]);
    Incident::factory()->create();

    $this->get(route('status.history'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('status/history')
            ->has('incidents.data', 2)
            ->where('incidents.data.0.title', 'Recent'),
        );
});

test('the json summary describes components and open incidents', function () {
    Component::factory()->create(['slug' => 'platform', 'status' => ComponentStatus::PartialOutage]);
    Incident::factory()->create(['title' => ['ro' => 'Probleme', 'en' => 'Problems']]);

    $this->getJson(route('api.status'))
        ->assertOk()
        ->assertJsonPath('status', 'partial_outage')
        ->assertJsonPath('components.0.slug', 'platform')
        ->assertJsonPath('incidents.0.title.en', 'Problems')
        ->assertJsonStructure(['page_url', 'maintenances', 'generated_at']);
});

test('the brand name and website are configurable', function () {
    config(['status.brand' => ['name' => 'Acme Cloud', 'website_url' => 'https://acme.test']]);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('brand.name', 'Acme Cloud')
            ->where('brand.website_url', 'https://acme.test'),
        );
});

test('pages render in light mode unless dark was chosen', function () {
    $this->get(route('home'))->assertDontSee('class="dark"', false);

    $this->withUnencryptedCookie('appearance', 'dark')
        ->get(route('home'))
        ->assertSee('class="dark"', false);
});
