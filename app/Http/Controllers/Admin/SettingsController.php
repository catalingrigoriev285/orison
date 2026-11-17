<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SettingsRequest;
use App\Models\Setting;
use App\Services\Settings\SystemSettings;
use DateTimeZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(private SystemSettings $settings) {}

    public function edit(): Response
    {
        return Inertia::render('admin/settings', [
            'settings' => [
                ...collect($this->settings->current())->except(['logo', 'favicon', 'background'])->all(),
                'logo_url' => $this->settings->brand()['logo_url'],
                'favicon_url' => $this->settings->brand()['favicon_url'],
                'background_url' => $this->settings->backgroundUrl(),
                'has_custom_background' => filled(config('status.brand.background')),
                'default_background_url' => $this->settings->defaultBackgroundUrl(),
            ],
            'timezones' => DateTimeZone::listIdentifiers(),
        ]);
    }

    public function update(SettingsRequest $request): RedirectResponse
    {
        Setting::store([
            ...$request->safe()->only(['name', 'description', 'website_url', 'accent_color', 'default_locale', 'timezone']),
            'logo' => $this->replaceAsset('logo', $request->file('logo'), $request->boolean('remove_logo')),
            'favicon' => $this->replaceAsset('favicon', $request->file('favicon'), $request->boolean('remove_favicon')),
            'background' => $this->replaceAsset('background', $request->file('background'), $request->boolean('remove_background')),
            'show_background' => $request->boolean('show_background'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Settings saved.')]);

        return to_route('admin.settings.edit');
    }

    /**
     * Store a newly uploaded file (deleting the previous one) or keep the current one.
     * Each upload gets a fresh random name, which also busts browser caches.
     */
    private function replaceAsset(string $type, ?UploadedFile $file, bool $remove): ?string
    {
        /** @var string|null $current */
        $current = config("status.brand.{$type}");

        if (! $file && ! $remove) {
            return $current;
        }

        if ($current) {
            Storage::disk(SystemSettings::DISK)->delete($current);
        }

        if (! $file) {
            return null;
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: (string) $file->extension());

        return $file->storeAs(
            SystemSettings::DIRECTORY,
            $type.'-'.Str::lower(Str::random(12)).'.'.$extension,
            SystemSettings::DISK,
        ) ?: null;
    }
}
