<?php

use App\Http\Controllers\Api\IntegrationApiController;
use App\Http\Controllers\Planning\IkuApiController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn () => request()->user());

    Route::get('/integrations/health', [IntegrationApiController::class, 'health']);
    Route::post('/integrations/realizations', [IntegrationApiController::class, 'receiveRealization']);

    // IKU Cascade Dropdown API — digunakan oleh form 4-step wizard
    Route::prefix('iku')->name('api.iku.')->group(function () {
        Route::get('/goals',        [IkuApiController::class, 'goals'])->name('goals');
        Route::get('/objectives',   [IkuApiController::class, 'objectives'])->name('objectives');
        Route::get('/period-years', [IkuApiController::class, 'periodYears'])->name('period-years');
    });
});

