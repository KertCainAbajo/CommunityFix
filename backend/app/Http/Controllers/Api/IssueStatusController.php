<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\ChangeStatusRequest;
use App\Http\Requests\Issue\NoteRequest;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;

class IssueStatusController extends Controller
{
    use RespondsWithIssue;

    public function __construct(private IssueWorkflow $workflow) {}

    public function update(Issue $issue, ChangeStatusRequest $request): JsonResponse
    {
        $this->workflow->changeStatus($issue, $request->status(), $request->user(), $request->validated('note'));

        return $this->issueResponse($issue, $request);
    }

    public function reopen(Issue $issue, NoteRequest $request): JsonResponse
    {
        $this->workflow->reopen($issue, $request->user(), $request->validated('note'));

        return $this->issueResponse($issue, $request);
    }
}
