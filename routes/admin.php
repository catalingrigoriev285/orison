<?php

use App\Http\Controllers\Admin\AlertController;
use App\Http\Controllers\Admin\ComponentController;
use App\Http\Controllers\Admin\ComponentGroupController;
use App\Http\Controllers\Admin\IncidentController;
use App\Http\Controllers\Admin\IncidentUpdateController;
use App\Http\Controllers\Admin\MaintenanceController;
use App\Http\Controllers\Admin\MonitorController;
use App\Http\Controllers\Admin\OverviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', OverviewController::class)->name('overview');

    Route::resource('monitors', MonitorController::class);
    Route::post('monitors/{monitor}/check', [MonitorController::class, 'check'])->middleware('throttle:20,1')->name('monitors.check');
    Route::post('monitors/{monitor}/toggle', [MonitorController::class, 'toggle'])->name('monitors.toggle');

    Route::resource('components', ComponentController::class)->except('show');
    Route::resource('component-groups', ComponentGroupController::class)
        ->only(['store', 'update', 'destroy'])
        ->parameters(['component-groups' => 'group']);

    Route::resource('incidents', IncidentController::class)->except('edit');
    Route::resource('incidents.updates', IncidentUpdateController::class)
        ->only(['store', 'update', 'destroy'])
        ->scoped();

    Route::resource('maintenances', MaintenanceController::class)->except('show');

    Route::get('alerts', [AlertController::class, 'index'])->name('alerts.index');
    Route::post('alerts/test', [AlertController::class, 'test'])->middleware('throttle:10,1')->name('alerts.test');
    Route::post('alerts/{delivery}/retry', [AlertController::class, 'retry'])->name('alerts.retry');
});
