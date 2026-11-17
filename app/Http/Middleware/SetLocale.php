<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Pick the locale from ?lang=, then the locale cookie, then the browser's
     * Accept-Language header, falling back to Romanian.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var array<int, string> $supported */
        $supported = config('status.locales');
        $requested = $request->query('lang');

        $locale = match (true) {
            is_string($requested) && in_array($requested, $supported, true) => $requested,
            in_array($request->cookie('locale'), $supported, true) => $request->cookie('locale'),
            default => $request->getPreferredLanguage($supported) ?? config('status.default_locale'),
        };

        app()->setLocale($locale);

        if ($request->cookie('locale') !== $locale && is_string($requested)) {
            Cookie::queue('locale', $locale, 60 * 24 * 365);
        }

        return $next($request);
    }
}
