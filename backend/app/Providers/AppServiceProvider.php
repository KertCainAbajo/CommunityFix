<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        ResetPassword::createUrlUsing(fn (User $user, string $token) => config('communityfix.frontend_url')
            .'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));

        $this->configureRateLimits();
    }

    // Keyed by account, not IP: every request arrives from the Next.js server,
    // so an IP limit would throttle all residents as if they were one person.
    private function configureRateLimits(): void
    {
        $tooMany = fn () => response()->json(['message' => 'Too many attempts. Please try again later.'], 429);

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)
            ->by(Str::lower(is_string($request->input('email')) ? $request->input('email') : ''))
            ->response($tooMany));

        RateLimiter::for('reports', fn (Request $request) => Limit::perHour(10)
            ->by($request->user()->id)
            ->response($tooMany));

        RateLimiter::for('interactions', fn (Request $request) => Limit::perMinute(30)
            ->by($request->user()->id)
            ->response($tooMany));
    }
}
