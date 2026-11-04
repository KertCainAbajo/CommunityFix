<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\ListIssuesRequest;
use App\Http\Requests\Issue\StoreIssueRequest;
use App\Http\Requests\Issue\UpdateIssueRequest;
use App\Http\Resources\IssueResource;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IssueController extends Controller
{
    use RespondsWithIssue;

    private const PAGE_SIZE = 20;

    public function index(ListIssuesRequest $request): JsonResponse
    {
        $page = Issue::query()
            ->with('photos')
            ->visibleTo($request->user('sanctum'))
            ->filter($request->filters())
            ->sortBy($request->validated('sort'))
            ->paginate(self::PAGE_SIZE);

        return response()->json([
            'items' => IssueResource::collection($page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'pages' => $page->lastPage(),
        ]);
    }

    public function store(StoreIssueRequest $request, IssueWorkflow $workflow): JsonResponse
    {
        $issue = $workflow->report($request->details(), $request->file('photos', []));

        return response()->json(['ref' => $issue->ref(), 'tracking_code' => $issue->tracking_code], 201);
    }

    public function show(Issue $issue, Request $request): JsonResponse
    {
        abort_unless($issue->status->isPublic() || $request->user('sanctum')?->isStaff(), 403, 'This report is not public.');

        return $this->issueResponse($issue);
    }

    public function update(Issue $issue, UpdateIssueRequest $request): JsonResponse
    {
        $issue->update($request->validated());

        return $this->issueResponse($issue);
    }
}
