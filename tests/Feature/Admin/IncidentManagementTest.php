<?php

use App\Enums\AlertEvent;
use App\Enums\ComponentStatus;
use App\Enums\IncidentStatus;
use App\Enums\MaintenanceStatus;
use App\Jobs\SendAlertWebhook;
use App\Models\Component;
use App\Models\Incident;
use App\Models\Maintenance;
use App\Models\User;
use App\Services\Alerts\WebhookSettings;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    app(WebhookSettings::class)->store('https://example.com/hooks/status', str_repeat('s', 40));
    Queue::fake([SendAlertWebhook::class]);
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

test('publishing an incident marks the affected components and sends an alert', function () {
    $component = Component::factory()->create();

    $this->post(route('admin.incidents.store'), [
        'title' => ['ro' => 'Lecțiile nu pornesc', 'ru' => '', 'en' => 'Lessons fail to start'],
        'impact' => 'major',
        'status' => 'investigating',
        'message' => ['ro' => 'Investigăm.'],
        'components' => [['id' => $component->id, 'status' => 'partial_outage']],
    ])->assertSessionHasNoErrors();

    $incident = Incident::sole();
    expect($incident->title)->toBe(['ro' => 'Lecțiile nu pornesc', 'en' => 'Lessons fail to start'])
        ->and($incident->updates()->sole()->user_id)->toBe($this->user->id)
        ->and($component->fresh()->status)->toBe(ComponentStatus::PartialOutage);
    Queue::assertPushed(SendAlertWebhook::class, fn ($job) => $job->delivery->event === AlertEvent::IncidentCreated);
});

test('the romanian title and message are required', function () {
    $this->post(route('admin.incidents.store'), [
        'title' => ['ro' => '', 'en' => 'Only English'],
        'impact' => 'minor',
        'status' => 'investigating',
        'message' => ['ru' => 'Только русский'],
    ])->assertSessionHasErrors(['title.ro', 'message.ro']);
});

test('resolving an incident restores the components and sends a resolved alert', function () {
    $component = Component::factory()->create();
    $incident = Incident::factory()->create();
    $incident->components()->attach($component, ['component_status' => 'major_outage']);
    $incident->updates()->create(['status' => IncidentStatus::Investigating, 'message' => ['ro' => 'Investigăm.']]);
    $component->update(['status' => ComponentStatus::MajorOutage]);

    $this->post(route('admin.incidents.updates.store', $incident), [
        'status' => 'resolved',
        'message' => ['ro' => 'Totul funcționează.'],
    ])->assertSessionHasNoErrors();

    expect($incident->fresh())
        ->status->toBe(IncidentStatus::Resolved)
        ->resolved_at->not->toBeNull()
        ->and($component->fresh()->status)->toBe(ComponentStatus::Operational);
    Queue::assertPushed(SendAlertWebhook::class, fn ($job) => $job->delivery->event === AlertEvent::IncidentResolved);
});

test('the last update of an incident cannot be deleted', function () {
    $incident = Incident::factory()->create();
    $update = $incident->updates()->create(['status' => IncidentStatus::Investigating, 'message' => ['ro' => 'Unic']]);

    $this->delete(route('admin.incidents.updates.destroy', [$incident, $update]));

    expect($update->fresh())->not->toBeNull();
});

test('updates are scoped to their incident', function () {
    $incident = Incident::factory()->create();
    $other = Incident::factory()->create();
    $update = $other->updates()->create(['status' => IncidentStatus::Investigating, 'message' => ['ro' => 'Altul']]);

    $this->delete(route('admin.incidents.updates.destroy', [$incident, $update]))->assertNotFound();
});

test('scheduling maintenance announces it and puts components under maintenance when it starts', function () {
    $component = Component::factory()->create();

    $this->post(route('admin.maintenances.store'), [
        'title' => ['ro' => 'Actualizare server'],
        'scheduled_start' => now(config('status.timezone'))->addHour()->format('Y-m-d\TH:i'),
        'scheduled_end' => now(config('status.timezone'))->addHours(3)->format('Y-m-d\TH:i'),
        'components' => [$component->id],
    ])->assertSessionHasNoErrors();

    $maintenance = Maintenance::sole();
    expect($maintenance->status)->toBe(MaintenanceStatus::Scheduled)
        ->and($maintenance->scheduled_start->diffInMinutes(now()->addHour(), true))->toBeLessThan(2);
    Queue::assertPushed(SendAlertWebhook::class, fn ($job) => $job->delivery->event === AlertEvent::MaintenanceScheduled);

    $this->travel(2)->hours();
    $this->artisan('status:sync-maintenances');

    expect($maintenance->fresh()->status)->toBe(MaintenanceStatus::InProgress)
        ->and($component->fresh()->status)->toBe(ComponentStatus::UnderMaintenance);

    $this->travel(2)->hours();
    $this->artisan('status:sync-maintenances');

    expect($maintenance->fresh()->status)->toBe(MaintenanceStatus::Completed)
        ->and($component->fresh()->status)->toBe(ComponentStatus::Operational);
});

test('a maintenance window must end after it starts', function () {
    $this->post(route('admin.maintenances.store'), [
        'title' => ['ro' => 'Invers'],
        'scheduled_start' => '2026-12-01T10:00',
        'scheduled_end' => '2026-12-01T09:00',
    ])->assertSessionHasErrors('scheduled_end');
});

test('components can be created with translations and a manual status', function () {
    $this->post(route('admin.components.store'), [
        'name' => ['ro' => 'Chat', 'ru' => 'Чат', 'en' => ''],
        'description' => ['ro' => ''],
        'slug' => 'chat',
        'sort_order' => 3,
        'is_visible' => true,
        'status_override' => 'under_maintenance',
    ])->assertSessionHasNoErrors();

    expect(Component::sole())
        ->name->toBe(['ro' => 'Chat', 'ru' => 'Чат'])
        ->description->toBeNull()
        ->status->toBe(ComponentStatus::UnderMaintenance);
});

test('a test alert can be sent from the alerts page', function () {
    $this->post(route('admin.alerts.test'))->assertRedirect();

    Queue::assertPushed(SendAlertWebhook::class, fn ($job) => $job->delivery->event === AlertEvent::Test);
});
