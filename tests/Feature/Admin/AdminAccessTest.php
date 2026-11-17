<?php

use App\Models\User;

test('guests are redirected from the admin panel', function (string $route) {
    $this->get(route($route))->assertRedirect(route('login'));
})->with([
    'admin.overview',
    'admin.monitors.index',
    'admin.components.index',
    'admin.incidents.index',
    'admin.maintenances.index',
    'admin.alerts.index',
]);

test('administrators can open every admin section', function (string $route, string $component) {
    $this->actingAs(User::factory()->create())
        ->get(route($route))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['admin.overview', 'admin/overview'],
    ['admin.monitors.index', 'admin/monitors/index'],
    ['admin.monitors.create', 'admin/monitors/form'],
    ['admin.components.index', 'admin/components/index'],
    ['admin.incidents.index', 'admin/incidents/index'],
    ['admin.incidents.create', 'admin/incidents/create'],
    ['admin.maintenances.index', 'admin/maintenances/index'],
    ['admin.alerts.index', 'admin/alerts/index'],
]);

test('unverified users cannot open the admin panel', function () {
    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('admin.overview'))
        ->assertRedirect(route('verification.notice'));
});

test('public registration is disabled', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', [
        'name' => 'Intruder',
        'email' => 'intruder@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
});

test('an administrator can be created from the command line', function () {
    $this->artisan('status:create-admin', ['email' => 'admin@example.com', '--name' => 'Admin'])
        ->expectsQuestion('Password', 'a-long-password')
        ->assertSuccessful();

    $user = User::sole();
    expect($user->email)->toBe('admin@example.com')
        ->and($user->hasVerifiedEmail())->toBeTrue();
});
