<?php

namespace App\Providers;

use App\Services\Queue\QueueMonitor;
use App\Services\Settings\SystemSettings;
use Carbon\CarbonImmutable;
use Illuminate\Queue\Events\JobExceptionOccurred;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Queue\Events\Looping;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        $this->app->make(SystemSettings::class)->apply();

        $this->monitorQueue();
    }

    /**
     * Feed Admin → Queue: worker heartbeats and the recent-activity list.
     */
    protected function monitorQueue(): void
    {
        $monitor = fn (): QueueMonitor => $this->app->make(QueueMonitor::class);

        Event::listen(Looping::class, fn (Looping $event) => $monitor()->heartbeat($event->connectionName, $event->queue));
        Event::listen(JobProcessing::class, fn (JobProcessing $event) => $monitor()->jobStarted($event->job));
        Event::listen(JobProcessed::class, fn (JobProcessed $event) => $monitor()->jobFinished(
            $event->job,
            $event->job->isReleased() ? 'released' : 'processed',
        ));
        Event::listen(JobExceptionOccurred::class, function (JobExceptionOccurred $event) use ($monitor) {
            // A job that has now failed for good is recorded by JobFailed.
            if (! $event->job->hasFailed()) {
                $monitor()->jobFinished($event->job, 'retrying', $event->exception);
            }
        });
        Event::listen(JobFailed::class, fn (JobFailed $event) => $monitor()->jobFinished($event->job, 'failed', $event->exception));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
