<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Queue\QueueMonitor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin → Queue: a live list of the queue (the page polls every few
 * seconds) plus retry / delete for failed jobs, done through Laravel's own
 * queue:retry, queue:forget and queue:flush commands.
 */
class QueueController extends Controller
{
    public function index(QueueMonitor $monitor): Response
    {
        return Inertia::render('admin/queue/index', [
            'queue' => fn () => $monitor->snapshot(),
        ]);
    }

    public function retry(string $uuid): RedirectResponse
    {
        Artisan::call('queue:retry', ['id' => [$uuid]]);

        return $this->done(__('Job queued again.'));
    }

    public function retryAll(): RedirectResponse
    {
        Artisan::call('queue:retry', ['id' => ['all']]);

        return $this->done(__('All failed jobs queued again.'));
    }

    public function forget(string $uuid): RedirectResponse
    {
        Artisan::call('queue:forget', ['id' => $uuid]);

        return $this->done(__('Failed job deleted.'));
    }

    public function flush(): RedirectResponse
    {
        Artisan::call('queue:flush');

        return $this->done(__('All failed jobs deleted.'));
    }

    private function done(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
