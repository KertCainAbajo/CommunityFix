<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IssueResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The reports a signed-in resident filed, in every status, newest first. */
class MyIssuesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $page = $request->user()->issues()->with('photos')->latest()->orderByDesc('id')->paginate(20);

        return response()->json([
            'items' => IssueResource::collection($page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'pages' => $page->lastPage(),
        ]);
    }
}
