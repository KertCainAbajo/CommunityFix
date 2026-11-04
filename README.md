# CommunityFix

A community problem-to-resolution tracker. Residents report broken streetlights, damaged roads, drainage problems and other local issues, then follow each report until it is resolved.

| Part     | Technology                                                    |
| -------- | ------------------------------------------------------------- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Leaflet  |
| Backend  | Laravel API, PHP 8.3+, Laravel Sanctum                        |
| Database | PostgreSQL                                                    |

## Features

**Residents**
- Report a problem with a category, description, address, map pin and photo
- Follow progress on a status tracker and an update history
- Comment on reports and mark "This affects me too"
- Reopen a resolved report if the problem is not actually fixed

**Staff**
- Dashboard with a work queue, open counts and average time to fix
- Move reports through the workflow, with a note to the resident
- Set priority and assign a department

**Public**
- Anyone can browse, search and filter reports and see them on a map, without an account. Resident names are hidden from the public.

## Status workflow

```
Reported → Acknowledged → In progress → Resolved
    └───────────┴──→ Rejected
```

Resolving or rejecting a report requires a note. The reporter can send a resolved report back to Acknowledged.

## Getting started

You need PHP 8.3+, Composer, Node.js 20+ and a PostgreSQL database. The database can be installed locally or hosted.

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Create a database named `communityfix`, then put its connection details in `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

```bash
php artisan migrate --seed   # --seed adds demo accounts and sample reports
php artisan storage:link
php artisan serve            # http://localhost:8000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

### Demo logins

Created by `--seed`, with the password `demo-password`:

| Role     | Email                |
| -------- | -------------------- |
| Staff    | staff@example.com    |
| Resident | resident@example.com |

The seeder refuses to run when `APP_ENV=production`, because these passwords are public.

To add a real staff account, run the command below. It prints a generated password.

```bash
php artisan staff:create "Full Name" person@example.com
```

## Configuration

**`backend/.env`**

| Variable          | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `DB_*`            | PostgreSQL connection                                                |
| `MAP_CENTER`      | Starting map position, as `lat,lng`                                  |
| `FILESYSTEM_DISK` | Where photos are stored: `public` for local files, `s3` for a bucket |

**`frontend/.env.local`**

| Variable  | Purpose                                     |
| --------- | ------------------------------------------- |
| `API_URL` | Address of the Laravel API, ending in `/api` |

## How login works

The browser only talks to Next.js. On login, a Next.js Server Action receives a Sanctum token from Laravel and stores it in an httpOnly cookie, so JavaScript in the browser cannot read it. Next.js then attaches the token to its requests to Laravel. This lets the frontend and API run on different domains.

## Tests

```bash
cd backend
php artisan test             # uses in-memory SQLite, so no database setup is needed

cd frontend
npx next typegen && npx tsc --noEmit
npm run lint
```

## Project layout

```
backend/app/Enums/           Statuses, categories, priorities and allowed status moves
backend/app/Http/            API controllers, validation and JSON output
backend/routes/api.php       API routes
backend/database/            Migrations and demo data
backend/tests/Feature/       API tests
frontend/app/                Pages and Server Actions (actions.ts)
frontend/components/         Forms, maps and shared UI
frontend/lib/api.ts          Server-side API client
```
