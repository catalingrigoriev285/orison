<?php

namespace App\Http\Controllers;

use App\Services\Settings\SystemSettings;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BrandAssetController extends Controller
{
    /**
     * Serve the uploaded logo or favicon. File names are random per upload,
     * so responses can be cached for a long time.
     */
    public function __invoke(string $filename, SystemSettings $settings): BinaryFileResponse
    {
        abort_unless($settings->isCurrentAsset($filename), 404);

        $path = $settings->assetPath($filename);

        abort_unless(is_file($path), 404);

        $headers = [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
            // SVG uploads must never run scripts, even when opened directly.
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
        ];

        if (str_ends_with(strtolower($filename), '.svg')) {
            $headers['Content-Type'] = 'image/svg+xml';
        }

        if (str_ends_with(strtolower($filename), '.ico')) {
            $headers['Content-Type'] = 'image/x-icon';
        }

        return response()->file($path, $headers);
    }
}
