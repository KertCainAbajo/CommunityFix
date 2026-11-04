import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Filters } from "@/components/filters";
import { EmptyState, PageSkeleton, Pager, ResolutionTime, StatGrid, StatusBadge } from "@/components/issue-parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIssues, getMeta, getStats, getUser, toQuery } from "@/lib/api";
import { daysOpen } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const SORTS = {
  priority: "Priority, then oldest",
  oldest: "Oldest first",
  newest: "Newest first",
  supported: "Most affected",
};

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await getUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "staff") return <EmptyState>The dashboard is for staff accounts.</EmptyState>;

  const filters = toQuery(await searchParams);
  const query = new URLSearchParams(filters);
  if (!query.has("sort")) query.set("sort", "priority");
  if (!query.has("status")) query.set("open", "1");

  const [meta, stats, queue] = await Promise.all([getMeta(), getStats(), getIssues(query.toString())]);
  const most = Math.max(1, ...stats.open_by_category.map((row) => row.n));

  return (
    <>
      <StatGrid
        stats={[
          ["New, needs review", stats.by_status.reported],
          ["Acknowledged", stats.by_status.acknowledged],
          ["In progress", stats.by_status.in_progress],
          ["Average time to fix", <ResolutionTime key="time" stats={stats} />],
        ]}
      />

      {stats.open_by_category.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Open reports by category</h2>
          <ul className="grid gap-2">
            {stats.open_by_category.map((row) => (
              <li key={row.category} className="grid grid-cols-[minmax(120px,210px)_1fr_32px] items-center gap-3 text-sm">
                <span>{meta.categories[row.category]}</span>
                <span className="h-3 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-r-full bg-primary" style={{ width: `${(row.n / most) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">{row.n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3.5">
        <h2 className="text-xl font-semibold">Work queue</h2>
        <Filters
          action="/dashboard"
          values={Object.fromEntries(query)}
          statuses={meta.statuses}
          categories={meta.categories}
          sorts={SORTS}
        />
        {queue.items.length > 0 ? (
          <div className="rounded-xl border bg-card">
            <Table className="min-w-190">
              <TableHeader>
                <TableRow>
                  {["Ref", "Problem", "Status", "Priority", "Assigned"].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead className="text-right">Affected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.items.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="align-top">
                      <Link href={`/issues/${issue.id}`} className="font-mono text-primary underline">{issue.ref}</Link>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <Link href={`/issues/${issue.id}`} className="text-primary underline">{issue.title}</Link>
                      <div className="text-muted-foreground">{issue.address}</div>
                    </TableCell>
                    <TableCell className="align-top"><StatusBadge status={issue.status} meta={meta} /></TableCell>
                    <TableCell className={`align-top font-semibold ${issue.priority === "urgent" || issue.priority === "high" ? "text-destructive" : ""}`}>
                      {meta.priorities[issue.priority]}
                    </TableCell>
                    <TableCell className="align-top">
                      {issue.department ?? <span className="text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">{daysOpen(issue.created_at)}d</TableCell>
                    <TableCell className="text-right align-top tabular-nums">{issue.support_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState>The queue is clear.</EmptyState>
        )}
        <Pager
          page={queue.page}
          pages={queue.pages}
          href={(page) => {
            const next = new URLSearchParams(filters);
            next.set("page", String(page));
            return `/dashboard?${next}`;
          }}
        />
      </section>
    </>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}
