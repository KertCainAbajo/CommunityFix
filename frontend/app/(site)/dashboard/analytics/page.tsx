import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState, PageSkeleton, ResolutionTime, StatGrid } from "@/components/issue-parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, getMeta, requireStaff } from "@/lib/api";
import type { Analytics, Breakdown } from "@/lib/types";

export const metadata: Metadata = { title: "Analytics" };

function BreakdownTable({ label, rows }: { label: string; rows: (Breakdown & { name: string })[] }) {
  return (
    <div className="survey">
      <Table className="min-w-130">
        <TableHeader>
          <TableRow>
            <TableHead>{label}</TableHead>
            {["Total", "Open", "Resolved", "Avg. days to fix"].map((heading) => (
              <TableHead key={heading} className="text-right">{heading}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="whitespace-normal">{row.name}</TableCell>
              <TableCell className="text-right tabular-nums">{row.total}</TableCell>
              <TableCell className="text-right tabular-nums">{row.open}</TableCell>
              <TableCell className="text-right tabular-nums">{row.resolved}</TableCell>
              <TableCell className="text-right tabular-nums">{row.avg_days ?? "–"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthlyChart({ months }: { months: Analytics["by_month"] }) {
  const most = Math.max(1, ...months.flatMap((row) => [row.reported, row.resolved]));

  return (
    <ul className="grid gap-2.5">
      {months.map((row) => (
        <li key={row.month} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-sm">
          <span className="font-mono text-xs">{row.month}</span>
          <div className="grid gap-1">
            {(["reported", "resolved"] as const).map((kind) => (
              <div key={kind} className="grid grid-cols-[1fr_1.75rem] items-center gap-2">
                <span className="h-3 border border-[var(--ink-line)] bg-card">
                  <span
                    className="block h-full"
                    style={{ width: `${(row[kind] / most) * 100}%`, background: kind === "reported" ? "#c2410c" : "#0f7a46" }}
                  />
                </span>
                <span className="text-right text-xs tabular-nums" aria-label={`${row[kind]} ${kind}`}>{row[kind]}</span>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Report() {
  await requireStaff("/dashboard/analytics");
  const [meta, data] = await Promise.all([getMeta(), api<Analytics>("/analytics")]);

  return (
    <>
      <StatGrid
        stats={[
          ["Total reports", data.total],
          ["Open now", data.open],
          ["Resolved", data.by_status.resolved],
          ["Rejected", data.by_status.rejected],
          ["Average time to fix", <ResolutionTime key="time" stats={data} />],
        ]}
      />

      <section className="grid gap-3">
        <h2 className="text-3xl">Last 6 months</h2>
        <ul className="flex gap-4 text-sm" aria-label="Chart legend">
          <li className="flex items-center gap-1.5"><span className="size-3 bg-[#c2410c]" />Reported</li>
          <li className="flex items-center gap-1.5"><span className="size-3 bg-[#0f7a46]" />Resolved</li>
        </ul>
        <MonthlyChart months={data.by_month} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-3xl">By category</h2>
        {data.by_category.length > 0 ? (
          <BreakdownTable
            label="Category"
            rows={data.by_category.map((row) => ({ ...row, name: meta.categories[row.category] }))}
          />
        ) : (
          <EmptyState>No reports yet.</EmptyState>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-3xl">By maintenance team</h2>
        {data.by_team.length > 0 ? (
          <BreakdownTable label="Team" rows={data.by_team.map((row) => ({ ...row, name: row.team }))} />
        ) : (
          <EmptyState>No reports have been assigned to a team yet.</EmptyState>
        )}
      </section>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <h1 className="text-5xl">Analytics</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Report />
      </Suspense>
    </>
  );
}
