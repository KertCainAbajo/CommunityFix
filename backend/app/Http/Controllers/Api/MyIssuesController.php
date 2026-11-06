<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\IssueResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** The reports a signed-in resident filed, in every status, newest first. */
class MyIssuesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => ['nullable', Rule::enum(IssueStatus::class)]])['status'] ?? null;
        $issues = $request->user()->issues();

        $page = (clone $issues)
            ->with('photos')
            ->withCount('supporters')
            ->when($status, fn ($query, $value) => $query->where('status', $value))
            ->latest()
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json([
            'items' => IssueResource::collection($page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'pages' => $page->lastPage(),
            // Totals for every status, whichever one is being shown.
            'counts' => (object) (clone $issues)->toBase()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status')->all(),
        ]);
    }
}
