import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";

/** The header and footer of the public site and the staff dashboard. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="asphalt">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-2xl font-extrabold tracking-wide uppercase">CommunityFix</span>
          </Link>
          <Suspense fallback={<SiteNavFallback />}>
            <SiteNav />
          </Suspense>
        </div>
      </header>
      <main className="page-grid flex-1">{children}</main>
      <footer className="asphalt">
        <div className="lane-line" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <span className="font-display text-lg font-bold tracking-wide text-foreground uppercase">CommunityFix</span>
          <span>For emergencies, call your local hotline instead of filing a report.</span>
          <Link href="/staff/login" className="font-display font-semibold tracking-wide uppercase hover:text-paint">Staff login</Link>
        </div>
      </footer>
    </>
  );
}
