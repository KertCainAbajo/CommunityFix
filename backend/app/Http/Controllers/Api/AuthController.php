<?php

namespace App\Http\Controllers\Api;

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
    private const TOKEN_DAYS = 14;

    public function register(RegisterRequest $request): JsonResponse
    {
        return $this->startSession(User::create($request->validated())->refresh(), 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();
        $valid = $user && Hash::check($request->validated('password'), $user->password);

        abort_unless($valid, 401, 'Wrong email or password.');

        return $this->startSession($user);
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

    private function startSession(User $user, int $status = 200): JsonResponse
    {
        $user->tokens()->where('expires_at', '<', now())->delete();
        $token = $user->createToken('web', expiresAt: now()->addDays(self::TOKEN_DAYS));

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token->plainTextToken,
        ], $status);
    }
}
