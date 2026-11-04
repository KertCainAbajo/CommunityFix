import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { CategorySign, PriorityBadge, STAGES, StatusBadge, mapPoints } from "@/components/issue-parts";
import { IssueMap } from "@/components/maps";
import { formatDate, timeAgo } from "@/lib/format";
import type { Issue, Meta, Photo, Status, TimelineEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

function Road({ status, meta }: { status: Status; meta: Meta }) {
  if (status === "rejected") {
    return (
      <p className="border-l-4 border-[#5f6668] bg-card px-4 py-3 text-muted-foreground">
        This report was closed without action. The reason is in the updates below.
      </p>
    );
  }

  const current = STAGES.indexOf(status);

  return (
    <ol aria-label="Progress" className="road asphalt">
      {STAGES.map((stage, index) => (
        <li
          key={stage}
          data-status={stage}
          data-passed={index <= current ? "" : undefined}
          data-ahead={index > current ? "" : undefined}
          aria-current={index === current ? "step" : undefined}
          className="road-mark"
        >
          <span className="road-track">
            <span className="road-sign">{index < current ? <Check aria-hidden className="size-5" strokeWidth={3} /> : index + 1}</span>
          </span>
          <span className={cn("font-display text-xs font-semibold tracking-wide uppercase sm:text-base sm:tracking-wider", index > current && "text-muted-foreground")}>
            {meta.statuses[stage]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Update({ entry, meta }: { entry: TimelineEntry; meta: Meta }) {
  const who = entry.author ? `${entry.author} (${entry.author_role})` : entry.author_role;

  return (
    <li className="relative grid gap-0.5 pb-4.5 pl-4.5">
      <span aria-hidden className="absolute top-1.5 -left-[7px] size-3 rotate-45 rounded-[1px] border-2 border-[var(--ink-line)] bg-primary" />
      <p>
        <strong>{who}</strong>{" "}
        {!entry.to_status && "posted an update"}
        {entry.to_status && !entry.from_status && "filed this report"}
        {entry.to_status && entry.from_status && (
          <>moved this to <StatusBadge status={entry.to_status} meta={meta} /></>
        )}
      </p>
      {entry.note && <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">{entry.note}</p>}
      <time dateTime={entry.created_at} title={formatDate(entry.created_at)} className="font-mono text-xs text-muted-foreground">
        {timeAgo(entry.created_at)}
      </time>
    </li>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
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
            className="max-h-105 w-full border-2 border-[var(--ink-line)] object-cover"
          />
          <span className="absolute top-2 left-2 bg-[#17191a] px-2 py-0.5 font-display text-sm font-bold tracking-wide text-[#ffc20e] uppercase">
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
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-2 [overflow-wrap:anywhere]">
        <div className="row-span-2 p-1.5"><CategorySign category={issue.category} size="size-12" /></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{issue.ref}</span>
          <StatusBadge status={issue.status} meta={meta} />
          {issue.priority !== "normal" && <PriorityBadge priority={issue.priority} meta={meta} />}
        </div>
        <h1 className="text-4xl sm:text-5xl">{issue.title}</h1>
      </header>

      <Road status={issue.status} meta={meta} />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5.5">
          <PhotoGrid photos={issue.photos} />
          <p className="[overflow-wrap:anywhere] whitespace-pre-wrap">{issue.description}</p>

          <section>
            <h2 className="mb-3 text-3xl">Updates</h2>
            <ol className="mb-5 ml-1.5 border-l-2 border-dashed border-[var(--ink-line)]">
              {issue.timeline?.map((entry) => <Update key={entry.id} entry={entry} meta={meta} />)}
            </ol>
            {belowTimeline}
          </section>
        </div>

        <aside className="grid min-w-0 gap-5.5">
          <section className="sheet">
            <dl className="grid gap-2.5">
              <Fact label="Category">{meta.categories[issue.category]}</Fact>
              <Fact label="Location">{issue.address}</Fact>
              <Fact label="Reported">{formatDate(issue.created_at)}</Fact>
              <Fact label="Maintenance team">{issue.department ?? "Not assigned yet"}</Fact>
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
