import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { CategoryIcon, PriorityBadge, STAGES, StatusBadge, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { formatDate, timeAgo } from "@/lib/format";
import type { Issue, Meta, Photo, Status, TimelineEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const WHAT_IS_HAPPENING: Record<Status, string> = {
  reported: "We've received this report. Staff will check it soon.",
  acknowledged: "Staff have checked this report and confirmed the problem.",
  in_progress: "A team is working on this problem now.",
  resolved: "This problem has been fixed.",
  rejected: "This report was closed without action. The reason is in the updates below.",
};

function Progress({ status, meta }: { status: Status; meta: Meta }) {
  const current = STAGES.indexOf(status);

  return (
    <section aria-label="Progress" className="sheet">
      <p className="text-lg"><strong>What&apos;s happening now:</strong> {WHAT_IS_HAPPENING[status]}</p>
      {status !== "rejected" && (
        <ol className="steps">
          {STAGES.map((stage, index) => (
            <li
              key={stage}
              data-done={index <= current ? "" : undefined}
              aria-current={index === current ? "step" : undefined}
              className="step"
            >
              <span className="step-dot">
                {index <= current ? <Check aria-hidden className="size-5" strokeWidth={3} /> : index + 1}
              </span>
              {meta.statuses[stage]}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Update({ entry, meta }: { entry: TimelineEntry; meta: Meta }) {
  const who = entry.author ? `${entry.author} (${entry.author_role})` : entry.author_role;
  const posted = entry.author_role === "Resident" ? "added a message" : "posted an update";

  return (
    <li className="relative grid gap-0.5 pb-5 pl-5">
      <span aria-hidden className="absolute top-2 -left-[8px] size-3.5 rounded-full border-2 border-card bg-brand-green" />
      <p>
        <strong>{who}</strong>{" "}
        {!entry.to_status && posted}
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

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-bold text-muted-foreground">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function PhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;

  return (
    <ul className={cn("grid gap-3", photos.length > 1 && "sm:grid-cols-2")}>
      {photos.map((photo) => (
        <li key={photo.id} className="relative">
          <img
            src={photo.url}
            alt={`${photo.label}: photo of the problem`}
            className="max-h-105 w-full object-cover"
          />
          <span className="absolute top-0 left-0 bg-primary px-2.5 py-0.5 text-sm font-bold text-white">
            {photo.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The report itself: shared by the tracking page and the public and staff views. */
export function IssueView({
  issue,
  meta,
  belowTimeline,
  facts,
  aside,
}: {
  issue: Issue;
  meta: Meta;
  belowTimeline?: ReactNode;
  facts?: ReactNode;
  aside?: ReactNode;
}) {
  const points = mapPoints([issue]);

  return (
    <>
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 [overflow-wrap:anywhere]">
        <div className="row-span-2"><CategoryIcon category={issue.category} size="size-14" /></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{issue.ref}</span>
          <StatusBadge status={issue.status} meta={meta} />
          {issue.priority !== "normal" && <PriorityBadge priority={issue.priority} meta={meta} />}
        </div>
        <h1 className="text-3xl">{issue.title}</h1>
      </header>

      <Progress status={issue.status} meta={meta} />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 gap-6">
          <PhotoGrid photos={issue.photos} />
          <p className="text-lg [overflow-wrap:anywhere] whitespace-pre-wrap">{issue.description}</p>

          <section>
            <h2 className="mb-3 text-2xl">Updates</h2>
            <ol className="mb-5 ml-1.5 border-l-2 border-border">
              {issue.timeline?.map((entry) => <Update key={entry.id} entry={entry} meta={meta} />)}
            </ol>
            {belowTimeline}
          </section>
        </div>

        <aside className="grid min-w-0 gap-5.5">
          <section className="sheet">
            <dl className="grid gap-2.5">
              <Fact label="Type of problem">{meta.categories[issue.category]}</Fact>
              <Fact label="Location">{issue.address}</Fact>
              <Fact label="Reported">{formatDate(issue.created_at)}</Fact>
              <Fact label="Maintenance team">{issue.department ?? "Not assigned yet"}</Fact>
              {!!issue.supporters && (
                <Fact label="Also affected">
                  {issue.supporters} {issue.supporters === 1 ? "neighbor" : "neighbors"} said me too
                </Fact>
              )}
              {issue.resolved_at && <Fact label="Resolved">{formatDate(issue.resolved_at)}</Fact>}
              {facts}
            </dl>
            {points.length > 0 && <IssueMap points={points} center={points[0]} zoom={16} />}
          </section>
          {aside}
        </aside>
      </div>
    </>
  );
}
