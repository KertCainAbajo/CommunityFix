import { CircleCheckBig, FolderOpen, Hourglass, Megaphone, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, PageSkeleton, Pager, STAGES } from "@/components/issue-parts";
import { Figure, figureChip } from "@/components/overview";
import { ReportCard } from "@/components/report-card";
import { buttonVariants } from "@/components/ui/button";
import { api, getMeta, requireAccount } from "@/lib/api";
import { categoryPhoto } from "@/lib/photos";
import type { IssuePage, Meta, Status } from "@/lib/types";

export const metadata: Metadata = { title: "My reports" };

const STARTERS = ["streetlight", "road", "drainage", "waste"];
const STEPS = ["Tell us what's wrong and where", "Staff check it and send a team", "Follow it here until it's fixed"];

async function Greeting() {
  const user = await requireAccount("/my-reports");
  return <>Hello, {user.name.split(" ")[0]}</>;
}

/** What someone sees before filing anything: how it works, and a quick way to start. */
function FirstReport({ meta }: { meta: Meta }) {
  return (
    <section aria-labelledby="first-title" className="card grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid content-center gap-5">
        <div className="grid gap-2">
          <h2 id="first-title" className="text-3xl">You haven&apos;t filed a report yet</h2>
          <p className="text-lg text-muted-foreground">See something broken on your street? It only takes a minute.</p>
        </div>
        <ol className="grid gap-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span aria-hidden className="grid size-8 flex-none place-items-center rounded-full bg-sky font-heading font-bold text-primary">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <div>
          <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-6 text-base" })}>
            <Megaphone aria-hidden className="size-4.5" /> File your first report
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {STARTERS.map((key) => (
          <li key={key} className="h-40">
            <Link href={`/report?category=${key}`} className="photo-tile">
              <img src={categoryPhoto(key)} alt="" loading="lazy" />
              <span className="photo-tile-label">{meta.categories[key]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function MyReports({ searchParams }: Pick<PageProps<"/my-reports">, "searchParams">) {
  await requireAccount("/my-reports");
  const { page, status } = await searchParams;
  const meta = await getMeta();
  const chosen = typeof status === "string" && status in meta.statuses ? (status as Status) : "";
  const query = new URLSearchParams();
  if (typeof page === "string" && /^\d{1,4}$/.test(page)) query.set("page", page);
  if (chosen) query.set("status", chosen);

  const data = await api<IssuePage>(`/my/issues?${query}`);
  const counts = data.counts ?? {};
  const count = (key: Status) => counts[key] ?? 0;
  const all = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const rejected = count("rejected");

  const tabs: { key: Status | ""; label: string; total: number }[] = [
    { key: "", label: "All", total: all },
    ...STAGES.map((stage) => ({ key: stage, label: meta.statuses[stage], total: count(stage) })),
    ...(rejected > 0 ? [{ key: "rejected" as const, label: meta.statuses.rejected, total: rejected }] : []),
  ];

  return (
    <>
      <section aria-label="Your report figures" className="figure-bar">
        <Figure visual={figureChip(FolderOpen, "#1a4fd6", "#e6eeff")} value={String(all)} label="Reports filed" />
        <Figure visual={figureChip(Hourglass, "#d97706", "#fff4dc")} value={String(count("reported"))} label="Waiting for review" />
        <Figure visual={figureChip(Wrench, "#7c3aed", "#f1ebff")} value={String(count("acknowledged") + count("in_progress"))} label="Being worked on" />
        <Figure visual={figureChip(CircleCheckBig, "#16a34a", "#e3f8ea")} value={String(count("resolved"))} label="Fixed" />
      </section>

      {all === 0 ? (
        <FirstReport meta={meta} />
      ) : (
        <>
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.key ? `/my-reports?status=${tab.key}` : "/my-reports"}
                aria-current={chosen === tab.key ? "page" : undefined}
                className="status-tab"
              >
                {tab.label} <span className="status-tab-count">{tab.total}</span>
              </Link>
            ))}
          </nav>

          {data.items.length > 0 ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {data.items.map((issue) => <ReportCard key={issue.id} issue={issue} meta={meta} own />)}
            </ul>
          ) : (
            <div className="card"><EmptyState>You have no reports with this status.</EmptyState></div>
          )}

          <Pager
            page={data.page}
            pages={data.pages}
            href={(n) => `/my-reports?${new URLSearchParams({ ...(chosen && { status: chosen }), page: String(n) })}`}
          />
        </>
      )}
    </>
  );
}

export default function MyReportsPage({ searchParams }: PageProps<"/my-reports">) {
  return (
    <>
      <section className="page-hero">
        <img src="/portal-hero.jpg" alt="A barangay hall with a flag and parked motorcycles" style={{ objectPosition: "50% 45%" }} />
        <div className="portal-rise relative grid max-w-2xl gap-3 p-6 pb-24 sm:p-10 sm:pb-24">
          <p className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-semibold text-white backdrop-blur">
            <span aria-hidden className="live-dot" />
            <Suspense fallback="Hello"><Greeting /></Suspense>
          </p>
          <h1 className="text-4xl text-white sm:text-5xl">My reports</h1>
          <p className="max-w-lg text-lg text-white/90">Everything you&apos;ve reported, and how far along each one is.</p>
          <div className="pt-1">
            <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-6 text-base" })}>
              <Megaphone aria-hidden className="size-4.5" /> Report a problem
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<PageSkeleton />}>
        <MyReports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
