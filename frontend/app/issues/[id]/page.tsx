import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CommentForm, ReopenForm, StaffPanel, SupportButton } from "@/components/forms";
import { PageSkeleton, StatusBadge, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { Badge } from "@/components/ui/badge";
import { ApiError, api, getMeta, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate, timeAgo } from "@/lib/format";
import { OPEN_STATUSES, type Issue, type Meta, type Status, type TimelineEntry } from "@/lib/types";

const STEPS: Status[] = ["reported", "acknowledged", "in_progress", "resolved"];

function Stepper({ status, meta }: { status: Status; meta: Meta }) {
  if (status === "rejected") {
    return (
      <p className="rounded-lg border bg-card px-4 py-3 text-muted-foreground">
        This report was closed without action. The reason is in the updates below.
      </p>
    );
  }

  const current = STEPS.indexOf(status);

  return (
    <ol aria-label="Progress" className="grid grid-cols-4">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "relative grid justify-items-center gap-1.5 text-center text-sm text-muted-foreground",
            index === current && "font-bold text-foreground",
          )}
        >
          {index > 0 && (
            <span
              aria-hidden
              className={cn("absolute top-2 -left-1/2 h-0.75 w-full", index <= current ? "bg-primary" : "bg-border")}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "relative z-10 size-5 rounded-full border-3",
              index < current && "border-primary bg-primary",
              index === current && "border-primary bg-card ring-4 ring-primary/20",
              index > current && "border-border bg-background",
            )}
          />
          {meta.statuses[step]}
        </li>
      ))}
    </ol>
  );
}

function Update({ entry, meta }: { entry: TimelineEntry; meta: Meta }) {
  const who = entry.author ? `${entry.author} (${entry.author_role})` : entry.author_role;

  return (
    <li className="relative grid gap-0.5 pb-4.5 pl-4.5">
      <span aria-hidden className="absolute top-1.75 -left-1.75 size-3 rounded-full border-2 border-background bg-primary" />
      <p>
        <strong>{who}</strong>{" "}
        {!entry.to_status && "commented"}
        {entry.to_status && !entry.from_status && "filed this report"}
        {entry.to_status && entry.from_status && (
          <>moved this to <StatusBadge status={entry.to_status} meta={meta} /></>
        )}
      </p>
      {entry.note && <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">{entry.note}</p>}
      <time dateTime={entry.created_at} title={formatDate(entry.created_at)} className="text-sm text-muted-foreground">
        {timeAgo(entry.created_at)}
      </time>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

async function loadIssue(id: string) {
  if (!/^\d{1,9}$/.test(id)) notFound();
  try {
    return await api<Issue>(`/issues/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

async function IssueDetail({ params }: Pick<PageProps<"/issues/[id]">, "params">) {
  const { id } = await params;
  const [issue, meta, user] = await Promise.all([loadIssue(id), getMeta(), getUser()]);

  const isStaff = user?.role === "staff";
  const canSupport = OPEN_STATUSES.includes(issue.status) && !issue.is_mine && !isStaff;
  const points = mapPoints([issue]);

  return (
    <>
      <header className="grid gap-2 [overflow-wrap:anywhere]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{issue.ref}</span>
          <StatusBadge status={issue.status} meta={meta} />
          {issue.priority !== "normal" && (
            <Badge variant="outline" className={issue.priority === "low" ? "" : "border-current text-destructive"}>
              {meta.priorities[issue.priority]} priority
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{issue.title}</h1>
      </header>

      <Stepper status={issue.status} meta={meta} />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5.5">
          {issue.photo_url && (
            <img
              src={issue.photo_url}
              alt="The problem, as photographed by the reporter"
              className="max-h-105 w-full rounded-xl object-cover"
            />
          )}
          <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">{issue.description}</p>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Updates</h2>
            <ol className="mb-5 ml-1.5 border-l-2">
              {issue.timeline?.map((entry) => <Update key={entry.id} entry={entry} meta={meta} />)}
            </ol>
            {user ? (
              <CommentForm issueId={issue.id} />
            ) : (
              <p className="text-muted-foreground">
                <Link href={`/login?next=/issues/${issue.id}`} className="text-primary underline">Log in</Link> to comment.
              </p>
            )}
          </section>
        </div>

        <aside className="grid min-w-0 gap-5.5">
          <section className="grid gap-4 rounded-xl border bg-card p-4.5">
            <dl className="grid gap-2.5">
              <Fact label="Category">{meta.categories[issue.category]}</Fact>
              <Fact label="Location">{issue.address}</Fact>
              <Fact label="Reported">{formatDate(issue.created_at)}</Fact>
              {issue.reporter_name && <Fact label="Reported by">{issue.reporter_name}</Fact>}
              <Fact label="Assigned to">{issue.department ?? "Not assigned yet"}</Fact>
              {issue.resolved_at && <Fact label="Resolved">{formatDate(issue.resolved_at)}</Fact>}
            </dl>
            {points.length > 0 && <IssueMap points={points} center={points[0]} zoom={16} />}
            {canSupport && user && <SupportButton issue={issue} />}
            {canSupport && !user && (
              <Link href={`/login?next=/issues/${issue.id}`} className="text-center text-sm text-primary underline">
                Log in to say this affects you too
              </Link>
            )}
            {!canSupport && issue.support_count > 0 && (
              <p className="text-sm text-muted-foreground">
                {issue.support_count} other {issue.support_count === 1 ? "resident" : "residents"} affected
              </p>
            )}
          </section>
          {issue.is_mine && issue.status === "resolved" && <ReopenForm issueId={issue.id} />}
          {isStaff && <StaffPanel issue={issue} meta={meta} />}
        </aside>
      </div>
    </>
  );
}

export default function IssuePage({ params }: PageProps<"/issues/[id]">) {
  return (
    <>
      <p className="-mb-4 text-sm">
        <Link href="/issues" className="text-primary underline">← All reports</Link>
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <IssueDetail params={params} />
      </Suspense>
    </>
  );
}
