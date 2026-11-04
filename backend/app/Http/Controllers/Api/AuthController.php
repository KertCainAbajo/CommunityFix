<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const TOKEN_DAYS = 14;

    public function register(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => Str::lower(trim($request->input('email')))]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:200'],
        ], [
            'name.*' => 'Enter your name.',
            'email.unique' => 'That email already has an account. Try logging in.',
            'email.*' => 'Enter a valid email address.',
            'password.*' => 'Use a password of at least 8 characters.',
        ]);

        return $this->session(User::create($data)->refresh(), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', Str::lower(trim($data['email'])))->first();

        abort_if(! $user || ! Hash::check($data['password'], $user->password), 401, 'Wrong email or password.');

        return $this->session($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->publicUser($request->user())]);
    }

    private function session(User $user, int $status = 200): JsonResponse
    {
        $token = $user->createToken('web', expiresAt: now()->addDays(self::TOKEN_DAYS));

        return response()->json([
            'user' => $this->publicUser($user),
            'token' => $token->plainTextToken,
        ], $status);
    }

    private function publicUser(User $user): array
    {
        return $user->only(['id', 'name', 'email', 'role']);
    }
}
