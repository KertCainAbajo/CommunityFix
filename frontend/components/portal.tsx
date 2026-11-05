import fs from "node:fs";
import path from "node:path";

import { ArrowRight, CircleCheckBig, Clock3, ShieldCheck, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { getStats } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Put a photo at frontend/public/portal-hero.jpg (for example, your barangay hall) and it fills the left panel. */
const HERO_PHOTO = "portal-hero.jpg";

function hasHeroPhoto() {
  return fs.existsSync(path.join(process.cwd(), "public", HERO_PHOTO));
}

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#features", label: "Features" },
  { href: "/#contact", label: "Contact" },
];

function Skyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="xMidYMax slice" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M0 60V44h14V30h10v14h8V22h16v22h6V36h12v24h4V18h6V8h4v10h6v42h8V34h14v26h6V26h18v34h6V40h10V28h8v32h10V14h12v46h6V36h12v24h8V24h6v-8h6v8h6v36h10V40h14v20h6V30h16v30h8V20h12v40h6V44h14v16h8V34h10v26h10V26h14v34h12V40h12v20z"
      />
    </svg>
  );
}

async function HeroStats() {
  const stats = await getStats();
  const resolved = stats.total > 0 ? Math.round((stats.by_status.resolved / stats.total) * 100) : 0;
  const items = [
    { Icon: Users, value: `${stats.total}`, label: "Reports Filed" },
    { Icon: CircleCheckBig, value: `${resolved}%`, label: "Resolved Issues" },
    {
      Icon: Clock3,
      value: stats.avg_resolution_days === null ? "New" : `${stats.avg_resolution_days} days`,
      label: "Average Fix Time",
    },
  ];

  return (
    <dl className="flex flex-wrap gap-x-9 gap-y-4">
      {items.map(({ Icon, value, label }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon aria-hidden className="size-8 text-white" strokeWidth={1.8} />
          <div className="leading-tight">
            <dd className="font-heading text-2xl font-extrabold text-white">{value}</dd>
            <dt className="text-sm text-[#dbe7ff]">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}

function Hero() {
  const photo = hasHeroPhoto();

  return (
    <section className="portal-hero" data-photo={photo ? "" : undefined} aria-label="About CommunityFix">
      {photo && <img src={`/${HERO_PHOTO}`} alt="" className="absolute inset-0 -z-20 size-full object-cover" />}
      {!photo && <Skyline className="absolute inset-x-0 bottom-0 -z-10 h-44 w-full text-white/10" />}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="CommunityFix home">
          <span className="grid size-12 place-items-center rounded-xl bg-white p-1.5 shadow-lg">
            <img src="/logo-mark.png" alt="" className="size-full object-contain" />
          </span>
          <span className="grid leading-tight">
            <span className="font-heading text-2xl font-extrabold tracking-tight text-white">CommunityFix</span>
            <span className="text-xs text-[#dbe7ff]">Report • Track • Resolve</span>
          </span>
        </Link>
        <nav aria-label="Public site" className="hidden items-center gap-2 md:flex">
          {NAV.map(({ href, label }) => (
            <Link key={label} href={href} className="rounded-full px-3 py-1.5 font-medium text-white hover:bg-white/10">
              {label}
            </Link>
          ))}
          <Link href="/register" className="ml-3 rounded-full bg-white px-5 py-2 font-semibold text-[#1a4fd6] shadow-md hover:bg-[#eaf1ff]">
            Get Started
          </Link>
        </nav>
      </header>

      <div className="grid max-w-xl gap-6 py-10 lg:py-0">
        <h2 className="font-heading text-5xl leading-[1.04] font-extrabold tracking-tight text-white sm:text-6xl xl:text-7xl">
          A Better <span className="block text-[#cfe1ff]">Community</span>
          <span className="block text-[#cfe1ff]">Together</span>
        </h2>
        <p className="max-w-md text-lg font-medium text-white">
          Report community problems, track their status, and see real solutions — faster and easier for everyone.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/report" className="flex h-12 items-center gap-2 rounded-lg bg-white px-5 font-semibold text-[#0b1f3a] shadow-lg hover:bg-[#eaf1ff]">
            Report a Concern <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link href="/#features" className="flex h-12 items-center rounded-lg border border-white/70 px-6 font-semibold text-white hover:bg-white/10">
            Learn More
          </Link>
        </div>
      </div>

      <Suspense fallback={<div className="h-12" />}>
        <HeroStats />
      </Suspense>
    </section>
  );
}

/** The Resident and Staff switch at the top of the sign-in panel. */
export function PortalTabs({ active }: { active: "resident" | "staff" }) {
  const tabs = [
    { key: "resident", href: "/login", label: "Resident", Icon: UserRound },
    { key: "staff", href: "/staff/login", label: "Staff", Icon: ShieldCheck },
  ] as const;

  return (
    <nav aria-label="Sign in as" className="grid grid-cols-2 gap-2">
      {tabs.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-lg border font-semibold transition-colors",
            active === key
              ? "border-[#1a4fd6] bg-[#1a4fd6] text-white shadow-[0_10px_24px_-12px_rgb(29_78_216/80%)]"
              : "border-[#d9e2ef] bg-white text-[#0b1f3a] hover:bg-[#f4f7fc]",
          )}
        >
          <Icon aria-hidden className="size-4.5" fill={active === key ? "currentColor" : "none"} /> {label}
        </Link>
      ))}
    </nav>
  );
}

/** "or" between two ways to sign in. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="h-px flex-1 bg-[#d9e2ef]" /> or <span className="h-px flex-1 bg-[#d9e2ef]" />
    </div>
  );
}

/** The two-panel sign-in page shared by residents and staff. */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 gap-3 bg-[#e9eef7] p-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(24rem,1fr)]">
      <Hero />

      <main className="portal-panel max-lg:order-first">
        <div className="grid w-full max-w-sm gap-4">
          <div className="mb-2 grid justify-items-center gap-1 text-center">
            <img src="/logo-mark.png" alt="" className="mb-1 size-18 object-contain" />
            <p className="font-heading text-[1.75rem] font-extrabold tracking-tight text-[#0b1f3a]">CommunityFix</p>
            <p className="text-sm font-medium text-[#0b1f3a]">Barangay Community Portal</p>
          </div>
          {children}
        </div>

        <div className="mt-auto grid w-full justify-items-center gap-2 pt-10">
          <p className="text-center text-xs text-muted-foreground">A cleaner, safer, and more responsive community.</p>
          <Skyline className="h-12 w-full text-[#cbd8ee]" />
        </div>
      </main>
    </div>
  );
}
