<?php

namespace App\Enums;

enum ComponentStatus: string
{
    case Operational = 'operational';
    case DegradedPerformance = 'degraded_performance';
    case PartialOutage = 'partial_outage';
    case MajorOutage = 'major_outage';
    case UnderMaintenance = 'under_maintenance';

    /**
     * Higher numbers are worse. Maintenance ranks below real outages so an
     * outage during a window still surfaces on the page.
     */
    public function severity(): int
    {
        return match ($this) {
            self::Operational => 0,
            self::UnderMaintenance => 1,
            self::DegradedPerformance => 2,
            self::PartialOutage => 3,
            self::MajorOutage => 4,
        };
    }

    public function isWorseThan(self $other): bool
    {
        return $this->severity() > $other->severity();
    }

    /**
     * @param  iterable<self>  $statuses
     */
    public static function worstOf(iterable $statuses): self
    {
        $worst = self::Operational;

        foreach ($statuses as $status) {
            if ($status->isWorseThan($worst)) {
                $worst = $status;
            }
        }

        return $worst;
    }
}
