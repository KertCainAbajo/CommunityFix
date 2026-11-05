<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

trait StartsSessions
{
    /** A signed-in session: the website keeps this token in an httpOnly cookie. */
    protected function startSession(User $user, int $status = 200): JsonResponse
    {
        $user->tokens()->where('expires_at', '<', now())->delete();
        $token = $user->createToken('web', expiresAt: now()->addDays(14));

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token->plainTextToken,
        ], $status);
    }
}
