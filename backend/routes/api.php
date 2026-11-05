<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\IssueCommentController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\IssuePhotoController;
use App\Http\Controllers\Api\IssueStatusController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\MyIssuesController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\TrackingController;
use Illuminate\Support\Facades\Route;

Route::pattern('issue', '[0-9]{1,9}');
Route::pattern('user', '[0-9]{1,9}');
Route::pattern('code', '[Cc][Ff]-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}');

// Public: residents can report and track without an account.
Route::get('/meta', MetaController::class);
Route::get('/stats', StatsController::class);
Route::get('/activity', ActivityController::class);
Route::get('/issues', [IssueController::class, 'index']);
Route::get('/issues/{issue}', [IssueController::class, 'show']);
Route::post('/issues', [IssueController::class, 'store'])->middleware('throttle:reports');

Route::middleware('throttle:tracking')->group(function () {
    Route::get('/track/{code}', [TrackingController::class, 'show']);
    Route::post('/track/{code}/reopen', [TrackingController::class, 'reopen']);
});

// Sign-in for staff and residents
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');

    Route::middleware('throttle:tracking')->group(function () {
        Route::post('/google/url', [GoogleAuthController::class, 'url']);
        Route::post('/google/callback', [GoogleAuthController::class, 'callback']);
    });

    Route::middleware('throttle:auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [PasswordResetController::class, 'forgot']);
        Route::post('/reset-password', [PasswordResetController::class, 'reset']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// A signed-in resident's own reports
Route::get('/my/issues', MyIssuesController::class)->middleware('auth:sanctum');

// Staff
Route::middleware(['auth:sanctum', 'can:staff'])->group(function () {
    Route::patch('/issues/{issue}', [IssueController::class, 'update']);
    Route::post('/issues/{issue}/status', [IssueStatusController::class, 'update']);
    Route::post('/issues/{issue}/comments', [IssueCommentController::class, 'store']);
    Route::post('/issues/{issue}/photos', [IssuePhotoController::class, 'store']);
    Route::get('/analytics', AnalyticsController::class);

    // Admins
    Route::middleware('can:admin')->group(function () {
        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::patch('/staff/{user}', [StaffController::class, 'update']);
    });
});
