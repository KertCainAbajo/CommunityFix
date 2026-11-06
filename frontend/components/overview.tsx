import { AlarmClock, ArrowRight, ArrowUpRight, CircleCheckBig, Inbox, LoaderCircle, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { StatusBadge } from "@/components/issue-parts";
import { daysOpen, timeAgo } from "@/lib/format";
import type { Activity, Issue, Meta, Stats, Status } from "@/lib/types";

type Trend = keyof Stats["trends"];

const FIGURES: { key: Trend; label: string; Icon: typeof Inbox; color: string; bg: string; alert?: boolean }[] = [
  { key: "total", label: "Total reports", Icon: Inbox, color: "#2563eb", bg: "#eaf1ff" },
  { key: "open", label: "Open now", Icon: LoaderCircle, color: "#8b5cf6", bg: "#f1ebff" },
  { key: "resolved", label: "Fixed", Icon: CircleCheckBig, color: "#16a34a", bg: "#e3f8ea" },
  { key: "overdue", label: "Overdue", Icon: AlarmClock, color: "#dc2626", bg: "#fdecec", alert: true },
];

function Sparkline({ id, values, color }: { id: string; values: number[]; color: string }) {
  const width = 200;
  const height = 40;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const point = (value: number, index: number) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - 3 - ((value - min) / Math.max(max - min, 1)) * (height - 8);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  const line = values.map((value, index) => `${index === 0 ? "M" : "L"}${point(value, index)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden className="block h-10 w-full">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width} ${height} L0 ${height}Z`} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Change({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-sm text-muted-foreground">No change · last 30 days</span>;
  const Icon = amount > 0 ? TrendingUp : TrendingDown;

  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
        <Icon aria-hidden className="size-3.5" />
        {amount > 0 ? "+" : ""}{amount}
      </span>
      last 30 days
    </span>
  );
}

/** The key figures as four cards. Only an overdue count gets a warning color. */
export function FiguresBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {FIGURES.map(({ key, label, Icon, color, bg, alert }) => {
        const series = stats.trends[key];
        const current = series.at(-1) ?? 0;
        const quiet = alert && current === 0;
        const tint = quiet ? "#94a3b8" : color;

        return (
          <div key={key} className="card lift relative min-w-0 overflow-hidden pt-4">
            <div className="flex items-start justify-between gap-3 px-5">
              <div className="grid gap-1.5">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="font-heading text-[2.4rem] leading-none font-extrabold tracking-tight tabular-nums" style={alert && !quiet ? { color } : undefined}>
                  {current}
                </p>
              </div>
              <span className="chip" style={{ "--chip-bg": quiet ? "#f0f3f8" : bg, "--chip-ink": tint } as CSSProperties}>
                <Icon aria-hidden className="size-5" />
              </span>
            </div>
            <div className="mt-2.5 px-5"><Change amount={current - (series[0] ?? 0)} /></div>
            <div className="mt-2"><Sparkline id={key} values={series} color={tint} /></div>
          </div>
        );
      })}
    </div>
  );
}

/** One number in a figure bar. */
export function Figure({ visual, value, label }: { visual: ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-4 sm:gap-4 sm:px-7 sm:py-6">
      {visual}
      <div className="min-w-0 leading-tight">
        <p className="font-heading text-xl font-extrabold whitespace-nowrap sm:text-2xl">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function figureChip(Icon: LucideIcon, color: string, background: string) {
  return (
    <span className="grid size-12 flex-none place-items-center rounded-2xl" style={{ color, background }}>
      <Icon aria-hidden className="size-6" />
    </span>
  );
}

export function Card({
  title,
  action,
  children,
  id,
  eyebrow,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  id?: string;
  eyebrow?: string;
}) {
  return (
    <section aria-labelledby={id} className="card p-5 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="grid gap-1">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={id} className="text-lg">{title}</h2>
        </div>
        {action && (
          <Link href={action.href} className="flex flex-none items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold transition-colors hover:border-primary hover:text-primary">
            {action.label} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** The most urgent open reports, shown over the map. */
export function NeedsAttention({ issues, meta }: { issues: Issue[]; meta: Meta }) {
  return (
    <aside aria-labelledby="attention-title" className="attention">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 id="attention-title" className="text-base">Needs attention</h3>
        <span className="eyebrow">Most urgent</span>
      </div>
      {issues.length === 0 && <p className="px-4 pb-4 text-muted-foreground">Nothing is open right now.</p>}
      <ol>
        {issues.slice(0, 4).map((issue) => (
          <li key={issue.id} className="px-2 pb-1">
            <Link href={`/issues/${issue.id}`} className="group grid gap-1.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white">
              <span className="flex items-start justify-between gap-2 font-semibold [overflow-wrap:anywhere]">
                {issue.title}
                <ArrowUpRight aria-hidden className="size-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </span>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={issue.status} meta={meta} />
                <span className="font-mono text-xs text-muted-foreground">{daysOpen(issue.created_at)}d open</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function describe(entry: Activity, meta: Meta) {
  if (!entry.to_status) return "New update posted";
  if (!entry.from_status) return "New report submitted";
  return `Moved to ${meta.statuses[entry.to_status].toLowerCase()}`;
}

export function ActivityFeed({ items, meta }: { items: Activity[]; meta: Meta }) {
  if (items.length === 0) return <p className="py-4 text-muted-foreground">Nothing has happened yet.</p>;

  return (
    <ol className="ml-1.5 border-l border-dashed">
      {items.map((entry) => {
        const status: Status = entry.to_status ?? "acknowledged";

        return (
          <li key={entry.id} data-status={status} className="relative grid gap-0.5 pb-4 pl-5 last:pb-0">
            <span aria-hidden className="absolute top-1.5 -left-[7.5px] size-3.5 rounded-full border-3 border-card" style={{ background: "var(--plate-solid)", boxShadow: "0 0 0 1px color-mix(in srgb, var(--plate-solid) 40%, transparent)" }} />
            <p className="font-semibold">{describe(entry, meta)}</p>
            <Link href={`/issues/${entry.issue_id}`} className="text-muted-foreground hover:text-primary"><span className="font-mono text-xs">{entry.ref}</span> · {entry.title}</Link>
            <p className="text-xs text-muted-foreground">
              {entry.author ? `By ${entry.author} · ` : ""}{timeAgo(entry.created_at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
