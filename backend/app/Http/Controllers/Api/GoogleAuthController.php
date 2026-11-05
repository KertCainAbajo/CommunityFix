<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StartsSessions;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Throwable;

/**
 * "Continue with Google" for residents. The website starts the sign-in, keeps the `state`
 * value in its own cookie to check on return, and hands the code from Google to `callback`.
 */
class GoogleAuthController extends Controller
{
    use StartsSessions;

    public static function enabled(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public function url(Request $request): JsonResponse
    {
        $state = $request->validate(['state' => ['required', 'string', 'size:40']])['state'];

        $url = $this->google()->with(['state' => $state, 'prompt' => 'select_account'])->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    public function callback(Request $request): JsonResponse
    {
        // Socialite reads the code from this request.
        $request->validate(['code' => ['required', 'string', 'max:2048']]);

        try {
            $google = $this->google()->user();
        } catch (Throwable) {
            abort(401, 'Google sign-in did not finish. Please try again.');
        }

        // Only an address Google has verified may match an existing account.
        $verified = (bool) ($google->user['email_verified'] ?? $google->user['verified_email'] ?? false);
        $email = $verified ? Str::lower((string) $google->getEmail()) : '';
        $user = User::where('google_id', $google->getId())->first()
            ?? ($email !== '' ? User::where('email', $email)->first() : null);

        if ($user) {
            // Staff sign in with their password, so a Google account can't take one over.
            abort_if($user->isStaff(), 403, 'Staff accounts sign in with email and password on the Staff tab.');
            abort_unless($user->is_active, 403, 'This account has been turned off.');
            $user->forceFill(['google_id' => $google->getId()])->save();
        } else {
            $user = User::create(['name' => Str::limit($google->getName() ?: 'Resident', 80, ''), 'email' => $email ?: null]);
            $user->forceFill(['role' => 'resident', 'google_id' => $google->getId(), 'email_verified_at' => $email ? now() : null])->save();
        }

        return $this->startSession($user->refresh());
    }

    private function google(): GoogleProvider
    {
        abort_unless(self::enabled(), 404, 'Google sign-in is not set up.');

        /** @var GoogleProvider $provider */
        $provider = Socialite::driver('google');

        return $provider->stateless()->redirectUrl(config('communityfix.frontend_url').'/auth/google/callback');
    }
}
