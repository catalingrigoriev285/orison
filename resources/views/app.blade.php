<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "light" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: #f5f5f7;
            }

            html.dark {
                background-color: #000000;
            }
        </style>

        @php($brand = app(\App\Services\Settings\SystemSettings::class)->brand())

        {{-- The accent colour chosen in Admin → Settings drives buttons, links and focus rings. --}}
        <style>
            html:root, html.dark {
                --primary: {{ $brand['accent_color'] }};
                --ring: {{ $brand['accent_color'] }};
                --sidebar-primary: {{ $brand['accent_color'] }};
                --sidebar-ring: {{ $brand['accent_color'] }};
            }
        </style>

        @if ($brand['favicon_url'])
            <link rel="icon" href="{{ $brand['favicon_url'] }}">
            <link rel="apple-touch-icon" href="{{ $brand['favicon_url'] }}">
        @else
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        @endif

        @if ($brand['description'])
            <meta name="description" content="{{ $brand['description'] }}">
        @endif
        <meta name="application-name" content="{{ $brand['name'] }}">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $brand['name'] }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
