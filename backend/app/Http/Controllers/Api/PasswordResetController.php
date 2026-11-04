<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class PasswordResetController extends Controller
{
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        // The reply is the same either way, so this can't reveal who has an account.
        rescue(fn () => Password::sendResetLink($request->validated()));

        return response()->json(['message' => 'If that email has an account, a reset link is on its way.']);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset($request->validated(), function (User $user, string $password) {
            $user->forceFill(['password' => $password])->save();
            $user->tokens()->delete();
        });

        abort_unless($status === Password::PASSWORD_RESET, 422, 'That reset link is invalid or has expired.');

        return response()->json(['message' => 'Your password has been changed. You can log in now.']);
    }
}
