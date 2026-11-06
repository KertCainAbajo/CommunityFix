<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StartsSessions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    use StartsSessions;

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::findByLogin($request->validated('login'));
        // Accounts made with Google have no password until the resident sets one.
        $valid = $user && $user->is_active && $user->password
            && Hash::check($request->validated('password'), $user->password);

        abort_unless($valid, 401, 'Wrong email, phone number or password.');
        abort_if(
            $request->validated('portal') === 'staff' && ! $user->isStaff(),
            403,
            'This is a resident account. Use the Resident tab to sign in.',
        );

        return $this->startSession($user);
    }

    /** Residents sign up here. Staff accounts are only made by admins. */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->account());
        $user->forceFill(['role' => 'resident'])->save();
        defer(fn () => rescue(fn () => $user->sendEmailVerificationNotification()));

        return $this->startSession($user->refresh(), 201);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => new UserResource($request->user())]);
    }
}
