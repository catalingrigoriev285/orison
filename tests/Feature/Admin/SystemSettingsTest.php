<?php

use App\Models\Setting;
use App\Models\User;
use App\Services\Settings\SystemSettings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake(SystemSettings::DISK);
    $this->actingAs(User::factory()->create());
});

/**
 * Re-apply stored settings the way the next request would.
 */
function reloadSettings(): void
{
    app(SystemSettings::class)->apply();
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function settingsPayload(array $overrides = []): array
{
    return [
        'name' => 'Acme Status',
        'description' => 'Live status of Acme services.',
        'website_url' => 'https://acme.test',
        'accent_color' => '#ff2d55',
        'default_locale' => 'en',
        'timezone' => 'Europe/Berlin',
        'illustration' => 'servers',
        ...$overrides,
    ];
}

test('guests cannot open or change the settings', function () {
    auth()->logout();

    $this->get(route('admin.settings.edit'))->assertRedirect(route('login'));
    $this->put(route('admin.settings.update'), settingsPayload())->assertRedirect(route('login'));

    expect(Setting::count())->toBe(0);
});

test('the settings page shows the current values', function () {
    $this->get(route('admin.settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/settings')
            ->where('settings.name', 'Orison')
            ->where('settings.accent_color', '#0071e3')
            ->where('settings.logo_url', null)
            ->has('timezones'),
        );
});

test('saved settings change the brand, language and timezone everywhere', function () {
    $this->put(route('admin.settings.update'), settingsPayload())
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.settings.edit'));

    reloadSettings();

    expect(config('status.timezone'))->toBe('Europe/Berlin')
        ->and(config('status.default_locale'))->toBe('en');

    $this->get(route('home'), ['Accept-Language' => 'de-DE'])
        ->assertSee('Acme Status</title>', false)
        ->assertSee('--primary: #ff2d55', false)
        ->assertSee('Live status of Acme services.', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('brand.name', 'Acme Status')
            ->where('brand.website_url', 'https://acme.test')
            ->where('locale', 'en')
            ->where('defaultLocale', 'en'),
        );
});

test('the default language becomes the required translation', function () {
    Setting::store(['default_locale' => 'en']);
    reloadSettings();

    $this->post(route('admin.incidents.store'), [
        'title' => ['ro' => 'Doar română'],
        'impact' => 'minor',
        'status' => 'investigating',
        'message' => ['en' => 'English message'],
    ])->assertSessionHasErrors('title.en')->assertSessionDoesntHaveErrors('message.en');
});

test('a logo and favicon can be uploaded, served and removed', function () {
    $this->put(route('admin.settings.update'), settingsPayload([
        'logo' => UploadedFile::fake()->image('logo.png', 256, 256),
        'favicon' => UploadedFile::fake()->createWithContent('favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'),
    ]))->assertSessionHasNoErrors();

    reloadSettings();
    $logo = config('status.brand.logo');
    $favicon = config('status.brand.favicon');

    Storage::disk(SystemSettings::DISK)->assertExists([$logo, $favicon]);

    $brand = app(SystemSettings::class)->brand();
    expect($brand['logo_url'])->toBe(route('brand.asset', basename($logo)));

    $this->get($brand['logo_url'])->assertOk()->assertHeader('Cache-Control', 'immutable, max-age=31536000, public');
    $this->get($brand['favicon_url'])
        ->assertOk()
        ->assertHeader('Content-Type', 'image/svg+xml')
        ->assertHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    $this->get(route('home'))->assertSee('<link rel="icon" href="'.$brand['favicon_url'].'">', false);

    $this->put(route('admin.settings.update'), settingsPayload(['remove_logo' => true]))->assertSessionHasNoErrors();
    reloadSettings();

    expect(config('status.brand.logo'))->toBeNull()
        ->and(config('status.brand.favicon'))->toBe($favicon);
    Storage::disk(SystemSettings::DISK)->assertMissing($logo);
    $this->get(route('brand.asset', basename($logo)))->assertNotFound();
});

test('only the current branding files are served', function () {
    Storage::disk(SystemSettings::DISK)->put('branding/logo-old.png', 'old');

    $this->get(route('brand.asset', 'logo-old.png'))->assertNotFound();
});

test('settings are validated', function () {
    $this->put(route('admin.settings.update'), settingsPayload([
        'name' => '',
        'accent_color' => 'red',
        'default_locale' => 'de',
        'timezone' => 'Mars/Olympus',
        'website_url' => 'not a url',
        'logo' => UploadedFile::fake()->create('logo.pdf', 10, 'application/pdf'),
    ]))->assertSessionHasErrors(['name', 'accent_color', 'default_locale', 'timezone', 'website_url', 'logo']);

    expect(Setting::count())->toBe(0);
});

test('the chosen illustration is shown on the status page', function () {
    expect(app(SystemSettings::class)->brand()['illustration'])->toBe('horizon');

    $this->put(route('admin.settings.update'), settingsPayload())->assertSessionHasNoErrors();
    reloadSettings();

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('brand.illustration', 'servers'));
    $this->get(route('admin.settings.edit'))->assertInertia(fn (Assert $page) => $page->where('settings.illustration', 'servers'));
});

test('the illustration can be turned off', function () {
    $this->put(route('admin.settings.update'), settingsPayload(['illustration' => 'none']))->assertSessionHasNoErrors();
    reloadSettings();

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('brand.illustration', null));
});

test('only built-in illustrations can be chosen', function () {
    $this->put(route('admin.settings.update'), settingsPayload(['illustration' => 'rocket']))
        ->assertSessionHasErrors('illustration');

    expect(Setting::count())->toBe(0);
});

test('leftover background settings and files are cleaned up', function () {
    Setting::store(['background' => 'branding/background-abc123.png', 'show_background' => true, 'name' => 'Kept']);
    Storage::disk(SystemSettings::DISK)->put('branding/background-abc123.png', 'image');
    Storage::disk(SystemSettings::DISK)->put('branding/logo-keep.png', 'logo');

    $migration = require glob(database_path('migrations/*_remove_background_settings.php'))[0];
    $migration->up();

    expect(Setting::cached())->toBe(['name' => 'Kept']);
    Storage::disk(SystemSettings::DISK)->assertMissing('branding/background-abc123.png');
    Storage::disk(SystemSettings::DISK)->assertExists('branding/logo-keep.png');
});
