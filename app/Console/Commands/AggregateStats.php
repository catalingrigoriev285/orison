<?php

namespace App\Console\Commands;

use App\Jobs\AggregateDailyStats;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('status:aggregate {--days=1 : Number of past days to (re)build, ending yesterday}')]
#[Description('Build the daily uptime stats shown on the 90-day bars')]
class AggregateStats extends Command
{
    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $today = CarbonImmutable::now(config('status.timezone'));

        for ($offset = $days; $offset >= 1; $offset--) {
            AggregateDailyStats::dispatchSync($today->subDays($offset)->toDateString());
        }

        $this->components->info("Aggregated {$days} day(s).");

        return self::SUCCESS;
    }
}
