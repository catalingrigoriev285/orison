<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted proxies
    |--------------------------------------------------------------------------
    |
    | Reverse proxies (nginx, a load balancer, the Docker bridge) that sit in
    | front of Orison, as comma-separated IP addresses or CIDR ranges, or "*"
    | to trust whatever connects. Their X-Forwarded-* headers are then used
    | for the scheme, host and client IP. Leave empty when visitors reach
    | Orison directly.
    |
    */

    'proxies' => env('TRUSTED_PROXIES') ?: null,

];
