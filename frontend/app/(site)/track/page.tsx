import { Bell, FolderOpen, Megaphone, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { TrackForm } from "@/components/forms";
import { CATEGORY_ICONS, EmptyState, PageSkeleton, STAGES, StatusBadge } from "@/components/issue-parts";
import { Card } from "@/components/overview";
import { buttonVariants } from "@/components/ui/button";
import { api, getMeta, getUser, isStaff } from "@/lib/api";
import type { Issue, IssuePage, Meta } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Track your report" };

const STAGE_MEANINGS: Record<(typeof STAGES)[number], string> = {
  reported: "We received your report. Staff will check it soon.",
  acknowledged: "Staff confirmed the problem and it's now public.",
  in_progress: "A team has been assigned and is working on it.",
  resolved: "The problem is fixed. Tell us how it went.",
  rejected: "",
};

const HELP = [
  { Icon: FolderOpen, title: "Lost your number?", text: "Reports you filed while signed in are all saved in My reports.", href: "/my-reports", link: "Open My reports" },
  { Icon: Bell, title: "Want updates?", text: "We tell you here on the site whenever your report changes.", href: "/notifications", link: "See notifications" },
  { Icon: RotateCcw, title: "Still not fixed?", text: "Open your resolved report and reopen it so staff take another look.", href: "/my-reports", link: "Find your report" },
];

function TrackedReport({ issue, meta }: { issue: Issue; meta: Meta }) {
  const Icon = CATEGORY_ICONS[issue.category] ?? CATEGORY_ICONS.other;
  const current = STAGES.indexOf(issue.status);

  return (
    <li>
      <Link href={`/track/${issue.tracking_code}`} className="grid gap-3 rounded-xl p-3 transition-colors hover:bg-muted">
        <span className="flex items-center gap-3">
          <span className="grid size-11 flex-none place-items-center rounded-xl bg-sky text-primary"><Icon aria-hidden className="size-5" /></span>
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <span className="block font-heading font-bold">{issue.title}</span>
            <span className="font-mono text-xs text-muted-foreground">{issue.tracking_code}</span>
          </span>
          <StatusBadge status={issue.status} meta={meta} />
        </span>
        {issue.status !== "rejected" && (
          <span aria-hidden className="grid grid-cols-4 gap-1.5">
            {STAGES.map((stage, index) => (
              <span key={stage} className={cn("h-1.5 rounded-full", index <= current ? "bg-brand-green" : "bg-muted")} />
            ))}
          </span>
        )}
      </Link>
    </li>
  );
}

async function TrackHelp() {
  const user = await getUser();
  const resident = user && !isStaff(user);
  const [meta, mine] = await Promise.all([getMeta(), resident ? api<IssuePage>("/my/issues") : null]);

  return (
    <>
      <div className="reveal grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {mine ? (
          <Card title="Your reports" id="yours-title" action={{ href: "/my-reports", label: "View all" }}>
            {mine.items.length > 0 ? (
              <ul className="-mx-3 grid gap-1">
                {mine.items.slice(0, 4).map((issue) => <TrackedReport key={issue.id} issue={issue} meta={meta} />)}
              </ul>
            ) : (
              <div className="grid justify-items-center gap-3 py-6 text-center">
                <EmptyState>You haven&apos;t filed a report yet. Reports you file will show their progress here.</EmptyState>
                <Link href="/report" className={buttonVariants({ className: "cta -mt-6 h-11 gap-2 px-5" })}>
                  <Megaphone aria-hidden className="size-4.5" /> Report a problem
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <Card title="Looking for a report?" id="yours-title" action={{ href: "/dashboard", label: "Open dashboard" }}>
            <p className="text-muted-foreground">Staff can find every report in the work queue on the dashboard.</p>
          </Card>
        )}

        <section aria-labelledby="stages-title" className="news-card">
          <h2 id="stages-title" className="text-lg text-white">What each stage means</h2>
          <ol className="grid gap-3.5">
            {STAGES.map((stage, index) => (
              <li key={stage} data-status={stage} className="flex gap-3">
                <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full text-sm font-bold text-white" style={{ background: "var(--plate-solid)" }}>
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold text-white">{meta.statuses[stage]}</span>
                  <span className="text-sm text-[#c9d6e8]">{STAGE_MEANINGS[stage]}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <ul className="reveal grid gap-6 md:grid-cols-3">
        {HELP.map(({ Icon, title, text, href, link }) => (
          <li key={title}>
            <Link href={href} className="card lift group grid h-full content-start gap-2 p-6">
              <span className="chip"><Icon aria-hidden className="size-5" /></span>
              <span className="mt-1 font-heading text-lg font-bold">{title}</span>
              <span className="text-muted-foreground">{text}</span>
              <span className="mt-1 text-sm font-semibold text-primary group-hover:underline">{link}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function TrackPage() {
  return (
    <>
      <section className="page-hero">
        <img src="/photos/home.jpg" alt="A street in a Philippine town with a tricycle and parked motorcycles" style={{ objectPosition: "50% 60%" }} />
        <div className="portal-rise relative grid max-w-2xl gap-3 p-6 pb-24 sm:p-10 sm:pb-24">
          <h1 className="text-4xl text-white sm:text-5xl">Track your report</h1>
          <p className="max-w-lg text-lg text-white/90">See exactly where your report stands, from the day you sent it until it&apos;s fixed.</p>
        </div>
      </section>

      <section aria-label="Find a report" className="filter-card">
        <TrackForm />
        <p className="mt-2 text-sm text-muted-foreground">Enter the tracking number you got when you filed your report. It looks like CF-7K2M-9QXD.</p>
      </section>

      <Suspense fallback={<PageSkeleton />}>
        <TrackHelp />
      </Suspense>
    </>
  );
}
