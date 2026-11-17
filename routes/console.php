<?php

use App\Jobs\AggregateDailyStats;
use Illuminate\Support\Facades\Schedule;

Schedule::command('status:dispatch-monitors')->everyMinute()->withoutOverlapping();
Schedule::command('status:check-heartbeats')->everyMinute()->withoutOverlapping();
Schedule::command('status:sync-maintenances')->everyMinute()->withoutOverlapping();

Schedule::job(new AggregateDailyStats)->dailyAt('00:05')->timezone(config('status.timezone'));
Schedule::command('model:prune')->daily();
