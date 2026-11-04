import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, IssueList, Legend, PageSkeleton, ResolutionTime, StatGrid, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { buttonVariants } from "@/components/ui/button";
import { getIssues, getMeta, getStats } from "@/lib/api";

async function Overview() {
  const [meta, stats, recent, open] = await Promise.all([
    getMeta(),
    getStats(),
    getIssues("sort=newest"),
    getIssues("open=1"),
  ]);

  return (
    <>
      <StatGrid
        stats={[
          ["Open now", stats.open],
          ["Resolved", stats.by_status.resolved],
          ["Total reports", stats.total],
          ["Average time to fix", <ResolutionTime key="time" stats={stats} />],
        ]}
      />

      <section>
        <h2 className="mb-3 text-xl font-semibold">Open problems on the map</h2>
        <IssueMap points={mapPoints(open.items)} center={meta.map_center} className="h-90" />
        <Legend meta={meta} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Latest reports</h2>
          <Link href="/issues" className="text-primary underline">View all</Link>
        </div>
        {recent.items.length > 0 ? (
          <IssueList issues={recent.items.slice(0, 6)} meta={meta} />
        ) : (
          <EmptyState>No reports yet. Be the first to report a problem.</EmptyState>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="grid max-w-2xl gap-3.5 pt-5">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Report it. Track it. See&nbsp;it&nbsp;fixed.
        </h1>
        <p className="text-lg text-muted-foreground">
          Broken streetlights, damaged roads, clogged drainage. Tell us what&apos;s wrong and follow every step until
          it&apos;s resolved.
        </p>
        <div className="mt-1 flex flex-wrap gap-2.5">
          <Link href="/report" className={buttonVariants({ className: "h-11 px-5 text-base" })}>Report a problem</Link>
          <Link href="/issues" className={buttonVariants({ variant: "outline", className: "h-11 px-5 text-base" })}>See all reports</Link>
        </div>
      </section>
      <Suspense fallback={<PageSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}
