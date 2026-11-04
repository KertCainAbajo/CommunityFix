import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, IssueList, Legend, PageSkeleton, STAGES, StatusBadge, mapPoints } from "@/components/issue-parts";
import { TrackForm } from "@/components/forms";
import { IssueMap } from "@/components/maps";
import { buttonVariants } from "@/components/ui/button";
import { getIssues, getMeta, getStats } from "@/lib/api";

const BOARD_ROWS = 5;

async function WorkBoard() {
  const [meta, open] = await Promise.all([getMeta(), getIssues("open=1&sort=priority")]);

  return (
    <section aria-labelledby="board-title" className="board self-center">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <h2 id="board-title" className="text-xl tracking-wide text-paint">Open work board</h2>
        <span className="font-mono text-xs text-muted-foreground">{open.total} open</span>
      </div>
      {open.items.slice(0, BOARD_ROWS).map((issue) => (
        <Link key={issue.id} href={`/issues/${issue.id}`} className="board-row">
          <span className="font-mono text-sm text-paint">{issue.ref}</span>
          <span className="truncate text-sm">{issue.title}</span>
          <StatusBadge status={issue.status} meta={meta} />
        </Link>
      ))}
      {open.items.length === 0 && <p className="board-row text-sm text-muted-foreground">Nothing open right now.</p>}
      <Link
        href="/issues"
        className="flex items-center justify-end gap-1.5 border-t border-[#26292b] px-3.5 py-2.5 font-display font-bold tracking-wide text-paint uppercase"
      >
        All reports <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}

function BoardFallback() {
  return <div aria-hidden className="board h-72 self-center" />;
}

async function Overview() {
  const [meta, stats, recent, open] = await Promise.all([
    getMeta(),
    getStats(),
    getIssues("sort=newest"),
    getIssues("open=1&sort=priority"),
  ]);
  const { lat, lng } = meta.map_center;

  return (
    <>
      <section aria-labelledby="road-title" className="grid gap-3">
        <h2 id="road-title" className="text-3xl">The road to fixed</h2>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <ol className="road asphalt">
            {STAGES.map((stage) => (
              <li key={stage} data-status={stage} data-passed="" className="road-mark">
                <span className="road-track"><span className="road-sign">{stats.by_status[stage]}</span></span>
                <span className="font-display text-xs font-semibold tracking-wide uppercase sm:text-base sm:tracking-wider">
                  {meta.statuses[stage]}
                </span>
              </li>
            ))}
          </ol>
          <dl className="grid grid-cols-2 gap-px border-2 border-white/90 bg-[#0f7a46] text-white shadow-[0_0_0_2px_#0f7a46] lg:grid-cols-1">
            <div className="px-4 py-2.5">
              <dt className="font-display text-sm font-semibold tracking-wider uppercase">Average time to fix</dt>
              <dd className="font-display text-3xl font-extrabold">
                {stats.avg_resolution_days === null ? "–" : `${stats.avg_resolution_days} days`}
              </dd>
            </div>
            <div className="px-4 py-2.5">
              <dt className="font-display text-sm font-semibold tracking-wider uppercase">Total reports</dt>
              <dd className="font-display text-3xl font-extrabold">{stats.total}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="map-title" className="survey">
        <div className="survey-bar border-b-2 border-[var(--ink-line)]">
          <h2 id="map-title" className="font-mono text-xs font-medium tracking-wider">Sheet 01 · Open problems</h2>
          <span className="text-muted-foreground">
            {Math.abs(lat).toFixed(4)}° {lat >= 0 ? "N" : "S"} {Math.abs(lng).toFixed(4)}° {lng >= 0 ? "E" : "W"}
          </span>
        </div>
        <IssueMap points={mapPoints(open.items)} center={meta.map_center} className="h-96 rounded-none border-0" />
        <div className="survey-bar border-t-2 border-[var(--ink-line)]"><Legend meta={meta} /></div>
      </section>

      <section aria-labelledby="latest-title">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="latest-title" className="text-3xl">Latest reports</h2>
          <Link href="/issues" className="link">View all</Link>
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
      <section className="full-bleed asphalt">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div className="grid content-center gap-5">
            <p className="font-mono text-xs tracking-widest text-paint uppercase">Community problem-to-resolution tracker</p>
            <h1 className="text-6xl leading-[0.92] sm:text-7xl lg:text-8xl">
              Report it.<br />Track it.<br /><span className="text-paint">See it fixed.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Broken streetlights, damaged roads, clogged drainage. No account needed: tell us what&apos;s wrong, get a
              tracking number, and follow every step until it&apos;s resolved.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/report" className={buttonVariants({ className: "h-12 px-6 text-lg" })}>Report a problem</Link>
              <Link
                href="/issues"
                className={buttonVariants({ variant: "outline", className: "h-12 px-6 text-lg" })}
              >
                See all reports
              </Link>
            </div>
            <div className="max-w-sm"><TrackForm dark /></div>
          </div>
          <Suspense fallback={<BoardFallback />}>
            <WorkBoard />
          </Suspense>
        </div>
        <div className="lane-line" />
      </section>
      <Suspense fallback={<PageSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}
