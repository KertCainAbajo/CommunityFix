<?php

namespace Database\Factories;

use App\Models\Issue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Issue>
 */
class IssueFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'Broken streetlight on Main St',
            'description' => 'The light has been off for a week.',
            'category' => 'streetlight',
            'address' => '12 Main St',
        ];
    }

    public function verified(): static
    {
        return $this->state(fn () => ['status' => 'acknowledged']);
    }
}
