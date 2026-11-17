<?php

namespace App\Enums;

enum MonitorType: string
{
    case Http = 'http';
    case Keyword = 'keyword';
    case Tcp = 'tcp';
    case Heartbeat = 'heartbeat';

    public function isPolled(): bool
    {
        return $this !== self::Heartbeat;
    }
}
