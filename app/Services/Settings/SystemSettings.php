<?php

namespace App\Services\Settings;

use App\Models\Setting;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;

/**
 * System settings edited in the admin panel. Stored values override the
 * defaults from config/status.php (and .env) at boot, so the rest of the
 * app keeps reading plain config values.
 */
class SystemSettings
{
    /**
     * Setting key => config key it overrides.
     *
     * @var array<string, string>
     */
    public const CONFIG_MAP = [
        'name' => 'status.brand.name',
        'description' => 'status.brand.description',
        'website_url' => 'status.brand.website_url',
        'logo' => 'status.brand.logo',
        'favicon' => 'status.brand.favicon',
        'accent_color' => 'status.brand.accent_color',
        'background' => 'status.brand.background',
        'show_background' => 'status.brand.show_background',
        'default_locale' => 'status.default_locale',
        'timezone' => 'status.timezone',
    ];

    /**
     * Uploaded branding files live on this disk, outside the public folder.
     */
    public const DISK = 'local';

    public const DIRECTORY = 'branding';

    public function apply(): void
    {
        try {
            $stored = Setting::cached();
        } catch (QueryException) {
            return; // Not migrated yet.
        }

        foreach (self::CONFIG_MAP as $setting => $configKey) {
            if (array_key_exists($setting, $stored)) {
                config([$configKey => $stored[$setting]]);
            }
        }
    }

    /**
     * Current values, as shown in the settings form.
     *
     * @return array<string, mixed>
     */
    public function current(): array
    {
        return collect(self::CONFIG_MAP)->map(fn (string $configKey) => config($configKey))->all();
    }

    /**
     * Brand details shared with every page.
     *
     * @return array{name: string, description: string|null, website_url: string|null, logo_url: string|null, favicon_url: string|null, accent_color: string, background_url: string|null}
     */
    public function brand(): array
    {
        return [
            'name' => (string) config('status.brand.name'),
            'description' => config('status.brand.description'),
            'website_url' => config('status.brand.website_url'),
            'logo_url' => $this->assetUrl(config('status.brand.logo')),
            'favicon_url' => $this->assetUrl(config('status.brand.favicon')),
            'accent_color' => (string) config('status.brand.accent_color'),
            'background_url' => config('status.brand.show_background') ? $this->backgroundUrl() : null,
        ];
    }

    /**
     * The uploaded background, or the default image shipped in public/ when none was uploaded.
     */
    public function backgroundUrl(): ?string
    {
        return $this->assetUrl(config('status.brand.background')) ?? $this->defaultBackgroundUrl();
    }

    /**
     * The image shipped in public/ (config status.brand.default_background), if present.
     */
    public function defaultBackgroundUrl(): ?string
    {
        $default = (string) config('status.brand.default_background');

        return $default !== '' && is_file(public_path($default)) ? asset($default) : null;
    }

    /**
     * Whether the given file name is the current logo or favicon.
     */
    public function isCurrentAsset(string $filename): bool
    {
        return collect([config('status.brand.logo'), config('status.brand.favicon'), config('status.brand.background')])
            ->filter()
            ->contains(fn (string $path) => basename($path) === $filename);
    }

    public function assetPath(string $filename): string
    {
        return Storage::disk(self::DISK)->path(self::DIRECTORY.'/'.$filename);
    }

    private function assetUrl(?string $path): ?string
    {
        return $path ? route('brand.asset', basename($path)) : null;
    }
}
