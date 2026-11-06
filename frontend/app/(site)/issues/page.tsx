import { LayoutGrid, Map as MapIcon, Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Filters } from "@/components/filters";
import { EmptyState, Legend, PageSkeleton, Pager, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { ReportCard } from "@/components/report-card";
import { buttonVariants } from "@/components/ui/button";
import { getIssues, getMeta, getStats, toQuery } from "@/lib/api";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "All reports" };

const SORTS = { newest: "Newest first", oldest: "Oldest first" };
const PUBLIC_STATUSES: Status[] = ["acknowledged", "in_progress", "resolved"];

async function Reports({ searchParams }: Pick<PageProps<"/issues">, "searchParams">) {
  const query = toQuery(await searchParams);
  const showMap = query.get("view") === "map";
  query.delete("view");

  const [meta, stats, data] = await Promise.all([getMeta(), getStats(), getIssues(query.toString())]);
  const status = query.get("status") ?? "";
  const view = showMap ? "map" : "";

  /** The same search with a few things changed. Going to page 1, because the results are different. */
  const link = (changes: Record<string, string>) => {
    const next = new URLSearchParams(query);
    next.delete("page");
    if (view) next.set("view", view);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `/issues${next.size > 0 ? `?${next}` : ""}`;
  };

  const tabs = [
    { key: "", label: "All", count: PUBLIC_STATUSES.reduce((sum, stage) => sum + stats.by_status[stage], 0) },
    ...PUBLIC_STATUSES.map((stage) => ({ key: stage as string, label: meta.statuses[stage], count: stats.by_status[stage] })),
  ];
  const values = Object.fromEntries(query);

  return (
    <>
      <section aria-label="Filter reports" className="filter-card">
        <Filters
          action="/issues"
          values={values}
          categories={meta.categories}
          sorts={SORTS}
          keep={{ status, view }}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link key={tab.label} href={link({ status: tab.key })} aria-current={status === tab.key ? "page" : undefined} className="status-tab">
              {tab.label} <span className="status-tab-count">{tab.count}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "report" : "reports"} found
          </p>
          <div className="view-switch">
            <Link href={link({ view: "" })} aria-current={showMap ? undefined : "page"}><LayoutGrid aria-hidden className="size-4" /> Cards</Link>
            <Link href={link({ view: "map" })} aria-current={showMap ? "page" : undefined}><MapIcon aria-hidden className="size-4" /> Map</Link>
          </div>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="card">
          <EmptyState>Nothing matches those filters.</EmptyState>
        </div>
      ) : showMap ? (
        <section aria-label="Reports on a map" className="card overflow-hidden">
          <div className="px-6 py-4"><Legend meta={meta} statuses={PUBLIC_STATUSES} /></div>
          <IssueMap points={mapPoints(data.items)} center={meta.map_center} className="h-140 rounded-none border-x-0 border-b-0" />
        </section>
      ) : (
        <ul className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4")}>
          {data.items.map((issue) => <ReportCard key={issue.id} issue={issue} meta={meta} />)}
        </ul>
      )}

      <Pager
        page={data.page}
        pages={data.pages}
        href={(page) => {
          const next = new URLSearchParams(query);
          if (view) next.set("view", view);
          next.set("page", String(page));
          return `/issues?${next}`;
        }}
      />
    </>
  );
}

export default function IssuesPage({ searchParams }: PageProps<"/issues">) {
  return (
    <>
      <section className="page-hero">
        <img src="/portal-hero.jpg" alt="A barangay hall with a flag and parked motorcycles" />
        <div className="portal-rise relative grid max-w-2xl gap-3 p-6 pb-24 sm:p-10 sm:pb-24">
          <h1 className="text-4xl text-white sm:text-5xl">All reports</h1>
          <p className="max-w-lg text-lg text-white/90">See what&apos;s being fixed around your barangay. Reports appear here once staff have verified them.</p>
          <div className="pt-1">
            <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-6 text-base" })}>
              <Megaphone aria-hidden className="size-4.5" /> Report a problem
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<PageSkeleton />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
