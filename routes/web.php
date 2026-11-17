<?php

use App\Http\Controllers\BrandAssetController;
use App\Http\Controllers\StatusPageController;
use Illuminate\Support\Facades\Route;

Route::get('/', [StatusPageController::class, 'index'])->name('home');
Route::get('incidents/{incident}', [StatusPageController::class, 'incident'])->name('status.incident');
Route::get('history', [StatusPageController::class, 'history'])->name('status.history');
Route::get('brand/{filename}', BrandAssetController::class)
    ->where('filename', '[a-z]+-[a-z0-9]+\.[a-z]+')
    ->name('brand.asset');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::redirect('dashboard', '/admin')->name('dashboard');
});

require __DIR__.'/admin.php';
require __DIR__.'/settings.php';
