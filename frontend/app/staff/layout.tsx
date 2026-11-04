import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1.15fr_1fr]">
      <aside className="asphalt relative flex flex-col justify-between gap-8 overflow-hidden p-6 lg:p-12">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <Logo />
          <span className="font-display text-2xl font-extrabold tracking-wide uppercase">CommunityFix</span>
        </Link>
        <div className="grid gap-3">
          <p className="font-mono text-xs tracking-widest text-paint uppercase">Authorized personnel only</p>
          <h2 className="text-5xl leading-[0.95] lg:text-7xl">
            Staff<br /><span className="text-paint">portal</span>
          </h2>
          <p className="hidden max-w-sm text-lg text-muted-foreground lg:block">
            Verify reports, assign maintenance teams and keep residents updated until every problem is fixed.
          </p>
        </div>
        <div className="lane-line hidden lg:block" />
      </aside>

      <main className="grid content-center justify-items-center gap-8 p-6 lg:p-12">
        <div className="grid w-full max-w-sm gap-3.5">{children}</div>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" /> Back to the public site
        </Link>
      </main>
    </div>
  );
}
