<?php

namespace App\Policies;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class IssuePolicy
{
    public function manage(User $user, Issue $issue): Response
    {
        return $user->isStaff() ? Response::allow() : Response::deny('Only staff can do this.');
    }

    public function reopen(User $user, Issue $issue): Response
    {
        return $user->id === $issue->reporter_id
            ? Response::allow()
            : Response::deny('Only the person who reported this can reopen it.');
    }
}
