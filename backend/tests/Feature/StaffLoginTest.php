<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\Concerns\ActsOnIssues;
use Tests\TestCase;

class StaffLoginTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

    public function test_login_returns_a_working_token_and_logout_revokes_it(): void
    {
        User::factory()->create(['email' => 'me@example.com', 'password' => 'password123']);

        $token = $this->postJson('/api/auth/login', ['email' => 'ME@example.com', 'password' => 'password123'])
            ->assertOk()->json('token');

        $headers = ['Authorization' => "Bearer {$token}"];
        $this->getJson('/api/auth/me', $headers)->assertOk()->assertJsonPath('user.email', 'me@example.com');

        $this->postJson('/api/auth/logout', [], $headers)->assertNoContent();
        $this->asGuest();
        $this->getJson('/api/auth/me', $headers)->assertUnauthorized();
    }

    public function test_login_rejects_bad_credentials(): void
    {
        User::factory()->create(['email' => 'me@example.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', ['email' => 'me@example.com', 'password' => 'wrong-password'])->assertUnauthorized();
        $this->postJson('/api/auth/login', ['email' => 'ghost@example.com', 'password' => 'wrong-password'])->assertUnauthorized();
    }

    public function test_login_is_rate_limited_per_account(): void
    {
        foreach (range(1, 10) as $attempt) {
            $this->postJson('/api/auth/login', ['email' => 'target@example.com', 'password' => 'guess'])->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', ['email' => 'target@example.com', 'password' => 'guess'])->assertTooManyRequests();
        $this->postJson('/api/auth/login', ['email' => 'other@example.com', 'password' => 'guess'])->assertUnauthorized();
    }

    public function test_expired_tokens_are_cleared_on_login(): void
    {
        $user = User::factory()->create(['email' => 'me@example.com', 'password' => 'password123']);
        $user->createToken('old', expiresAt: now()->subDay());

        $this->postJson('/api/auth/login', ['email' => 'me@example.com', 'password' => 'password123'])->assertOk();

        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_malformed_logins_are_rejected_cleanly(): void
    {
        $this->postJson('/api/auth/login', ['email' => ['a'], 'password' => 'x'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['email' => "a\0b@example.com", 'password' => 'x'])->assertUnprocessable();
    }

    public function test_a_reset_link_points_at_the_website(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'me@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'ME@example.com'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, config('communityfix.frontend_url').'/staff/reset-password?token=')
                && str_contains($url, 'email=me%40example.com');
        });
    }

    public function test_forgot_password_does_not_reveal_who_has_an_account(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'me@example.com']);

        $known = $this->postJson('/api/auth/forgot-password', ['email' => 'me@example.com']);
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'ghost@example.com']);

        $this->assertSame($known->json(), $unknown->json());
        $unknown->assertOk();
    }

    public function test_resetting_a_password_changes_it_and_ends_old_sessions(): void
    {
        $user = User::factory()->create(['email' => 'me@example.com', 'password' => 'old-password']);
        $user->createToken('web');
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', ['token' => $token, 'email' => 'me@example.com', 'password' => 'new-password'])
            ->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_a_bad_reset_token_is_refused(): void
    {
        $user = User::factory()->create(['email' => 'me@example.com', 'password' => 'old-password']);

        $this->postJson('/api/auth/reset-password', ['token' => 'wrong', 'email' => 'me@example.com', 'password' => 'new-password'])
            ->assertUnprocessable();

        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    public function test_staff_accounts_can_be_created_from_the_command_line(): void
    {
        $this->artisan('staff:create', ['name' => 'New Staff', 'email' => 'NEW@Example.com', '--admin' => true])->assertSuccessful();

        $this->assertTrue(User::where('email', 'new@example.com')->firstOrFail()->isAdmin());
    }

    public function test_demo_data_cannot_be_seeded_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->expectExceptionMessage('must not be seeded in production');
        $this->app->make(DatabaseSeeder::class)->run();
    }
}
