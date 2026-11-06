import { ArrowRight, ArrowUpRight, CircleHelp, Clock3, FolderOpen, MailWarning, Megaphone, Newspaper, Siren, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { TrackForm } from "@/components/forms";
import { CATEGORY_ICONS, EmptyState, IssueList, Legend, PageSkeleton, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { Card, NeedsAttention } from "@/components/overview";
import { ReportCard } from "@/components/report-card";
import { buttonVariants } from "@/components/ui/button";
import { api, getAnnouncements, getIssues, getMeta, getStats, getUser, isStaff } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { categoryPhoto } from "@/lib/photos";
import type { Announcement, IssuePage, Meta, Stats } from "@/lib/types";

async function Greeting() {
  const user = await getUser();
  return <>Hello, {user?.name.split(" ")[0] ?? "neighbor"}</>;
}

function FixedRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 22;

  return (
    <span className="relative grid size-14 flex-none place-items-center">
      <svg viewBox="0 0 52 52" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <circle cx="26" cy="26" r="22" fill="none" stroke="#e4e9f1" strokeWidth="6" />
        <circle cx="26" cy="26" r="22" fill="none" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} />
      </svg>
      <span className="text-xs font-bold">{percent}%</span>
    </span>
  );
}

function Figure({ visual, value, label }: { visual: ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-4 sm:gap-4 sm:px-7 sm:py-6">
      {visual}
      <div className="min-w-0 leading-tight">
        <p className="font-heading text-xl font-extrabold whitespace-nowrap sm:text-2xl">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const chip = (Icon: typeof Wrench, color: string, background: string) => (
  <span className="grid size-12 flex-none place-items-center rounded-2xl" style={{ color, background }}>
    <Icon aria-hidden className="size-6" />
  </span>
);

/** The figures, floating over the bottom edge of the banner. */
function FigureBar({ stats, mine }: { stats: Stats; mine: IssuePage | null }) {
  const fixed = stats.by_status.resolved;
  const percent = stats.total > 0 ? Math.round((fixed / stats.total) * 100) : 0;

  return (
    <section aria-label="Community figures" className="figure-bar">
      <Figure visual={<FixedRing percent={percent} />} value={`${fixed} of ${stats.total}`} label="Reports fixed" />
      <Figure visual={chip(Wrench, "#1a4fd6", "#e6eeff")} value={String(stats.open)} label="Still open" />
      <Figure
        visual={chip(Clock3, "#d97706", "#fff4dc")}
        value={stats.avg_resolution_days === null ? "Not yet" : `${stats.avg_resolution_days} days`}
        label="Average fix time"
      />
      {mine ? (
        <Figure visual={chip(FolderOpen, "#16a34a", "#e3f8ea")} value={String(mine.total)} label="Your reports" />
      ) : (
        <Figure visual={chip(Siren, "#dc2626", "#fdecec")} value={String(stats.overdue)} label="Overdue" />
      )}
    </section>
  );
}

function ProblemMosaic({ meta }: { meta: Meta }) {
  return (
    <section aria-labelledby="choose-title" className="reveal grid gap-5">
      <div>
        <h2 id="choose-title" className="text-2xl">What would you like to report?</h2>
        <p className="text-muted-foreground">Choose a problem and we&apos;ll take you straight to the form.</p>
      </div>
      <ul className="mosaic">
        {Object.entries(meta.categories).map(([key, label]) => {
          const Icon = CATEGORY_ICONS[key] ?? CircleHelp;

          return (
            <li key={key}>
              <Link href={`/report?category=${key}`} className="photo-tile">
                <img src={categoryPhoto(key)} alt="" loading="lazy" />
                <span className="photo-tile-icon"><Icon aria-hidden className="size-5" /></span>
                <ArrowUpRight aria-hidden className="photo-tile-arrow" />
                <span className="photo-tile-label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Announcements({ items }: { items: Announcement[] }) {
  return (
    <section aria-labelledby="news-title" className="news-card">
      <h2 id="news-title" className="flex items-center gap-2 text-lg text-white">
        <Newspaper aria-hidden className="size-5 text-[#86efac]" /> From your barangay
      </h2>
      {items.length === 0 ? (
        <p className="text-[#c9d6e8]">No announcements right now. Notices from staff will appear here.</p>
      ) : (
        <ul className="grid gap-3">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="rounded-xl bg-white/8 p-3 [overflow-wrap:anywhere]">
              <p className="font-semibold text-white">{item.title}</p>
              <p className="whitespace-pre-wrap text-sm text-[#c9d6e8]">{item.body}</p>
              <p className="mt-1 text-xs text-[#9fb3cc]">{timeAgo(item.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function CommunityHome() {
  const user = await getUser();
  const resident = user && !isStaff(user);
  const [meta, stats, recent, open, mine, news] = await Promise.all([
    getMeta(),
    getStats(),
    getIssues("sort=newest"),
    getIssues("open=1&sort=priority"),
    resident ? api<IssuePage>("/my/issues") : null,
    getAnnouncements(),
  ]);

  return (
    <>
      <FigureBar stats={stats} mine={mine} />

      {user?.email && !user.email_verified && (
        <Link href="/account" className="flex items-center gap-2 rounded-xl border border-[#f5d48a] bg-[#fff8e6] px-4 py-3 font-medium text-[#7a4b00]">
          <MailWarning aria-hidden className="size-5 flex-none" /> Please confirm your email so we can send you updates. <span className="underline">Go to My account</span>
        </Link>
      )}

      <ProblemMosaic meta={meta} />

      <div className="reveal grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {mine ? (
          <Card title="Your reports" id="mine-title" action={{ href: "/my-reports", label: "View all" }}>
            {mine.items.length > 0 ? (
              <IssueList issues={mine.items.slice(0, 3)} meta={meta} ownReports />
            ) : (
              <div className="grid justify-items-center gap-3 py-6 text-center">
                <EmptyState>You haven&apos;t reported anything yet. When you do, you can follow it here.</EmptyState>
                <Link href="/report" className={buttonVariants({ className: "cta -mt-6 h-11 gap-2 px-5" })}>
                  <Megaphone aria-hidden className="size-4.5" /> File your first report
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <Card title="Newest reports" id="mine-title" action={{ href: "/issues", label: "View all" }}>
            <IssueList issues={recent.items.slice(0, 3)} meta={meta} />
          </Card>
        )}
        <Announcements items={news.items} />
      </div>

      <section id="community-map" aria-labelledby="map-title" className="card reveal scroll-mt-20 overflow-hidden">
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
        <section aria-labelledby="latest-title" className="reveal grid gap-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="latest-title" className="text-2xl">Latest in your community</h2>
            <Link href="/issues" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all reports <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {recent.items.slice(0, 4).map((issue) => <ReportCard key={issue.id} issue={issue} meta={meta} />)}
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
        <div className="portal-rise relative grid w-full items-end gap-8 p-6 pb-24 sm:p-10 sm:pb-28 xl:grid-cols-[minmax(0,1fr)_24rem] xl:p-14 xl:pb-32">
          <div className="grid max-w-3xl gap-5">
            <p className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-semibold text-white backdrop-blur">
              <span aria-hidden className="live-dot" />
              <Suspense fallback="Hello"><Greeting /></Suspense>
            </p>
            <h1 className="text-4xl text-balance text-white sm:text-6xl 2xl:text-7xl">
              What needs fixing in <span className="text-[#86efac]">your barangay</span> today?
            </h1>
            <p className="max-w-xl text-lg text-white/90">
              Tell us about a problem on your street, and follow it until it&apos;s fixed.
            </p>
            <div className="pt-1">
              <Link href="/report" className={buttonVariants({ className: "cta h-13 gap-2 px-7 text-lg" })}>
                <Megaphone aria-hidden className="size-5" /> Report a problem
              </Link>
            </div>
          </div>
          <div className="track-panel">
            <TrackForm dark />
            <p className="text-sm text-[#c9d6e8]">Use the number you got when you sent your report.</p>
          </div>
        </div>
      </section>

      <Suspense fallback={<PageSkeleton />}>
        <CommunityHome />
      </Suspense>

    </>
  );
}
