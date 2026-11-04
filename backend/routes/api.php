<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IssueActionController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Middleware\EnsureStaff;
use Illuminate\Support\Facades\Route;

Route::pattern('issue', '[0-9]{1,9}');

Route::get('/meta', [MetaController::class, 'meta']);
Route::get('/stats', [MetaController::class, 'stats']);
Route::get('/issues', [IssueController::class, 'index']);
Route::get('/issues/{issue}', [IssueController::class, 'show']);

Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::post('/issues', [IssueController::class, 'store']);
    Route::post('/issues/{issue}/comments', [IssueActionController::class, 'comment']);
    Route::post('/issues/{issue}/reopen', [IssueActionController::class, 'reopen']);
    Route::post('/issues/{issue}/support', [IssueActionController::class, 'support']);

    Route::middleware(EnsureStaff::class)->group(function () {
        Route::patch('/issues/{issue}', [IssueController::class, 'update']);
        Route::post('/issues/{issue}/status', [IssueActionController::class, 'status']);
    });
});
