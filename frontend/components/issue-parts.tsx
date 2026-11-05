import {
  CircleHelp,
  Construction,
  Droplets,
  Footprints,
  Lightbulb,
  MapPin,
  Trash2,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { timeAgo } from "@/lib/format";
import type { Issue, MapPoint, Meta, Priority, Stats, Status } from "@/lib/types";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  streetlight: Lightbulb,
  road: Construction,
  drainage: Waves,
  waste: Trash2,
  water: Droplets,
  sidewalk: Footprints,
  other: CircleHelp,
};

export const STAGES: Status[] = ["reported", "acknowledged", "in_progress", "resolved"];

export function StatusBadge({ status, meta }: { status: Status; meta: Meta }) {
  return <span className="plate" data-status={status}>{meta.statuses[status]}</span>;
}

export function PriorityBadge({ priority, meta }: { priority: Priority; meta: Meta }) {
  const urgent = priority === "urgent" || priority === "high";

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold"
      style={{ background: urgent ? "#fee2e2" : "#f0f3f8", color: urgent ? "#b91c1c" : "#475569" }}
    >
      {meta.priorities[priority]} priority
    </span>
  );
}

export function CategoryIcon({ category, size = "size-11" }: { category: string; size?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? CircleHelp;

  return (
    <Icon aria-hidden className={`${size} flex-none text-brand-green`} strokeWidth={1.8} />
  );
}

export function IssueRow({ issue, meta, href }: { issue: Issue; meta: Meta; href?: string }) {
  const Icon = CATEGORY_ICONS[issue.category] ?? CircleHelp;

  return (
    <li>
      <Link href={href ?? `/issues/${issue.id}`} className="report-row">
        <span className="report-thumb">
          {issue.photo_url
            ? <img src={issue.photo_url} alt="" loading="lazy" className="size-full object-cover" />
            : <Icon aria-hidden className="size-7" />}
        </span>
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <h3 className="text-base">{issue.title}</h3>
          <p className="flex items-start gap-1 text-sm text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-3.5 flex-none" />
            {issue.address}
          </p>
        </div>
        <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:col-start-3 sm:grid sm:justify-items-end">
          <StatusBadge status={issue.status} meta={meta} />
          <span className="font-mono text-xs text-muted-foreground">{timeAgo(issue.created_at)}</span>
        </div>
      </Link>
    </li>
  );
}

/** `ownReports` links to the private tracking page, which also shows reports not yet verified. */
export function IssueList({ issues, meta, ownReports = false }: { issues: Issue[]; meta: Meta; ownReports?: boolean }) {
  return (
    <ul>
      {issues.map((issue) => (
        <IssueRow key={issue.id} issue={issue} meta={meta} href={ownReports && issue.tracking_code ? `/track/${issue.tracking_code}` : undefined} />
      ))}
    </ul>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-lg text-muted-foreground">{children}</p>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages < 2) return null;
  const linkClass = "rounded-lg border bg-card px-4 py-2 font-bold text-primary hover:border-primary";

  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3.5">
      {page > 1 && <Link className={linkClass} href={href(page - 1)}>Previous</Link>}
      <span className="text-muted-foreground">Page {page} of {pages}</span>
      {page < pages && <Link className={linkClass} href={href(page + 1)}>Next</Link>}
    </nav>
  );
}

export function StatGrid({ stats }: { stats: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-4">
      {stats.map(([label, value]) => (
        <div key={label} className="card p-4">
          <dt className="font-bold text-muted-foreground">{label}</dt>
          <dd className="font-heading text-4xl font-bold text-primary tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResolutionTime({ stats }: { stats: Stats }) {
  if (stats.avg_resolution_days === null) return "–";
  return (
    <>
      {stats.avg_resolution_days}
      <small className="text-lg font-semibold text-muted-foreground"> days</small>
    </>
  );
}

export function Legend({ meta, statuses = ["acknowledged", "in_progress"] }: { meta: Meta; statuses?: Status[] }) {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm font-bold">
      {statuses.map((status) => (
        <li key={status} className="flex items-center gap-2">
          <span data-status={status} className="size-3.5 rounded-full" style={{ background: "var(--plate-solid)" }} />
          {meta.statuses[status]}
        </li>
      ))}
    </ul>
  );
}

export function mapPoints(issues: Issue[]): MapPoint[] {
  return issues.flatMap(({ id, title, status, lat, lng }) =>
    lat === null || lng === null ? [] : [{ id, title, status, lat, lng }],
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid animate-pulse gap-4">
      <div className="h-24 bg-muted" />
      <div className="h-72 bg-muted" />
    </div>
  );
}
