import Link from "next/link";

import { CATEGORY_ICONS, STAGES, StatusBadge } from "@/components/issue-parts";
import type { Issue, Meta } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The four stages as a bar. The words next to it carry the meaning, so it's hidden from screen readers. */
export function StageBar({ issue, onDark = false }: { issue: Issue; onDark?: boolean }) {
  const current = STAGES.indexOf(issue.status);

  return (
    <span aria-hidden className="grid grid-cols-4 gap-1.5">
      {STAGES.map((stage, index) => (
        <span
          key={stage}
          className={cn("h-1.5 rounded-full", index <= current ? (onDark ? "bg-[#86efac]" : "bg-brand-green") : onDark ? "bg-white/25" : "bg-muted")}
        />
      ))}
    </span>
  );
}

/** One of a resident's own reports, with how far along it is. */
export function TrackedReport({ issue, meta }: { issue: Issue; meta: Meta }) {
  const Icon = CATEGORY_ICONS[issue.category] ?? CATEGORY_ICONS.other;

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
        {issue.status !== "rejected" && <StageBar issue={issue} />}
      </Link>
    </li>
  );
}
