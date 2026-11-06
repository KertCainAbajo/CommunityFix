import { ArrowRight, CircleCheckBig, Clock3, MapPin, Megaphone, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { TrackForm } from "@/components/forms";
import { EmptyState, IssueList, Legend, PageSkeleton, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { Card, NeedsAttention } from "@/components/overview";
import { buttonVariants } from "@/components/ui/button";
import { api, getIssues, getMeta, getStats, getUser, isStaff } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { PHOTO_CREDITS, categoryPhoto } from "@/lib/photos";
import type { Issue, IssuePage, Meta, Stats } from "@/lib/types";

async function Greeting() {
  const user = await getUser();
  return <>Hello, {user?.name.split(" ")[0] ?? "neighbor"}</>;
}

function ProblemTiles({ meta }: { meta: Meta }) {
  return (
    <section aria-labelledby="choose-title" className="grid gap-3">
      <h2 id="choose-title" className="text-xl">What would you like to report?</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-7">
        {Object.entries(meta.categories).map(([key, label]) => (
          <li key={key}>
            <Link href={`/report?category=${key}`} className="photo-tile group">
              <img src={categoryPhoto(key)} alt="" loading="lazy" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommunityProgress({ stats }: { stats: Stats }) {
  const fixed = stats.by_status.resolved;
  const percent = stats.total > 0 ? Math.round((fixed / stats.total) * 100) : 0;
  const rows = [
    { Icon: CircleCheckBig, label: "Fixed so far", value: `${fixed} of ${stats.total} reports`, color: "#16a34a" },
    { Icon: Wrench, label: "Still open", value: `${stats.open} ${stats.open === 1 ? "report" : "reports"}`, color: "#1a4fd6" },
    {
      Icon: Clock3,
      label: "Average time to fix",
      value: stats.avg_resolution_days === null ? "Not yet known" : `${stats.avg_resolution_days} days`,
      color: "#d97706",
    },
  ];

  return (
    <Card title="Your community so far" id="progress-title">
      <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-green" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{percent}% of reports have been fixed</p>
      <dl className="mt-3 divide-y">
        {rows.map(({ Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-3 py-3">
            <Icon aria-hidden className="size-5 flex-none" style={{ color }} />
            <dt className="flex-1 text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function CommunityReport({ issue, meta }: { issue: Issue; meta: Meta }) {
  return (
    <li>
      <Link href={`/issues/${issue.id}`} className="card lift group block h-full overflow-hidden">
        <span className="relative block aspect-[16/10] overflow-hidden bg-muted">
          {!issue.photo_url && (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">Sample photo</span>
          )}
          <img
            src={issue.photo_url ?? categoryPhoto(issue.category)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </span>
        <span className="grid gap-2 p-4">
          <span className="flex items-center justify-between gap-2">
            <span className="plate" data-status={issue.status}>{meta.statuses[issue.status]}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(issue.updated_at)}</span>
          </span>
          <span className="font-heading leading-snug font-bold [overflow-wrap:anywhere]">{issue.title}</span>
          <span className="flex items-start gap-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            <MapPin aria-hidden className="mt-0.5 size-3.5 flex-none" /> {issue.address}
          </span>
        </span>
      </Link>
    </li>
  );
}

async function CommunityHome() {
  const user = await getUser();
  const resident = user && !isStaff(user);
  const [meta, stats, recent, open, mine] = await Promise.all([
    getMeta(),
    getStats(),
    getIssues("sort=newest"),
    getIssues("open=1&sort=priority"),
    resident ? api<IssuePage>("/my/issues") : null,
  ]);

  return (
    <>
      <ProblemTiles meta={meta} />

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {mine ? (
          <Card title="Your reports" id="mine-title" action={{ href: "/my-reports", label: "View all" }}>
            {mine.items.length > 0 ? (
              <IssueList issues={mine.items.slice(0, 3)} meta={meta} ownReports />
            ) : (
              <EmptyState>You haven&apos;t reported anything yet. When you do, you can follow it here.</EmptyState>
            )}
          </Card>
        ) : (
          <Card title="Newest reports" id="mine-title" action={{ href: "/issues", label: "View all" }}>
            <IssueList issues={recent.items.slice(0, 3)} meta={meta} />
          </Card>
        )}
        <CommunityProgress stats={stats} />
      </div>

      <section id="community-map" aria-labelledby="map-title" className="card scroll-mt-20 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
          <h2 id="map-title" className="text-xl">Problems near you</h2>
          <Legend meta={meta} />
        </div>
        <div className="lg:relative">
          <IssueMap points={mapPoints(open.items)} center={meta.map_center} className="h-120 rounded-none border-x-0 border-b-0" />
          <NeedsAttention issues={open.items} meta={meta} />
        </div>
      </section>

      {recent.items.length > 0 && (
        <section aria-labelledby="latest-title" className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="latest-title" className="text-xl">Latest in your community</h2>
            <Link href="/issues" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all reports <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recent.items.slice(0, 4).map((issue) => <CommunityReport key={issue.id} issue={issue} meta={meta} />)}
          </ul>
        </section>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="home-hero">
        <img src="/photos/home.jpg" alt="A street in a Philippine town with a tricycle and parked motorcycles" fetchPriority="high" />
        <div className="relative grid max-w-2xl gap-4 p-6 sm:p-9">
          <p className="text-lg font-semibold text-white">
            <Suspense fallback="Hello"><Greeting /></Suspense>
          </p>
          <h1 className="text-4xl text-balance text-white sm:text-5xl">What needs fixing in your barangay today?</h1>
          <p className="max-w-lg text-lg text-white/90">
            Tell us about a problem on your street, and follow it until it&apos;s fixed.
          </p>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4 pt-1">
            <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-6 text-base" })}>
              <Megaphone aria-hidden className="size-4.5" /> Report a problem
            </Link>
            <div className="w-full max-w-sm"><TrackForm dark /></div>
          </div>
        </div>
      </section>

      <Suspense fallback={<PageSkeleton />}>
        <CommunityHome />
      </Suspense>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Photo credits</summary>
        <ul className="mt-2 grid gap-1">
          {PHOTO_CREDITS.map((photo) => (
            <li key={photo.href}>
              <a href={photo.href} target="_blank" rel="noreferrer" className="underline">{photo.title}</a> by {photo.author}, {photo.license}, resized and cropped
            </li>
          ))}
          <li>Other photos are public domain or CC0, from Wikimedia Commons.</li>
        </ul>
      </details>
    </>
  );
}
