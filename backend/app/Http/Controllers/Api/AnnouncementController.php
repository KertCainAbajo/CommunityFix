<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AnnouncementController extends Controller
{
    private const SHOWN = 5;

    public function index(): JsonResponse
    {
        $items = Announcement::latest()->orderByDesc('id')->limit(self::SHOWN)->get(['id', 'title', 'body', 'created_at']);

        return response()->json(['items' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['title' => ['required', 'string', 'min:3', 'max:120'], 'body' => ['required', 'string', 'min:3', 'max:1000']],
            ['title.*' => 'Give it a title of up to 120 characters.', 'body.*' => 'Write a message of up to 1000 characters.'],
        );

        $announcement = Announcement::create([...$data, 'author_id' => $request->user()->id]);

        return response()->json($announcement->only(['id', 'title', 'body', 'created_at']), 201);
    }

    public function destroy(Announcement $announcement): Response
    {
        $announcement->delete();

        return response()->noContent();
    }
}
