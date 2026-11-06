<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A notice from staff to everyone, like a road closure or a cleanup drive. */
class Announcement extends Model
{
    protected $fillable = ['title', 'body', 'author_id'];
}
