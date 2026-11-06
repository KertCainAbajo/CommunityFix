import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Filters } from "@/components/filters";
import { EmptyState, IssueList, Legend, PageSkeleton, Pager, StatusBadge, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { ActivityFeed, Card, FiguresBar, NeedsAttention } from "@/components/overview";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnnouncementForm, DeleteAnnouncement } from "@/components/resident-forms";
import { getActivity, getAnnouncements, getIssues, getMeta, getStats, requireStaff, toQuery } from "@/lib/api";
import { daysOpen, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const SORTS = {
  priority: "Priority, then oldest",
  oldest: "Oldest first",
  newest: "Newest first",
};

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  await requireStaff("/dashboard");

  const filters = toQuery(await searchParams);
  const query = new URLSearchParams(filters);
  if (!query.has("sort")) query.set("sort", "priority");
  if (!query.has("status")) query.set("open", "1");

  const [meta, stats, queue, open, waiting, activity, news] = await Promise.all([
    getMeta(),
    getStats(),
    getIssues(query.toString()),
    getIssues("open=1&sort=priority"),
    getIssues("status=reported&sort=oldest"),
    getActivity(),
    getAnnouncements(),
  ]);

  return (
    <>
      <FiguresBar stats={stats} />

      <section aria-labelledby="map-title" className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3.5">
          <h2 id="map-title" className="text-xl">Open reports</h2>
          <Legend meta={meta} statuses={["reported", "acknowledged", "in_progress"]} />
        </div>
        <div className="lg:relative">
          <IssueMap points={mapPoints(open.items)} center={meta.map_center} className="h-120 rounded-none border-x-0 border-b-0" />
          <NeedsAttention issues={open.items} meta={meta} />
        </div>
      </section>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card title="Waiting for review" id="waiting-title" action={{ href: "/dashboard?status=reported", label: "View all" }}>
          {waiting.items.length > 0 ? (
            <IssueList issues={waiting.items.slice(0, 4)} meta={meta} />
          ) : (
            <EmptyState>Nothing is waiting for review.</EmptyState>
          )}
        </Card>
        <Card title="Latest activity" id="activity-title">
          <ActivityFeed items={activity.items.slice(0, 4)} meta={meta} />
        </Card>
      </div>

      <Card title="Announcements to residents" id="news-title">
        <div className="grid gap-5 lg:grid-cols-2">
          <AnnouncementForm />
          {news.items.length > 0 ? (
            <ul className="divide-y">
              {news.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2.5 [overflow-wrap:anywhere]">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
                  </div>
                  <DeleteAnnouncement id={item.id} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nothing posted yet. Announcements appear on every resident&apos;s home page.</EmptyState>
          )}
        </div>
      </Card>

      <section id="work-queue" className="grid scroll-mt-4 gap-3.5 pt-2">
        <h2 className="text-2xl">Work queue</h2>
        <Filters
          action="/dashboard"
          values={Object.fromEntries(query)}
          statuses={meta.statuses}
          categories={meta.categories}
          sorts={SORTS}
        />
        {queue.items.length > 0 ? (
          <div className="card overflow-hidden">
            <Table className="min-w-170">
              <TableHeader>
                <TableRow>
                  {["Ref", "Problem", "Status", "Priority", "Team"].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                  <TableHead className="text-right">Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.items.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="align-top">
                      <Link href={`/issues/${issue.id}`} className="link">{issue.ref}</Link>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      <Link href={`/issues/${issue.id}`} className="link">{issue.title}</Link>
                      <div className="text-muted-foreground">{issue.address}</div>
                      {!!issue.supporters && <div className="text-sm font-semibold text-primary">+{issue.supporters} also affected</div>}
                    </TableCell>
                    <TableCell className="align-top"><StatusBadge status={issue.status} meta={meta} /></TableCell>
                    <TableCell className={`align-top font-bold ${issue.priority === "urgent" || issue.priority === "high" ? "text-destructive" : ""}`}>
                      {meta.priorities[issue.priority]}
                    </TableCell>
                    <TableCell className="align-top">
                      {issue.department ?? <span className="text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">{daysOpen(issue.created_at)}d</TableCell>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Dashboard</h1>
        <Link href="/dashboard?status=reported" className={buttonVariants({ className: "cta h-12 px-5" })}>Review new reports</Link>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}
