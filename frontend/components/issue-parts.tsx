import {
  CircleHelp,
  Construction,
  Droplets,
  Footprints,
  Lightbulb,
  Trash2,
  Waves,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { timeAgo } from "@/lib/format";
import type { Issue, MapPoint, Meta, Priority, Stats, Status } from "@/lib/types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
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
  const label = `${meta.priorities[priority]} priority`;

  if (priority === "urgent") {
    return <span className="plate plate-hazard"><span>{label}</span></span>;
  }
  return (
    <span className="plate" style={{ background: priority === "high" ? "#17191a" : "#5f6668", color: "#fff" }}>
      {label}
    </span>
  );
}

export function CategorySign({ category, size = "size-10" }: { category: string; size?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? CircleHelp;

  return (
    <span className={`sign-diamond ${size}`}>
      <Icon aria-hidden className="size-5" strokeWidth={2.25} />
    </span>
  );
}

export function IssueCard({ issue, meta }: { issue: Issue; meta: Meta }) {
  return (
    <li className="grid">
      <Link href={`/issues/${issue.id}`} className="group grid">
        <article className="ticket">
          <div className="ticket-stub">
            <CategorySign category={issue.category} />
            <span className="font-mono text-[0.68rem] text-muted-foreground">{issue.ref}</span>
          </div>
          <div className="grid min-w-0 content-start gap-1.5 p-3.5 [overflow-wrap:anywhere]">
            <div><StatusBadge status={issue.status} meta={meta} /></div>
            <h3 className="text-xl group-hover:underline">{issue.title}</h3>
            <p className="text-sm text-muted-foreground">{issue.address}</p>
            <p className="mt-auto pt-1 font-mono text-xs text-muted-foreground">
              {timeAgo(issue.created_at)}
            </p>
          </div>
          {issue.photo_url && (
            <div className="ticket-photo"><img src={issue.photo_url} alt="" loading="lazy" /></div>
          )}
        </article>
      </Link>
    </li>
  );
}

export function IssueList({ issues, meta }: { issues: Issue[]; meta: Meta }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} meta={meta} />
      ))}
    </ul>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="border-2 border-dashed px-4 py-10 text-center text-muted-foreground">{children}</p>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages < 2) return null;
  const linkClass = "border bg-card px-3 py-1.5 font-display font-bold tracking-wide uppercase hover:border-foreground";

  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3.5">
      {page > 1 && <Link className={linkClass} href={href(page - 1)}>Previous</Link>}
      <span className="font-mono text-sm text-muted-foreground">Page {page} of {pages}</span>
      {page < pages && <Link className={linkClass} href={href(page + 1)}>Next</Link>}
    </nav>
  );
}

export function StatGrid({ stats }: { stats: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px border-2 border-[var(--ink-line)] bg-border">
      {stats.map(([label, value]) => (
        <div key={label} className="bg-card px-4 py-3">
          <dt className="font-display text-sm font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
          <dd className="font-display text-4xl font-extrabold tabular-nums">{value}</dd>
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

export function Legend({ meta }: { meta: Meta }) {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap gap-x-4 gap-y-1">
      {(["acknowledged", "in_progress"] as Status[]).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span
            data-status={status}
            className="size-2.5 rotate-45 rounded-[1px] border border-black/60"
            style={{ background: "var(--plate)" }}
          />
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
