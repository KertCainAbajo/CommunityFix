<?php

namespace App\Providers;

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

        // Keyed by account, not IP: every request arrives from the Next.js server,
        // so an IP limit would throttle all residents as if they were one person.
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)
            ->by(Str::lower((string) $request->input('email')))
            ->response(fn () => response()->json(['message' => 'Too many attempts. Please try again in a minute.'], 429)));
    }
}
