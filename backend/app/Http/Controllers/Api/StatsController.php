<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\IssueStats;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function __invoke(IssueStats $stats): JsonResponse
    {
        return response()->json($stats->summary());
    }
}
