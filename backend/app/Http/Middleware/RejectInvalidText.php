<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** PostgreSQL refuses invalid UTF-8 and NUL bytes, so stop them before they reach a query. */
class RejectInvalidText
{
    public function handle(Request $request, Closure $next): Response
    {
        $valid = true;
        $input = [$request->query(), $request->input()];

        array_walk_recursive($input, function ($value) use (&$valid) {
            if (is_string($value) && (! mb_check_encoding($value, 'UTF-8') || str_contains($value, "\0"))) {
                $valid = false;
            }
        });

        abort_unless($valid, 422, 'That request contains invalid characters.');

        return $next($request);
    }
}
