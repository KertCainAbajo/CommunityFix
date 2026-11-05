import { AlarmClock, ArrowRight, ArrowUpRight, CircleCheckBig, Inbox, LoaderCircle, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { STAGES, StatusBadge } from "@/components/issue-parts";
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

/** A gauge of how many reports have been fixed so far. */
export function FixedGauge({ stats }: { stats: Stats }) {
  const fixed = stats.by_status.resolved;
  const percent = stats.total > 0 ? Math.round((fixed / stats.total) * 100) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="glass flex items-center gap-5 p-5">
      <div className="relative size-32 flex-none">
        <svg viewBox="0 0 120 120" aria-hidden className="size-full -rotate-90 drop-shadow-[0_0_12px_rgb(34_197_94/45%)]">
          <defs>
            <linearGradient id="gauge-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4ade80" />
              <stop offset="1" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(255 255 255 / 12%)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#gauge-fill)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
          />
        </svg>
        <p className="absolute inset-0 grid place-content-center text-center">
          <span className="font-heading text-3xl font-extrabold text-white tabular-nums">{percent}%</span>
          <span className="font-mono text-[0.6rem] tracking-[0.16em] text-[#9fb3cc] uppercase">fixed</span>
        </p>
      </div>
      <dl className="grid gap-2">
        <div>
          <dt className="text-sm text-[#9fb3cc]">Reports fixed</dt>
          <dd className="font-heading text-xl font-bold tracking-tight text-white">{fixed} of {stats.total}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#9fb3cc]">Average time to fix</dt>
          <dd className="font-heading text-xl font-bold tracking-tight text-white">
            {stats.avg_resolution_days === null ? "Not yet known" : `${stats.avg_resolution_days} days`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Where every report stands right now, as one bar. */
export function StatusPipeline({ stats, meta }: { stats: Stats; meta: Meta }) {
  const total = Math.max(STAGES.reduce((sum, stage) => sum + stats.by_status[stage], 0), 1);

  return (
    <div className="grid gap-4">
      <div aria-hidden className="flex h-3 gap-1 overflow-hidden rounded-full bg-muted">
        {STAGES.map((stage) => (
          <span key={stage} data-status={stage} className="rounded-full" style={{ width: `${(stats.by_status[stage] / total) * 100}%`, background: "var(--plate-solid)" }} />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        {STAGES.map((stage) => (
          <div key={stage} data-status={stage} className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-2">
            <dt className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: "var(--plate-solid)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--plate-solid) 20%, transparent)" }} />
              {meta.statuses[stage]}
            </dt>
            <dd className="font-heading text-lg font-bold tabular-nums">{stats.by_status[stage]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CategoryBars({ stats, meta }: { stats: Stats; meta: Meta }) {
  if (stats.open_by_category.length === 0) return <p className="text-muted-foreground">Nothing is open right now.</p>;
  const most = Math.max(...stats.open_by_category.map((row) => row.n), 1);

  return (
    <ul className="grid gap-2.5">
      {stats.open_by_category.map((row) => (
        <li key={row.category} className="grid gap-1">
          <div className="flex justify-between gap-3">
            <span>{meta.categories[row.category]}</span>
            <span className="font-mono text-sm font-medium tabular-nums">{row.n}</span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#22c55e]" style={{ width: `${(row.n / most) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
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
