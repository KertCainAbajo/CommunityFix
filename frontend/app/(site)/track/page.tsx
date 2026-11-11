import { ArrowRight, Bell, CaseSensitive, CircleCheckBig, Clock3, FolderOpen, Hash, Inbox, Megaphone, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { TrackForm } from "@/components/forms";
import { CATEGORY_ICONS, STAGES, StatusBadge } from "@/components/issue-parts";
import { buttonVariants } from "@/components/ui/button";
import { getMeta, getMyIssues, getStats, getUser, isStaff } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { categoryPhoto } from "@/lib/photos";
import type { Issue, Meta } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Track your report" };

type Stage = (typeof STAGES)[number];

const JOURNEY: Record<Stage, { Icon: typeof Inbox; text: string }> = {
  reported: { Icon: Inbox, text: "We received your report. Staff will check it soon." },
  acknowledged: { Icon: ShieldCheck, text: "Staff confirmed the problem, and it's now public." },
  in_progress: { Icon: Wrench, text: "A team has been assigned and is working on it." },
  resolved: { Icon: CircleCheckBig, text: "The problem is fixed. Tell us how it went." },
  rejected: { Icon: Inbox, text: "" },
};

const STARTERS = ["streetlight", "road", "drainage", "waste"];

const TIPS = [
  { Icon: Hash, text: "Looks like CF-7K2M-9QXD" },
  { Icon: CaseSensitive, text: "Capital letters don't matter" },
  { Icon: FolderOpen, text: "Your own reports are listed below" },
];

const HELP = [
  { Icon: FolderOpen, title: "Lost your number?", text: "Every report you filed while signed in is saved in My reports.", href: "/my-reports", link: "Open My reports" },
  { Icon: Bell, title: "Want updates?", text: "We tell you here on the site whenever your report changes.", href: "/notifications", link: "See notifications" },
  { Icon: RotateCcw, title: "Still not fixed?", text: "Open your resolved report and reopen it, so staff take another look.", href: "/my-reports", link: "Find your report" },
];

/** One of the resident's reports, with every stage named, not just colored. */
function ProgressCard({ issue, meta }: { issue: Issue; meta: Meta }) {
  const Icon = CATEGORY_ICONS[issue.category] ?? CATEGORY_ICONS.other;
  const current = STAGES.indexOf(issue.status);

  return (
    <li>
      <Link href={`/track/${issue.tracking_code}`} className="card lift group grid h-full content-start gap-4 p-5">
        <span className="flex items-start gap-3">
          <span className="grid size-11 flex-none place-items-center rounded-xl bg-sky text-primary"><Icon aria-hidden className="size-5" /></span>
          <span className="grid min-w-0 flex-1 justify-items-start gap-1.5 [overflow-wrap:anywhere]">
            <span className="font-heading leading-snug font-bold">{issue.title}</span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={issue.status} meta={meta} />
              <span className="font-mono text-xs text-muted-foreground">{issue.tracking_code}</span>
            </span>
          </span>
        </span>
        {current >= 0 ? (
          <span className="grid gap-2">
            <span aria-hidden className="grid grid-cols-4 gap-1.5">
              {STAGES.map((stage, index) => (
                <span key={stage} className="grid gap-1">
                  <span className={cn("h-1.5 rounded-full", index <= current ? "bg-brand-green" : "bg-muted")} />
                  <span className={cn("text-[0.7rem] leading-tight", index <= current ? "font-semibold" : "text-muted-foreground")}>{meta.statuses[stage]}</span>
                </span>
              ))}
            </span>
            <span className="sr-only">Step {current + 1} of {STAGES.length}: {meta.statuses[issue.status]}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">This report was closed. Open it to see why.</span>
        )}
        <span className="flex items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
          Updated {timeAgo(issue.updated_at)}
          <span className="flex items-center gap-1 font-semibold text-primary">
            Open <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </Link>
    </li>
  );
}

async function YourReports() {
  const user = await getUser();
  if (!user || isStaff(user)) {
    return (
      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-muted-foreground">Staff can find every report in the work queue.</p>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "h-11 px-5" })}>Open the dashboard</Link>
      </section>
    );
  }

  const [meta, mine] = await Promise.all([getMeta(), getMyIssues()]);

  return (
    <section aria-labelledby="yours-title" className="card reveal grid content-start gap-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="yours-title" className="text-2xl">Your reports</h2>
          <p className="text-muted-foreground">Tap one to see every update. No number needed.</p>
        </div>
        {mine.total > 0 && (
          <Link href="/my-reports" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            See all {mine.total} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
      {mine.items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {mine.items.slice(0, 4).map((issue) => <ProgressCard key={issue.id} issue={issue} meta={meta} />)}
        </ul>
      ) : (
        <div className="grid gap-5 rounded-2xl border border-dashed bg-muted/40 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-sky text-primary"><Megaphone aria-hidden className="size-7" /></span>
          <div className="grid gap-1">
            <h3 className="text-lg">Nothing to track yet</h3>
            <p className="text-muted-foreground">When you report a problem, it shows up here with its progress, so you never have to type a number.</p>
          </div>
          <div className="sm:col-span-2">
            <Link href="/report" className={buttonVariants({ className: "cta h-11 gap-2 px-5" })}>
              <Megaphone aria-hidden className="size-4.5" /> Report a problem
            </Link>
          </div>
        </div>
      )}
      {mine.items.length === 0 && (
        <nav aria-labelledby="starters-title" className="grid gap-3">
          <h3 id="starters-title" className="text-base">Or start with a common problem</h3>
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {STARTERS.map((key) => (
              <li key={key} className="h-32">
                <Link href={`/report?category=${key}`} className="photo-tile">
                  <img src={categoryPhoto(key)} alt="" loading="lazy" />
                  <span className="photo-tile-label text-sm">{meta.categories[key]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}

/** How every report moves, from sending it to the fix. */
async function Journey() {
  const [meta, stats] = await Promise.all([getMeta(), getStats()]);

  return (
    <section aria-labelledby="journey-title" className="news-card reveal content-start gap-6! p-6! sm:p-8!">
      <div className="grid gap-1">
        <h2 id="journey-title" className="text-2xl text-white">How your report moves</h2>
        <p className="text-[#c9d6e8]">Every report goes through the same four steps.</p>
      </div>
      <ol className="journey journey-vertical journey-dark">
        {STAGES.map((stage, index) => {
          const { Icon, text } = JOURNEY[stage];
          return (
            <li key={stage} data-status={stage} className="journey-step">
              <span className="journey-dot"><Icon aria-hidden className="size-5" /></span>
              <span className="grid gap-1">
                <span className="text-xs font-semibold text-[#9fb3cc]">Step {index + 1}</span>
                <span className="font-heading text-lg font-bold text-white">{meta.statuses[stage]}</span>
                <span className="text-sm text-[#c9d6e8]">{text}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {stats.avg_resolution_days !== null && (
        <p className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-3 text-sm text-white">
          <Clock3 aria-hidden className="size-5 flex-none text-[#86efac]" />
          <span>Reports are fixed in <strong>{stats.avg_resolution_days} days</strong> on average.</span>
        </p>
      )}
    </section>
  );
}

export default function TrackPage() {
  return (
    <>
      <section className="page-hero">
        <img src="/photos/home.jpg" alt="" style={{ objectPosition: "50% 60%" }} />
        <div className="portal-rise relative mx-auto grid w-full max-w-3xl justify-items-center gap-5 px-6 py-10 text-center sm:px-10 sm:py-14">
          <span className="grid size-14 place-items-center rounded-2xl border border-white/25 bg-white/10 text-[#86efac] backdrop-blur">
            <Hash aria-hidden className="size-7" />
          </span>
          <h1 className="text-4xl text-white sm:text-6xl">Track your report</h1>
          <p className="max-w-xl text-lg text-white/90">See exactly where your report stands, from the day you sent it until it&apos;s fixed.</p>
          <div className="track-panel w-full p-6! text-left sm:p-7!">
            <TrackForm dark />
            <p className="text-sm text-[#dbe5f2]">Enter the number you got when you sent your report.</p>
          </div>
          <ul className="flex flex-wrap justify-center gap-2">
            {TIPS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur">
                <Icon aria-hidden className="size-4 text-[#86efac]" /> {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Suspense fallback={<div className="card h-72 animate-pulse" />}>
          <YourReports />
        </Suspense>
        <Suspense fallback={<div className="news-card h-72 animate-pulse" />}>
          <Journey />
        </Suspense>
      </div>

      <ul className="reveal grid gap-6 md:grid-cols-3">
        {HELP.map(({ Icon, title, text, href, link }) => (
          <li key={title}>
            <Link href={href} className="card lift group grid h-full content-start gap-2 p-6">
              <span className="chip"><Icon aria-hidden className="size-5" /></span>
              <span className="mt-1 font-heading text-lg font-bold">{title}</span>
              <span className="text-muted-foreground">{text}</span>
              <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
                {link} <ArrowRight aria-hidden className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
