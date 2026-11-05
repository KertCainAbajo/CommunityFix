import { FolderOpen, LayoutDashboard, LogIn, Phone } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { getUser, isStaff } from "@/lib/api";

const pill = buttonVariants({ variant: "ghost", className: "hidden h-9 gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold shadow-sm sm:inline-flex" });

function LoginLink() {
  return (
    <Link href="/login" className={pill}>
      <LogIn aria-hidden className="size-4" /> Sign in
    </Link>
  );
}

/** Signed-in people get a way back to their reports or their work instead of a sign-in link. */
async function StaffLink() {
  const user = await getUser();
  if (!user) return <LoginLink />;

  if (!isStaff(user)) {
    return (
      <Link href="/my-reports" className={pill}>
        <FolderOpen aria-hidden className="size-4" /> My reports
      </Link>
    );
  }

  return (
    <Link href="/dashboard" className={pill}>
      <LayoutDashboard aria-hidden className="size-4" /> Dashboard
    </Link>
  );
}

/** The sidebar, top bar and footer of the public site and the staff dashboard. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="side">
        <Link href="/" aria-label="CommunityFix home" className="px-1.5"><Logo /></Link>
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
        <div className="mt-auto hidden rounded-2xl border bg-gradient-to-br from-[#eaf1ff] to-[#e8f8ef] p-4 lg:block">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Phone aria-hidden className="size-4 text-destructive" /> Emergency?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Call your local hotline. Don&apos;t use this form.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="topbar">
          <div className="container-wide flex items-center justify-between gap-4 py-3">
            <p className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground shadow-sm">
              <span aria-hidden className="live-dot" />
              <span><span className="font-semibold text-foreground">Live</span> · updates as staff work on reports</span>
            </p>
            <Suspense fallback={<LoginLink />}><StaffLink /></Suspense>
          </div>
        </header>
        <main className="page-grid flex-1">{children}</main>
        <footer id="contact" className="border-t">
          <div className="container-wide flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5 text-sm text-muted-foreground">
            <span>© CommunityFix · Issue reporting and resolution platform</span>
            <span className="flex items-center gap-1.5 lg:hidden"><Phone aria-hidden className="size-4 text-destructive" /> Emergency? Call your local hotline.</span>
            <Link href="/staff/login" className="font-semibold text-foreground hover:text-primary">Staff login →</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
