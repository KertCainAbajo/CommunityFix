import { CircleCheckBig, CircleHelp, Clock3, LayoutGrid, Map as MapIcon, Megaphone, SearchX, TrendingUp, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ReportSearch } from "@/components/filters";
import { CATEGORY_ICONS, Legend, Pager, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { ReportCard } from "@/components/report-card";
import { buttonVariants } from "@/components/ui/button";
import { getIssues, getMeta, getStats, toQuery } from "@/lib/api";
import type { Status } from "@/lib/types";

export const metadata: Metadata = { title: "All reports" };

const SORTS = { newest: "Newest first", oldest: "Oldest first" };
const PUBLIC_STATUSES: Status[] = ["acknowledged", "in_progress", "resolved"];

/** Live figures beside the banner headline. */
async function Glance() {
  const [meta, stats] = await Promise.all([getMeta(), getStats()]);
  const shown = PUBLIC_STATUSES.reduce((sum, stage) => sum + stats.by_status[stage], 0);
  const fixed = shown > 0 ? Math.round((stats.by_status.resolved / shown) * 100) : 0;
  const top = stats.open_by_category[0];
  const rows = [
    { Icon: CircleCheckBig, label: "Fixed so far", value: `${fixed}% of ${shown}` },
    { Icon: Clock3, label: "Average fix time", value: stats.avg_resolution_days === null ? "Not yet" : `${stats.avg_resolution_days} days` },
    { Icon: TrendingUp, label: "Most reported now", value: top ? meta.categories[top.category] : "Nothing open" },
  ];

  return (
    <section aria-labelledby="glance-title" className="track-panel hidden xl:grid">
      <h2 id="glance-title" className="text-sm font-semibold text-[#dbe5f2]">Your community at a glance</h2>
      <ul className="grid gap-3">
        {rows.map(({ Icon, label, value }) => (
          <li key={label} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 leading-tight">
            <span className="row-span-2 grid size-10 place-items-center rounded-xl bg-white/12 text-[#86efac]"><Icon aria-hidden className="size-5" /></span>
            <span className="self-end text-sm text-[#dbe5f2]">{label}</span>
            <span className="self-start font-heading text-lg font-bold text-white">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Placeholder cards in the same grid, so nothing jumps when the reports arrive. */
function ReportsSkeleton() {
  return (
    <div aria-label="Loading reports" role="status" className="grid gap-6">
      <div className="filter-card h-44" />
      <ul className="bento">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} className="card animate-pulse overflow-hidden">
            <div className="h-full min-h-60 bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}

async function Reports({ searchParams }: Pick<PageProps<"/issues">, "searchParams">) {
  const query = toQuery(await searchParams);
  const showMap = query.get("view") === "map";
  query.delete("view");

  const [meta, stats, data] = await Promise.all([getMeta(), getStats(), getIssues(query.toString())]);
  const status = query.get("status") ?? "";
  const category = query.get("category") ?? "";
  const search = query.get("q") ?? "";
  const view = showMap ? "map" : "";
  const filtered = Boolean(status || category || search);

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
  // The newest report gets the big tile, when the page is showing the full, unfiltered list.
  const featured = !showMap && !filtered && data.page === 1 && data.items.length >= 3;

  return (
    <>
      <section aria-label="Find reports" className="filter-card grid gap-4">
        <ReportSearch search={search} sort={query.get("sort") ?? "newest"} sorts={SORTS} keep={{ status, view, category }} />
        <nav aria-label="Filter by type of problem" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link href={link({ category: "" })} aria-current={category ? undefined : "page"} className="cat-chip">
            All types
          </Link>
          {Object.entries(meta.categories).map(([key, label]) => {
            const Icon = CATEGORY_ICONS[key] ?? CircleHelp;
            return (
              <Link key={key} href={link({ category: key })} aria-current={category === key ? "page" : undefined} className="cat-chip">
                <Icon aria-hidden className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link key={tab.label} href={link({ status: tab.key })} aria-current={status === tab.key ? "page" : undefined} className="status-tab">
              {tab.label} <span className="status-tab-count">{tab.count}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "report" : "reports"} found
          </p>
          {filtered && (
            <Link href={view ? "/issues?view=map" : "/issues"} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <X aria-hidden className="size-4" /> Clear filters
            </Link>
          )}
          <div className="view-switch">
            <Link href={link({ view: "" })} aria-current={showMap ? undefined : "page"}><LayoutGrid aria-hidden className="size-4" /> Cards</Link>
            <Link href={link({ view: "map" })} aria-current={showMap ? "page" : undefined}><MapIcon aria-hidden className="size-4" /> Map</Link>
          </div>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-sky text-primary"><SearchX aria-hidden className="size-7" /></span>
          <h2 className="text-xl">No reports match</h2>
          <p className="max-w-md text-muted-foreground">Try another word, or a different problem type or status.</p>
          {filtered && <Link href="/issues" className={buttonVariants({ variant: "outline", className: "mt-1 h-11 px-5" })}>Clear filters</Link>}
        </div>
      ) : showMap ? (
        <section aria-label="Reports on a map" className="card overflow-hidden">
          <div className="px-6 py-4"><Legend meta={meta} statuses={PUBLIC_STATUSES} /></div>
          <IssueMap points={mapPoints(data.items)} center={meta.map_center} labels={meta.statuses} title="All reports" className="h-96 rounded-none border-x-0 border-b-0 lg:h-[44rem]" />
        </section>
      ) : (
        <ul className={featured ? "bento" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"}>
          {data.items.map((issue, index) => (
            <ReportCard key={issue.id} issue={issue} meta={meta} featured={featured && index === 0} />
          ))}
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
        <div className="portal-rise relative grid w-full items-center gap-8 p-6 pb-24 sm:p-10 sm:pb-24 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid max-w-2xl gap-3">
            <p className="flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 py-1 text-sm font-semibold text-white backdrop-blur">
              <span aria-hidden className="live-dot" /> Community reports
            </p>
            <h1 className="text-4xl text-white sm:text-5xl">All reports</h1>
            <p className="max-w-lg text-lg text-white/90">See what&apos;s being fixed around your barangay. Reports appear here once staff have verified them.</p>
            <div className="pt-1">
              <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-6 text-base" })}>
                <Megaphone aria-hidden className="size-4.5" /> Report a problem
              </Link>
            </div>
          </div>
          <Suspense fallback={<div className="track-panel hidden min-h-56 xl:grid" />}>
            <Glance />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<ReportsSkeleton />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
