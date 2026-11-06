import fs from "node:fs";
import path from "node:path";

import { ArrowRight, CircleCheckBig, Clock3, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { STAGES } from "@/components/issue-parts";
import { getMeta, getStats } from "@/lib/api";
import type { Meta, Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Put a photo at frontend/public/portal-hero.jpg (for example, your barangay hall) and it fills the left panel. */
const HERO_PHOTO = "portal-hero.jpg";

function hasHeroPhoto() {
  return fs.existsSync(path.join(process.cwd(), "public", HERO_PHOTO));
}

// The left panel

function StatsStrip({ stats }: { stats: Stats }) {
  const resolved = stats.total > 0 ? Math.round((stats.by_status.resolved / stats.total) * 100) : 0;
  const items = [
    { Icon: Users, value: `${stats.total}`, label: "Reports Filed" },
    { Icon: CircleCheckBig, value: `${resolved}%`, label: "Resolved Issues" },
    { Icon: Clock3, value: stats.avg_resolution_days === null ? "New" : `${stats.avg_resolution_days}d`, label: "Average Fix Time" },
  ];

  return (
    <dl className="portal-glass grid w-fit grid-cols-3 divide-x divide-white/15 py-3">
      {items.map(({ Icon, value, label }) => (
        <div key={label} className="flex items-center gap-3 px-4 sm:px-6">
          <span className="hidden size-10 place-items-center rounded-xl bg-white/12 sm:grid">
            <Icon aria-hidden className="size-5 text-white" />
          </span>
          <div className="leading-tight">
            <dd className="font-heading text-xl font-extrabold text-white sm:text-2xl">{value}</dd>
            <dt className="text-xs text-[#c9dbff] sm:text-sm">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Where all reports stand, as a floating card. Only totals: report details need an account. */
function PipelineCard({ stats, meta }: { stats: Stats; meta: Meta }) {
  const most = Math.max(...STAGES.map((stage) => stats.by_status[stage]), 1);

  return (
    <div className="portal-card float-a w-80 p-5">
      <p className="text-xs text-[#5b6b80]">Community reports</p>
      <p className="font-heading text-lg font-extrabold text-[#0b1729]">Where reports stand</p>
      <dl className="mt-4 grid gap-3">
        {STAGES.map((stage) => (
          <div key={stage} data-status={stage} className="grid gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-[#44546a]">{meta.statuses[stage]}</dt>
              <dd className="font-semibold text-[#0b1729] tabular-nums">{stats.by_status[stage]}</dd>
            </div>
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-[#e4e9f1]">
              <span className="block h-full rounded-full" style={{ width: `${(stats.by_status[stage] / most) * 100}%`, background: "var(--plate-solid)" }} />
            </span>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OpenNowCard({ stats }: { stats: Stats }) {
  return (
    <div className="portal-card float-b flex w-64 items-center gap-3 p-3.5">
      <span className="grid size-10 flex-none place-items-center rounded-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] text-white shadow-[0_6px_16px_-6px_rgb(37_99_235/80%)]">
        <LoaderCircle aria-hidden className="size-5" />
      </span>
      <div>
        <p className="text-xs font-semibold text-[#1a4fd6]">Being worked on</p>
        <p className="font-heading text-base font-extrabold text-[#0b1729]">{stats.open} open {stats.open === 1 ? "report" : "reports"}</p>
      </div>
    </div>
  );
}

function FixRing({ stats }: { stats: Stats }) {
  const percent = stats.total > 0 ? Math.round((stats.by_status.resolved / stats.total) * 100) : 0;
  const circumference = 2 * Math.PI * 22;

  return (
    <div className="portal-card float-c flex items-center gap-3 p-3.5 pr-5">
      <div className="relative size-14">
        <svg viewBox="0 0 52 52" aria-hidden className="size-full -rotate-90">
          <circle cx="26" cy="26" r="22" fill="none" stroke="#e4e9f1" strokeWidth="6" />
          <circle cx="26" cy="26" r="22" fill="none" stroke="url(#ring-fill)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} />
          <defs>
            <linearGradient id="ring-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#22c55e" /></linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xs font-bold text-[#0b1729]">{percent}%</span>
      </div>
      <div>
        <p className="text-xs text-[#5b6b80]">Community progress</p>
        <p className="font-heading text-base font-extrabold text-[#0b1729]">{stats.by_status.resolved} problems fixed</p>
      </div>
    </div>
  );
}

/** Live community figures, floating beside the headline on wide screens. */
async function Showcase() {
  const [meta, stats] = await Promise.all([getMeta(), getStats()]);

  return (
    <>
      <div className="pointer-events-none absolute top-1/2 right-[6%] hidden -translate-y-[58%] min-[1680px]:block">
        <div className="relative h-[26rem] w-[26rem]">
          <span aria-hidden className="portal-orbit absolute inset-0" />
          <span aria-hidden className="portal-orbit absolute inset-14" />
          <div className="pointer-events-auto absolute top-10 left-8"><PipelineCard stats={stats} meta={meta} /></div>
          <div className="pointer-events-auto absolute -top-6 -right-10"><OpenNowCard stats={stats} /></div>
          <div className="pointer-events-auto absolute -bottom-2 -left-14"><FixRing stats={stats} /></div>
        </div>
      </div>
      <StatsStrip stats={stats} />
    </>
  );
}

function Hero() {
  const photo = hasHeroPhoto();

  return (
    <section className="portal-hero" data-photo={photo ? "" : undefined} aria-label="About CommunityFix">
      {photo && <img src={`/${HERO_PHOTO}`} alt="" className="absolute inset-0 -z-20 size-full object-cover" />}
      <span aria-hidden className="portal-glow" />

      <header className="relative flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="CommunityFix home">
          <span className="grid size-12 place-items-center rounded-2xl bg-white p-1.5 shadow-[0_8px_24px_-8px_rgb(0_0_0/45%)]">
            <img src="/logo-mark.png" alt="" className="size-full object-contain" />
          </span>
          <span className="grid leading-tight">
            <span className="font-heading text-2xl font-extrabold tracking-tight text-white">CommunityFix</span>
            <span className="text-xs tracking-wide text-[#c9dbff]">Report • Track • Resolve</span>
          </span>
        </Link>
        <Link href="/register" className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1a4fd6] shadow-md transition-transform hover:-translate-y-px">
          Get Started <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </header>

      <div className="portal-rise relative grid max-w-xl gap-6 py-10 lg:py-0">
        <p className="portal-glass flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-[#dbe7ff]">
          <span aria-hidden className="live-dot" /> Live in your barangay
          <Sparkles aria-hidden className="size-3.5 text-[#93c5fd]" />
        </p>
        <h2 className="font-heading text-5xl leading-[1.02] font-extrabold tracking-[-0.035em] text-white sm:text-6xl 2xl:text-7xl">
          A Better
          <span className="portal-gradient-text block">Community</span>
          <span className="portal-gradient-text block">Together</span>
        </h2>
        <p className="max-w-md text-lg text-[#dbe7ff]">
          Report community problems, track their status, and see real solutions — faster and easier for everyone.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className="group flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-[#0b1f3a] shadow-[0_12px_30px_-12px_rgb(0_0_0/55%)] transition-transform hover:-translate-y-0.5">
            Create an Account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <Suspense fallback={<div className="portal-glass h-18 w-96" />}>
        <Showcase />
      </Suspense>
    </section>
  );
}

// The sign-in panel

/** The Resident and Staff switch at the top of the sign-in panel. */
export function PortalTabs({ active }: { active: "resident" | "staff" }) {
  const tabs = [
    { key: "resident", href: "/login", label: "Resident", Icon: UserRound },
    { key: "staff", href: "/staff/login", label: "Staff", Icon: ShieldCheck },
  ] as const;

  return (
    <nav aria-label="Sign in as" className="grid grid-cols-2 gap-1 rounded-2xl bg-[#eef2f8] p-1.5 shadow-[inset_0_1px_2px_rgb(11_23_41/6%)]">
      {tabs.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-xl text-[0.95rem] font-semibold transition-all",
            active === key
              ? "bg-gradient-to-b from-[#2563eb] to-[#1a4fd6] text-white shadow-[0_8px_20px_-8px_rgb(29_78_216/85%),inset_0_1px_0_rgb(255_255_255/25%)]"
              : "text-[#44546a] hover:bg-white hover:text-[#0b1f3a]",
          )}
        >
          <Icon aria-hidden className="size-4.5" /> {label}
        </Link>
      ))}
    </nav>
  );
}

/** A heading for the sign-in card. */
export function PortalHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <h1 className="font-heading text-[1.65rem] font-extrabold tracking-tight text-[#0b1729]">{title}</h1>
      <p className="text-sm text-[#5b6b80]">{children}</p>
    </div>
  );
}

/** "or" between two ways to sign in. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-medium tracking-wider text-[#8a97a8] uppercase">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d9e2ef]" /> or
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d9e2ef]" />
    </div>
  );
}

/** The two-panel sign-in page shared by residents and staff. */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 gap-3 bg-[#e7ecf5] p-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(26rem,1fr)]">
      <Hero />

      <main className="portal-panel max-lg:order-first">
        <div className="flex w-full items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CommunityFix home">
            <img src="/logo-mark.png" alt="" className="size-10 object-contain" />
            <span className="grid leading-tight">
              <span className="font-heading text-lg font-extrabold tracking-tight text-[#0b1729]">CommunityFix</span>
              <span className="text-xs text-[#5b6b80]">Barangay Community Portal</span>
            </span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#d9e2ef] bg-white px-3 py-1 text-xs font-medium text-[#44546a] sm:flex">
            <LockKeyhole aria-hidden className="size-3.5 text-[#16a34a]" /> Secure sign-in
          </span>
        </div>

        <div className="portal-form portal-rise grid w-full max-w-[25rem] gap-4">{children}</div>

        <p className="text-center text-xs text-[#8a97a8]">
          A cleaner, safer, and more responsive community.
        </p>
      </main>
    </div>
  );
}
