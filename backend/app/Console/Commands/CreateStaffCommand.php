<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CreateStaffCommand extends Command
{
    protected $signature = 'staff:create {name} {email} {--admin : Allow this person to manage staff accounts}';

    protected $description = 'Create a staff account with a generated password';

    public function handle(): int
    {
        $password = Str::password(16, symbols: false);

        $user = User::create([
            'name' => $this->argument('name'),
            'email' => Str::lower($this->argument('email')),
            'password' => $password,
        ]);
        $user->forceFill(['role' => $this->option('admin') ? 'admin' : 'staff'])->save();

        $this->info("Created {$user->role} account for {$user->email}");
        $this->line("Password: {$password}");

        return self::SUCCESS;
    }
}
