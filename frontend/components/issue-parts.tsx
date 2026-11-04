import Link from "next/link";
import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import type { Issue, MapPoint, Meta, Stats, Status } from "@/lib/types";

export function StatusBadge({ status, meta }: { status: Status; meta: Meta }) {
  return (
    <Badge
      variant="outline"
      className="border-current font-semibold"
      style={{ color: `var(--status-${status})` } as CSSProperties}
    >
      {meta.statuses[status]}
    </Badge>
  );
}

export function IssueCard({ issue, meta }: { issue: Issue; meta: Meta }) {
  return (
    <li className="grid">
      <Link href={`/issues/${issue.id}`} className="group grid">
        <Card className="flex-row gap-0 overflow-hidden py-0 transition-colors group-hover:ring-primary">
          {issue.photo_url && (
            <img src={issue.photo_url} alt="" loading="lazy" className="w-26 shrink-0 object-cover" />
          )}
          <div className="grid min-w-0 content-start gap-1.5 p-4 [overflow-wrap:anywhere]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{issue.ref}</span>
              <StatusBadge status={issue.status} meta={meta} />
            </div>
            <h3 className="font-semibold group-hover:underline">{issue.title}</h3>
            <p className="text-sm text-muted-foreground">
              {meta.categories[issue.category]} · {issue.address}
            </p>
            <p className="text-sm text-muted-foreground">
              Reported {timeAgo(issue.created_at)}
              {issue.support_count > 0 && ` · ${issue.support_count} also affected`}
            </p>
          </div>
        </Card>
      </Link>
    </li>
  );
}

export function IssueList({ issues, meta }: { issues: Issue[]; meta: Meta }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3.5">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} meta={meta} />
      ))}
    </ul>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-9 text-center text-muted-foreground">{children}</p>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages < 2) return null;
  const linkClass = "rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary";

  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3.5">
      {page > 1 && <Link className={linkClass} href={href(page - 1)}>Previous</Link>}
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      {page < pages && <Link className={linkClass} href={href(page + 1)}>Next</Link>}
    </nav>
  );
}

export function StatGrid({ stats }: { stats: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-xl border bg-border">
      {stats.map(([label, value]) => (
        <div key={label} className="bg-card px-4.5 py-3.5">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-3xl font-bold tabular-nums">{value}</dd>
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
      <small className="text-base font-medium text-muted-foreground"> days</small>
    </>
  );
}

export function Legend({ meta }: { meta: Meta }) {
  return (
    <ul aria-label="Map legend" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {(Object.keys(meta.statuses) as Status[]).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: `var(--status-${status})` }} />
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
      <div className="h-9 w-2/3 max-w-sm rounded-lg bg-muted" />
      <div className="h-28 rounded-xl bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
