<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffRequest;
use App\Http\Requests\Staff\UpdateStaffRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/** Admins manage staff accounts here. Residents sign up on their own and never appear in this list. */
class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['items' => UserResource::collection(User::whereIn('role', ['staff', 'admin'])->orderBy('name')->get())]);
    }

    public function store(StoreStaffRequest $request): JsonResponse
    {
        $password = Str::password(16, symbols: false);

        $user = User::create([...$request->safe()->only(['name', 'email']), 'password' => $password]);
        $user->forceFill(['role' => $request->validated('role')])->save();

        // Shown once, for the admin to pass on. Only the hash is stored.
        return response()->json(['user' => new UserResource($user->refresh()), 'password' => $password], 201);
    }

    public function update(User $user, UpdateStaffRequest $request): JsonResponse
    {
        abort_unless($user->isStaff(), 404, 'That staff account does not exist.');
        abort_if($user->is($request->user()), 422, 'You cannot change your own account here.');

        $user->forceFill($request->validated())->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json(['user' => new UserResource($user)]);
    }
}
