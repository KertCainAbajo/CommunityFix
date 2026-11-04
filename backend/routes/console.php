<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('staff:create {name} {email}', function (string $name, string $email) {
    $password = Str::password(16, symbols: false);
    $user = User::create(['name' => $name, 'email' => strtolower($email), 'password' => $password]);
    $user->forceFill(['role' => 'staff'])->save();

    $this->info("Created staff account for {$user->email}");
    $this->line("Password: {$password}");
})->purpose('Create a staff account with a generated password');
