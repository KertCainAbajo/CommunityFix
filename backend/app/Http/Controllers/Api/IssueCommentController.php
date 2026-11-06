<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\StaffNoteRequest;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;

class IssueCommentController extends Controller
{
    use RespondsWithIssue;

    public function store(Issue $issue, StaffNoteRequest $request, IssueWorkflow $workflow): JsonResponse
    {
        $workflow->postUpdate($issue, $request->user(), $request->validated('note'));

        return $this->issueResponse($issue, 201);
    }
}
