<?php

namespace App\Enums;

enum IncidentImpact: string
{
    case None = 'none';
    case Minor = 'minor';
    case Major = 'major';
    case Critical = 'critical';

    public function componentStatus(): ComponentStatus
    {
        return match ($this) {
            self::None => ComponentStatus::Operational,
            self::Minor => ComponentStatus::DegradedPerformance,
            self::Major => ComponentStatus::PartialOutage,
            self::Critical => ComponentStatus::MajorOutage,
        };
    }
}
