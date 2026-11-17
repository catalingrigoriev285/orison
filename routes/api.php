<?php

use App\Http\Controllers\Api\HeartbeatController;
use App\Http\Controllers\Api\StatusSummaryController;
use Illuminate\Support\Facades\Route;

Route::get('status', StatusSummaryController::class)
    ->middleware('throttle:120,1')
    ->name('api.status');

Route::match(['get', 'post'], 'heartbeat/{token}', HeartbeatController::class)
    ->middleware('throttle:60,1')
    ->name('api.heartbeat');
