<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

test('guests are redirected from the admin panel', function (string $route) {
    $this->get(route($route))->assertRedirect(route('login'));
})->with([
    'admin.overview',
    'admin.monitors.index',
    'admin.components.index',
    'admin.incidents.index',
    'admin.maintenances.index',
    'admin.alerts.index',
    'admin.queue.index',
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
    ['admin.queue.index', 'admin/queue/index'],
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

function createAdminFromStdin(string $email, string $stdin): int
{
    $stream = fopen('php://memory', 'r+');
    fwrite($stream, $stdin);
    rewind($stream);

    $input = new ArrayInput(['command' => 'status:create-admin', 'email' => $email, '--password-stdin' => true]);
    $input->setStream($stream);
    $input->setInteractive(false);

    return app(Kernel::class)->handle($input, new BufferedOutput);
}

test('an administrator can be created with the password on standard input', function () {
    expect(createAdminFromStdin('admin@example.com', "a-long-password\n"))->toBe(0);

    $user = User::sole();
    expect($user->email)->toBe('admin@example.com')
        ->and(Hash::check('a-long-password', $user->password))->toBeTrue()
        ->and($user->hasVerifiedEmail())->toBeTrue();
});

test('a password on standard input is validated', function () {
    expect(createAdminFromStdin('admin@example.com', "short\n"))->toBe(1)
        ->and(User::count())->toBe(0);
});
