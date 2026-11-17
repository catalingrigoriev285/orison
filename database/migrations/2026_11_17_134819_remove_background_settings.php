<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * The background image feature was replaced by built-in illustrations:
 * drop its stored settings and any uploaded background files.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('settings')->whereIn('key', ['background', 'show_background'])->delete();

        $disk = Storage::disk('local');

        $disk->delete(array_filter(
            $disk->files('branding'),
            fn (string $path) => str_starts_with(basename($path), 'background-'),
        ));

        Cache::forget('system-settings');
    }
};
