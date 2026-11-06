<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\Concerns\ActsOnIssues;
use Tests\TestCase;

class ResidentAccountTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutDefer();
    }

    public function test_guests_can_only_see_overall_figures(): void
    {
        $code = $this->report()->tracking_code;
        $this->asGuest();

        $this->getJson('/api/meta')->assertOk();
        $this->getJson('/api/stats')->assertOk();

        $this->getJson('/api/issues')->assertUnauthorized();
        $this->getJson('/api/issues/1')->assertUnauthorized();
        $this->getJson('/api/activity')->assertUnauthorized();
        $this->getJson('/api/my/issues')->assertUnauthorized();
        $this->getJson("/api/track/{$code}")->assertUnauthorized();
        $this->postJson("/api/track/{$code}/reopen", ['note' => 'Still broken.'])->assertUnauthorized();
        $this->postJson('/api/issues', self::REPORT)->assertUnauthorized();
    }

    public function test_residents_sign_up_with_an_email_and_get_a_working_session(): void
    {
        $token = $this->postJson('/api/auth/register', ['name' => 'Ana Cruz', 'email' => 'Ana@Example.com', 'password' => 'password123'])
            ->assertCreated()
            ->assertJsonPath('user.role', 'resident')
            ->assertJsonPath('user.email', 'ana@example.com')
            ->json('token');

        $this->getJson('/api/auth/me', ['Authorization' => "Bearer {$token}"])->assertOk()->assertJsonPath('user.name', 'Ana Cruz');
    }

    public function test_residents_can_add_a_phone_number_in_any_format_and_sign_in_with_it(): void
    {
        $this->postJson('/api/auth/register', ['name' => 'Ben', 'email' => 'ben@example.com', 'phone' => '0917 123 4567', 'password' => 'password123'])
            ->assertCreated()
            ->assertJsonPath('user.phone', '+639171234567');

        foreach (['09171234567', '+63 917-123-4567', '639171234567'] as $phone) {
            $this->postJson('/api/auth/login', ['login' => $phone, 'password' => 'password123'])->assertOk();
        }
    }

    public function test_sign_up_needs_an_email_and_refuses_ones_already_used(): void
    {
        $this->postJson('/api/auth/register', ['name' => 'Ana', 'phone' => '09171234567', 'password' => 'password123'])
            ->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $this->postJson('/api/auth/register', ['name' => 'Ana', 'email' => 'a@example.com', 'phone' => '12', 'password' => 'password123'])
            ->assertUnprocessable()->assertJsonValidationErrors(['phone']);
        $this->postJson('/api/auth/register', ['name' => 'Ana', 'email' => 'a@example.com', 'password' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);

        User::factory()->create(['email' => 'taken@example.com']);
        $this->postJson('/api/auth/register', ['name' => 'Ana', 'email' => 'TAKEN@example.com', 'password' => 'password123'])
            ->assertUnprocessable()->assertJsonValidationErrors(['email']);
    }

    public function test_sign_up_can_never_make_a_staff_account(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Sneaky', 'email' => 's@example.com', 'password' => 'password123', 'role' => 'admin', 'is_active' => true,
        ])->assertCreated()->assertJsonPath('user.role', 'resident');

        $this->assertFalse(User::where('email', 's@example.com')->first()->isStaff());
    }

    public function test_residents_cannot_use_staff_tools_or_appear_in_the_staff_list(): void
    {
        $resident = User::factory()->resident()->create();
        $issue = $this->report();

        Sanctum::actingAs($resident);
        $this->move($issue, 'acknowledged')->assertForbidden();
        $this->getJson('/api/analytics')->assertForbidden();
        $this->getJson('/api/staff')->assertForbidden();

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->getJson('/api/staff')->assertOk()->assertJsonMissing(['email' => $resident->email]);
        $this->patchJson("/api/staff/{$resident->id}", ['role' => 'admin'])->assertNotFound();
        $this->assertSame('resident', $resident->refresh()->role);
    }

    public function test_the_staff_tab_turns_away_resident_accounts(): void
    {
        User::factory()->resident()->create(['email' => 'res@example.com', 'password' => 'password123']);
        User::factory()->create(['email' => 'staff@example.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', ['login' => 'res@example.com', 'password' => 'password123', 'portal' => 'staff'])
            ->assertForbidden()->assertJsonPath('message', 'This is a resident account. Use the Resident tab to sign in.');
        $this->postJson('/api/auth/login', ['login' => 'res@example.com', 'password' => 'password123', 'portal' => 'resident'])->assertOk();
        $this->postJson('/api/auth/login', ['login' => 'staff@example.com', 'password' => 'password123', 'portal' => 'staff'])->assertOk();
    }

    public function test_reports_filed_while_signed_in_are_kept_on_the_account(): void
    {
        $resident = User::factory()->resident()->create(['name' => 'Ana', 'email' => 'ana@example.com', 'phone' => '+639171234567']);
        Sanctum::actingAs($resident);
        $issue = $this->report();

        $this->assertSame($resident->id, $issue->user_id);
        $this->assertSame('ana@example.com', $issue->contact_email);
        $this->assertSame('+639171234567', $issue->contact_phone);

        $this->getJson('/api/my/issues')
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.tracking_code', $issue->tracking_code)
            ->assertJsonMissing(['contact' => ['name' => 'Ana']]);
    }

    public function test_residents_only_see_their_own_reports_and_codes(): void
    {
        $owner = User::factory()->resident()->create();
        Sanctum::actingAs($owner);
        $issue = $this->report();
        $this->resolve($issue);

        Sanctum::actingAs(User::factory()->resident()->create());
        $this->getJson('/api/my/issues')->assertOk()->assertJsonCount(0, 'items');
        $this->getJson("/api/issues/{$issue->id}")->assertOk()->assertJsonMissingPath('tracking_code');

        $this->asGuest();
        $this->getJson('/api/my/issues')->assertUnauthorized();
    }

    public function test_google_sign_in_is_hidden_until_it_is_set_up(): void
    {
        config(['services.google.client_id' => null]);

        $this->getJson('/api/meta')->assertJsonPath('google_login', false);
        $this->postJson('/api/auth/google/url', ['state' => str_repeat('a', 40)])->assertNotFound();
    }

    public function test_google_sign_in_creates_a_resident_and_links_by_verified_email(): void
    {
        $this->enableGoogle();
        $existing = User::factory()->resident()->create(['email' => 'ana@example.com']);

        $this->fakeGoogle('g-1', 'ANA@example.com', verified: true);
        $this->postJson('/api/auth/google/callback', ['code' => 'abc'])->assertOk()->assertJsonPath('user.id', $existing->id);
        $this->assertSame('g-1', $existing->refresh()->google_id);

        $this->fakeGoogle('g-2', 'new@example.com', verified: true);
        $this->postJson('/api/auth/google/callback', ['code' => 'abc'])->assertOk()->assertJsonPath('user.role', 'resident');
        $this->assertNull(User::where('google_id', 'g-2')->first()->password);
    }

    public function test_google_sign_in_never_takes_over_staff_or_unverified_addresses(): void
    {
        $this->enableGoogle();
        User::factory()->create(['email' => 'staff@example.com']);
        $resident = User::factory()->resident()->create(['email' => 'res@example.com']);

        $this->fakeGoogle('g-1', 'staff@example.com', verified: true);
        $this->postJson('/api/auth/google/callback', ['code' => 'abc'])->assertForbidden();

        $this->fakeGoogle('g-2', 'res@example.com', verified: false);
        $this->postJson('/api/auth/google/callback', ['code' => 'abc'])->assertOk()
            ->assertJsonPath('user.email', null);
        $this->assertNull($resident->refresh()->google_id);
    }

    public function test_a_google_only_account_cannot_be_used_with_an_empty_password(): void
    {
        $this->enableGoogle();
        $this->fakeGoogle('g-1', 'ana@example.com', verified: true);
        $this->postJson('/api/auth/google/callback', ['code' => 'abc'])->assertOk();

        $this->postJson('/api/auth/login', ['login' => 'ana@example.com', 'password' => ''])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['login' => 'ana@example.com', 'password' => 'anything'])->assertUnauthorized();
    }

    private ?GoogleUser $googleUser = null;

    /** Turns Google on, with a stand-in for Google that answers as `fakeGoogle` last said. */
    private function enableGoogle(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);

        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('redirectUrl')->andReturnSelf();
        $provider->shouldReceive('user')->andReturnUsing(fn () => $this->googleUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    private function fakeGoogle(string $id, string $email, bool $verified): void
    {
        $this->googleUser = (new GoogleUser)
            ->setRaw(['email_verified' => $verified])
            ->map(['id' => $id, 'name' => 'Ana Cruz', 'email' => $email]);
    }
}
