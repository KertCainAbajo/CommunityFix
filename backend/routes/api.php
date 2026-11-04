<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IssueCommentController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\IssueStatusController;
use App\Http\Controllers\Api\IssueSupportController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\StatsController;
use Illuminate\Support\Facades\Route;

Route::pattern('issue', '[0-9]{1,9}');

// Public
Route::get('/meta', MetaController::class);
Route::get('/stats', StatsController::class);
Route::get('/issues', [IssueController::class, 'index']);
Route::get('/issues/{issue}', [IssueController::class, 'show']);

// Accounts
Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [PasswordResetController::class, 'forgot']);
        Route::post('/reset-password', [PasswordResetController::class, 'reset']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Residents and staff
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/issues', [IssueController::class, 'store'])->middleware('throttle:reports');

    Route::middleware('throttle:interactions')->group(function () {
        Route::post('/issues/{issue}/comments', [IssueCommentController::class, 'store']);
        Route::post('/issues/{issue}/support', [IssueSupportController::class, 'toggle']);
    });

    Route::post('/issues/{issue}/reopen', [IssueStatusController::class, 'reopen'])->can('reopen', 'issue');

    // Staff only
    Route::middleware('can:manage,issue')->group(function () {
        Route::patch('/issues/{issue}', [IssueController::class, 'update']);
        Route::post('/issues/{issue}/status', [IssueStatusController::class, 'update']);
    });
});
