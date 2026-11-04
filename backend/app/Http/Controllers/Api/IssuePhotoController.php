<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\StorePhotoRequest;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;

class IssuePhotoController extends Controller
{
    use RespondsWithIssue;

    public function store(Issue $issue, StorePhotoRequest $request, IssueWorkflow $workflow): JsonResponse
    {
        $workflow->addPhoto($issue, $request->file('photo'), $request->kind(), $request->user());

        return $this->issueResponse($issue, 201);
    }
}
