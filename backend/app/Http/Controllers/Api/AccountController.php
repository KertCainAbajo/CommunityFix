<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateAccountRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** What someone can do with their own account. */
class AccountController extends Controller
{
    public function update(UpdateAccountRequest $request): JsonResponse
    {
        $user = $request->user();
        $details = $request->safe()->only(['name', 'email', 'phone']);
        $emailChanged = $details['email'] !== $user->email;

        // A stolen session must not be able to take the account by changing where resets go.
        if ($emailChanged) {
            $this->confirmPassword($user, $request->validated('current_password'));
        }

        $user->fill($details);
        if ($emailChanged) {
            $user->email_verified_at = null;
        }
        $user->save();

        if ($emailChanged) {
            $this->sendVerification($user);
        }

        return response()->json(['user' => new UserResource($user)]);
    }

    public function password(Request $request): Response
    {
        $user = $request->user();
        $data = $request->validate(
            ['current_password' => ['nullable', 'string', 'max:255'], 'password' => ['required', 'string', 'min:8', 'max:72']],
            ['password.*' => 'Use a password of 8 to 72 characters.'],
        );

        $this->confirmPassword($user, $data['current_password'] ?? null);
        $user->forceFill(['password' => $data['password']])->save();

        // Everywhere else is signed out, in case that's why the password is changing.
        $user->tokens()->whereKeyNot($user->currentAccessToken()->getKey())->delete();

        return response()->noContent();
    }

    public function destroy(Request $request): Response
    {
        $user = $request->user();
        abort_if($user->isStaff(), 403, 'Staff accounts are managed by an admin.');
        $this->confirmPassword($user, $request->input('current_password'));

        // Reports stay, because the problems are still real. The personal details go.
        DB::transaction(function () use ($user) {
            $user->issues()->update(['contact_name' => null, 'contact_email' => null, 'contact_phone' => null]);
            $user->notifications()->delete();
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->noContent();
    }

    public function resendVerification(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->email && ! $user->hasVerifiedEmail(), 422, 'Your email is already confirmed.');
        $this->sendVerification($user);

        return response()->noContent();
    }

    /** Opened from the email, so it answers with a page and not JSON. */
    public function verify(Request $request, User $user, string $hash): RedirectResponse
    {
        $valid = $request->hasValidSignature() && $user->email && hash_equals($hash, sha1($user->email));

        if ($valid && ! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            // Reports filed before confirming had no email for updates.
            $user->issues()->whereNull('contact_email')->update(['contact_email' => $user->email]);
        }

        return redirect(config('communityfix.frontend_url').'/account?verified='.($valid ? '1' : '0'));
    }

    private function confirmPassword(User $user, mixed $password): void
    {
        // Accounts made with Google have no password to confirm.
        if ($user->password) {
            abort_unless(is_string($password) && Hash::check($password, $user->password), 422, 'That password is not correct.');
        }
    }

    private function sendVerification(User $user): void
    {
        defer(fn () => rescue(fn () => $user->sendEmailVerificationNotification()));
    }
}
