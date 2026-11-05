import { ArrowRight, Camera, Hash, MapPinned, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";

import { TrackForm } from "@/components/forms";
import { CATEGORY_ICONS, EmptyState, IssueList, Legend, PageSkeleton, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { ActivityFeed, Card, CategoryBars, FiguresBar, FixedGauge, NeedsAttention, StatusPipeline } from "@/components/overview";
import { buttonVariants } from "@/components/ui/button";
import { getActivity, getIssues, getMeta, getStats } from "@/lib/api";

const STEPS = [
  { Icon: Camera, title: "Tell us what's wrong", text: "Pick the problem, drop a pin, and add a photo if you can." },
  { Icon: Hash, title: "Keep your tracking number", text: "You get a code like CF-7K2M-9QXD. No account needed." },
  { Icon: ShieldCheck, title: "Staff verify and assign", text: "The report is checked and sent to the right team." },
  { Icon: MapPinned, title: "Follow it until it's fixed", text: "Every update and photo shows up on your report." },
];

const TILE_COLORS = ["#2563eb", "#16a34a", "#8b5cf6", "#f59e0b", "#0ea5e9", "#ec4899", "#64748b"];

async function Gauge() {
  return <FixedGauge stats={await getStats()} />;
}

async function CommunityOverview() {
  const [meta, stats, recent, open, activity] = await Promise.all([
    getMeta(),
    getStats(),
    getIssues("sort=newest"),
    getIssues("open=1&sort=priority"),
    getActivity(),
  ]);

  return (
    <>
      <FiguresBar stats={stats} />

      <section id="community-map" aria-labelledby="map-title" className="card scroll-mt-20 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-6 pt-5 pb-4">
          <div className="grid gap-1">
            <p className="eyebrow flex items-center gap-2"><span aria-hidden className="live-dot" /> Real time</p>
            <h2 id="map-title" className="text-lg">Live community map</h2>
          </div>
          <Legend meta={meta} />
        </div>
        <div className="lg:relative">
          <IssueMap points={mapPoints(open.items)} center={meta.map_center} className="h-128 rounded-none border-x-0 border-b-0" />
          <NeedsAttention issues={open.items} meta={meta} />
        </div>
      </section>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Card eyebrow="Pipeline" title="Where reports stand" id="stand-title"><StatusPipeline stats={stats} meta={meta} /></Card>
        <Card eyebrow="Breakdown" title="Open problems by type" id="types-title"><CategoryBars stats={stats} meta={meta} /></Card>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card eyebrow="Feed" title="Recent reports" id="recent-title" action={{ href: "/issues", label: "View all" }}>
          {recent.items.length > 0 ? (
            <IssueList issues={recent.items.slice(0, 4)} meta={meta} />
          ) : (
            <EmptyState>No reports yet. Be the first to report a problem.</EmptyState>
          )}
        </Card>
        <Card eyebrow="Timeline" title="Latest activity" id="activity-title">
          <ActivityFeed items={activity.items.slice(0, 4)} meta={meta} />
        </Card>
      </div>

      <Card eyebrow="Quick report" title="What would you like to report?" id="choose-title">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3">
          {Object.entries(meta.categories).map(([key, label], index) => {
            const Icon = CATEGORY_ICONS[key] ?? CATEGORY_ICONS.other;
            const color = TILE_COLORS[index % TILE_COLORS.length];

            return (
              <li key={key}>
                <Link href={`/report?category=${key}`} className="quick-action group h-full">
                  <span className="chip" style={{ "--chip-bg": `${color}14`, "--chip-ink": color } as CSSProperties}>
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <section id="about" className="command scroll-mt-20">
        <div className="relative grid items-center gap-x-10 gap-y-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:p-10">
          <div className="grid gap-5">
            <p className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm text-[#c9d6e8] backdrop-blur">
              <span aria-hidden className="live-dot" /> Community problem-to-resolution tracker
            </p>
            <h1 className="text-4xl text-balance text-white sm:text-5xl xl:text-6xl">
              See something broken? <span className="gradient-text">Get it fixed.</span>
            </h1>
            <p className="max-w-xl text-lg text-[#b8c7db]">
              Report streetlights, roads, drainage and more in under a minute, then follow every step until it&apos;s
              resolved. No account needed.
            </p>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-4 pt-1">
              <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-6 text-base" })}>
                Report a problem <ArrowRight aria-hidden className="size-4" />
              </Link>
              <div className="w-full max-w-sm"><TrackForm dark /></div>
            </div>
          </div>
          <Suspense fallback={<div className="glass h-42 w-80" />}>
            <Gauge />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<PageSkeleton />}>
        <CommunityOverview />
      </Suspense>

      <Card eyebrow="Process" title="How it works" id="features">
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, index) => (
            <li key={title} className="relative grid gap-3 rounded-2xl border bg-gradient-to-b from-muted/60 to-card p-5">
              <div className="flex items-center justify-between">
                <span className="chip"><Icon aria-hidden className="size-5" /></span>
                <span aria-hidden className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
              </div>
              <div className="grid gap-1">
                <h3 className="text-base">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
