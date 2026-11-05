<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        ResetPassword::createUrlUsing(fn (User $user, string $token) => config('communityfix.frontend_url')
            .'/staff/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email]));

        Gate::define('staff', fn (User $user) => $user->isStaff()
            ? Response::allow()
            : Response::deny('Only staff can do this.'));

        Gate::define('admin', fn (User $user) => $user->isAdmin()
            ? Response::allow()
            : Response::deny('Only admins can manage staff accounts.'));

        $this->configureRateLimits();
    }

    private function configureRateLimits(): void
    {
        $tooMany = fn () => response()->json(['message' => 'Too many attempts. Please try again later.'], 429);

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)
            ->by(Str::lower((string) collect([$request->input('login'), $request->input('email')])->first(fn ($value) => is_string($value))))
            ->response($tooMany));

        RateLimiter::for('register', fn (Request $request) => Limit::perHour(5)->by($this->visitor($request))->response($tooMany));

        // The hourly cap for everyone protects the staff queue if the per-visitor limit is dodged.
        RateLimiter::for('reports', fn (Request $request) => [
            Limit::perHour(10)->by($this->visitor($request))->response($tooMany),
            Limit::perHour(200)->by('all-reports')->response($tooMany),
        ]);

        RateLimiter::for('tracking', fn (Request $request) => Limit::perMinute(30)
            ->by($this->visitor($request))
            ->response($tooMany));
    }

    // Requests arrive from the Next.js server, which passes on the visitor's address.
    // The shared key stops anyone else from faking that header.
    private function visitor(Request $request): string
    {
        $key = config('communityfix.internal_key');
        $sent = $request->header('X-Internal-Key');
        $trusted = $key && is_string($sent) && hash_equals($key, $sent);

        return ($trusted ? $request->header('X-Client-Ip') : null) ?: (string) $request->ip();
    }
}
