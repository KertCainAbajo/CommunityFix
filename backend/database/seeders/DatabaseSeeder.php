<?php

namespace Database\Seeders;

use App\Enums\IssueStatus;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/** Demo accounts and sample reports. The passwords are public, so it refuses to run in production. */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Demo data must not be seeded in production.');
        }

        $password = 'demo-password';
        $admin = User::create(['name' => 'Dana Reyes', 'email' => 'staff@example.com', 'password' => $password]);
        $admin->forceFill(['role' => 'admin'])->save();
        User::create(['name' => 'Rey Lim', 'email' => 'team@example.com', 'password' => $password]);
        $resident = User::create(['name' => 'Maria Santos', 'email' => 'resident@example.com', 'phone' => '+639170000001', 'password' => $password]);
        $resident->forceFill(['role' => 'resident', 'email_verified_at' => now()])->save();

        $center = config('communityfix.map_center');

        foreach ($this->samples() as $sample) {
            $created = now()->subDays($sample['age']);
            $last = end($sample['steps']) ?: null;
            $status = $last ? $last[0] : IssueStatus::Reported;
            $updated = $last ? now()->subDays($last[1]) : $created;

            $issue = new Issue([
                'title' => $sample['title'],
                'description' => $sample['description'],
                'category' => $sample['category'],
                'address' => $sample['address'],
                'lat' => $center['lat'] + $sample['offset'][0],
                'lng' => $center['lng'] + $sample['offset'][1],
                'status' => $status,
                'priority' => $sample['priority'] ?? 'normal',
                'department' => $sample['department'] ?? null,
                'contact_name' => $sample['contact'] ?? null,
                'contact_email' => isset($sample['contact']) ? 'resident@example.com' : null,
                'resolved_at' => $status === IssueStatus::Resolved ? $updated : null,
            ]);
            $issue->created_at = $created;
            $issue->updated_at = $updated;
            $issue->save();

            $issue->updates()->create(['to_status' => IssueStatus::Reported, 'created_at' => $created]);

            $from = IssueStatus::Reported;
            foreach ($sample['steps'] as [$to, $age, $note]) {
                $issue->updates()->create([
                    'author_id' => $admin->id, 'from_status' => $from, 'to_status' => $to,
                    'note' => $note, 'created_at' => now()->subDays($age),
                ]);
                $from = $to;
            }
        }
    }

    private function samples(): array
    {
        $ack = IssueStatus::Acknowledged;
        $work = IssueStatus::InProgress;
        $done = IssueStatus::Resolved;

        return [
            ['title' => 'Streetlight out near the covered court', 'category' => 'streetlight', 'address' => 'Mabini St. corner Luna St.', 'offset' => [0.004, -0.006], 'age' => 2, 'contact' => 'Sam Cruz',
                'description' => 'The light on the second pole from the corner has been off for a week. The whole stretch is dark after 7 PM.', 'steps' => []],
            ['title' => 'Deep pothole in the northbound lane', 'category' => 'road', 'address' => 'Rizal Avenue, in front of the public market', 'offset' => [-0.003, 0.005], 'age' => 9, 'priority' => 'high', 'department' => 'Engineering Office', 'contact' => 'Sam Cruz',
                'description' => 'Roughly a meter wide and deep enough to damage tires. Tricycles swerve into the other lane to avoid it.',
                'steps' => [[$ack, 8, 'Inspection scheduled for this week.'], [$work, 3, 'Crew assigned. Patching starts once the materials arrive.']]],
            ['title' => 'Clogged canal floods the street when it rains', 'category' => 'drainage', 'address' => 'Sampaguita St., near the elementary school', 'offset' => [0.007, 0.003], 'age' => 16, 'priority' => 'urgent', 'department' => 'Public Works', 'contact' => 'Sam Cruz',
                'description' => 'Even light rain leaves ankle-deep water in front of the school gate. The canal is blocked by silt and plastic.',
                'steps' => [[$ack, 15, 'Declogging added to the priority list.'], [$work, 10, 'Crew is clearing the canal section by section.']]],
            ['title' => 'Burned-out lamp at the waiting shed', 'category' => 'streetlight', 'address' => 'Bonifacio St. waiting shed', 'offset' => [-0.006, -0.004], 'age' => 21, 'department' => 'Electrical Section',
                'description' => 'The lamp above the waiting shed stopped working. Commuters wait in the dark in the early morning.',
                'steps' => [[$ack, 20, null], [$work, 18, 'Replacement lamp requested.'], [$done, 14, 'New LED lamp installed and tested.']]],
            ['title' => 'Garbage piling up beside the vacant lot', 'category' => 'waste', 'address' => 'Del Pilar St., beside the vacant lot', 'offset' => [0.002, 0.008], 'age' => 5,
                'description' => 'Bags have been dumped here for several days and are starting to smell. Collection trucks skip this corner.',
                'steps' => [[$ack, 4, 'Forwarded to the sanitation team.']]],
            ['title' => 'Water leaking from a pipe under the sidewalk', 'category' => 'water', 'address' => 'Aguinaldo St. near the health center', 'offset' => [-0.001, -0.008], 'age' => 30, 'priority' => 'high', 'department' => 'Water District',
                'description' => 'Clean water has been running along the curb day and night, and the sidewalk slab above it is starting to sink.',
                'steps' => [[$ack, 29, null], [$work, 26, 'Excavation permit approved.'], [$done, 22, 'Pipe joint replaced and the sidewalk restored.']]],
            ['title' => 'Broken sidewalk slab near the bus stop', 'category' => 'sidewalk', 'address' => 'Quezon Boulevard bus stop', 'offset' => [-0.008, 0.002], 'age' => 1,
                'description' => 'A slab has tilted up by several centimeters. Older residents have already tripped on it.', 'steps' => []],
            ['title' => 'Request to repaint a private gate', 'category' => 'other', 'address' => 'Jasmine St.', 'offset' => [0.009, -0.002], 'age' => 12, 'priority' => 'low',
                'description' => 'The gate in front of my house has faded paint and I would like it repainted.',
                'steps' => [[IssueStatus::Rejected, 11, 'Private property is outside the scope of this service.']]],
        ];
    }
}
