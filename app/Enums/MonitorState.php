<?php

namespace App\Enums;

enum MonitorState: string
{
    case Pending = 'pending';
    case Up = 'up';
    case Down = 'down';
    case Paused = 'paused';
}
