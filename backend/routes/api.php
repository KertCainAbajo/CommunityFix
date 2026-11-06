<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\IssueCommentController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\IssuePhotoController;
use App\Http\Controllers\Api\IssueStatusController;
use App\Http\Controllers\Api\IssueSupportController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\MyIssuesController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ResidentIssueController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\TrackingController;
use Illuminate\Support\Facades\Route;

Route::pattern('issue', '[0-9]{1,9}');
Route::pattern('user', '[0-9]{1,9}');
Route::pattern('announcement', '[0-9]{1,9}');
Route::pattern('code', '[Cc][Ff]-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}');

// Public: only the labels and overall figures the sign-in page shows. No report details.
Route::get('/meta', MetaController::class);
Route::get('/stats', StatsController::class);

// Everything about reports needs an account.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/activity', ActivityController::class);
    Route::get('/issues', [IssueController::class, 'index']);
    Route::get('/issues/{issue}', [IssueController::class, 'show']);
    Route::post('/issues', [IssueController::class, 'store'])->middleware('throttle:reports');
    Route::get('/issues/nearby', [IssueSupportController::class, 'nearby']);
    Route::post('/issues/{issue}/support', [IssueSupportController::class, 'store']);
    Route::delete('/issues/{issue}/support', [IssueSupportController::class, 'destroy']);
    Route::get('/announcements', [AnnouncementController::class, 'index']);

    // The reports a resident filed
    Route::get('/my/issues', MyIssuesController::class);
    Route::patch('/my/issues/{issue}', [ResidentIssueController::class, 'update']);
    Route::delete('/my/issues/{issue}', [ResidentIssueController::class, 'destroy']);
    Route::post('/my/issues/{issue}/comments', [ResidentIssueController::class, 'comment']);
    Route::post('/my/issues/{issue}/photos', [ResidentIssueController::class, 'photo']);
    Route::post('/my/issues/{issue}/feedback', [ResidentIssueController::class, 'feedback']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'read']);

    // Their own account
    Route::patch('/account', [AccountController::class, 'update']);
    Route::put('/account/password', [AccountController::class, 'password'])->middleware('throttle:auth');
    Route::delete('/account', [AccountController::class, 'destroy'])->middleware('throttle:auth');
    Route::post('/account/verification', [AccountController::class, 'resendVerification'])->middleware('throttle:register');

    Route::middleware('throttle:tracking')->group(function () {
        Route::get('/track/{code}', [TrackingController::class, 'show']);
        Route::post('/track/{code}/reopen', [TrackingController::class, 'reopen']);
    });
});

// Sign-in for staff and residents
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::get('/verify-email/{user}/{hash}', [AccountController::class, 'verify'])->name('verification.verify');

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

// Staff
Route::middleware(['auth:sanctum', 'can:staff'])->group(function () {
    Route::patch('/issues/{issue}', [IssueController::class, 'update']);
    Route::post('/issues/{issue}/status', [IssueStatusController::class, 'update']);
    Route::post('/issues/{issue}/comments', [IssueCommentController::class, 'store']);
    Route::post('/issues/{issue}/photos', [IssuePhotoController::class, 'store']);
    Route::get('/analytics', AnalyticsController::class);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

    // Admins
    Route::middleware('can:admin')->group(function () {
        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::patch('/staff/{user}', [StaffController::class, 'update']);
    });
});
