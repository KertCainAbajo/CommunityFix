<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueCategory;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIssueRequest;
use App\Http\Resources\IssueResource;
use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class IssueController extends Controller
{
    private const PAGE_SIZE = 20;

    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user('sanctum');
        abort_if($request->boolean('mine') && ! $viewer, 401, 'Please log in first.');

        $request->validate([
            'q' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', 'string'],
            'category' => ['nullable', 'string'],
        ]);

        $query = self::withCounts(Issue::query()->with('reporter'), $request)
            ->when(IssueStatus::tryFrom((string) $request->query('status')), fn (Builder $q, $status) => $q->where('status', $status))
            ->when(IssueCategory::tryFrom((string) $request->query('category')), fn (Builder $q, $category) => $q->where('category', $category))
            ->when($request->boolean('open'), fn (Builder $q) => $q->whereIn('status', IssueStatus::open()))
            ->when($request->boolean('mine'), fn (Builder $q) => $q->where('reporter_id', $viewer->id))
            ->when(trim((string) $request->query('q')), function (Builder $q, string $search) {
                $pattern = '%'.addcslashes($search, '\\%_').'%';
                $q->where(fn (Builder $inner) => $inner
                    ->whereLike('title', $pattern)
                    ->orWhereLike('description', $pattern)
                    ->orWhereLike('address', $pattern));
            });

        match ($request->query('sort')) {
            'oldest' => $query->oldest()->orderBy('id'),
            'supported' => $query->orderByDesc('supporters_count')->latest()->orderByDesc('id'),
            'priority' => $query->orderByRaw(
                "CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END"
            )->oldest()->orderBy('id'),
            default => $query->latest()->orderByDesc('id'),
        };

        $page = $query->paginate(self::PAGE_SIZE);

        return response()->json([
            'items' => IssueResource::collection($page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'pages' => $page->lastPage(),
        ]);
    }

    public function store(StoreIssueRequest $request): JsonResponse
    {
        $data = $request->safe()->except('photo');
        $data['photo_path'] = $request->file('photo')?->store('issues');
        $data['reporter_id'] = $request->user()->id;

        $issue = DB::transaction(function () use ($data, $request) {
            $issue = Issue::create($data);
            $issue->addUpdate($request->user(), to: IssueStatus::Reported);

            return $issue;
        });

        return self::respond($issue, $request, 201);
    }

    public function show(Issue $issue, Request $request): JsonResponse
    {
        return self::respond($issue, $request);
    }

    public function update(Issue $issue, Request $request): JsonResponse
    {
        $data = $request->validate([
            'priority' => ['sometimes', Rule::enum(IssuePriority::class)],
            'department' => ['sometimes', 'nullable', 'string', 'max:80'],
        ], ['priority.*' => 'Choose a valid priority.']);

        $issue->update($data);

        return self::respond($issue, $request);
    }

    /** The full issue, with its timeline, as seen by whoever is asking. */
    public static function respond(Issue $issue, Request $request, int $status = 200): JsonResponse
    {
        $query = Issue::query()->whereKey($issue->id)->with(['reporter', 'updates.author']);
        $fresh = self::withCounts($query, $request)->firstOrFail();

        return IssueResource::make($fresh)->response()->setStatusCode($status);
    }

    private static function withCounts(Builder $query, Request $request): Builder
    {
        $viewerId = $request->user('sanctum')?->id ?? 0;

        return $query
            ->withCount('supporters')
            ->withExists(['supporters as supported' => fn (Builder $q) => $q->where('users.id', $viewerId)]);
    }
}
