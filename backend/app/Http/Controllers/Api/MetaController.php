<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueCategory;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/** The labels and rules the frontend needs, so they live in one place. */
class MetaController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $labels = fn (array $cases) => collect($cases)->mapWithKeys(fn ($case) => [$case->value => $case->label()]);

        return response()->json([
            'categories' => $labels(IssueCategory::cases()),
            'statuses' => $labels(IssueStatus::cases()),
            'priorities' => $labels(IssuePriority::cases()),
            'transitions' => collect(IssueStatus::cases())->mapWithKeys(fn (IssueStatus $status) => [
                $status->value => array_map(fn (IssueStatus $to) => $to->value, $status->transitions()),
            ]),
            'map_center' => config('communityfix.map_center'),
            'google_login' => GoogleAuthController::enabled(),
        ]);
    }
}
