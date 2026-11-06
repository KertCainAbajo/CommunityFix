import { Bell, FolderOpen, LayoutDashboard, Phone, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { getNotifications, getUser, isStaff } from "@/lib/api";

const pill = buttonVariants({ variant: "ghost", className: "hidden h-9 gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold shadow-sm sm:inline-flex" });

/** The bell, a shortcut and the avatar. It also catches a cookie whose session has ended. */
async function AccountLink() {
  const user = await getUser();
  if (!user) redirect("/login");
  const { unread } = await getNotifications();
  const staff = isStaff(user);

  return (
    <div className="flex items-center gap-2.5">
      <Link href={staff ? "/dashboard" : "/my-reports"} className={pill}>
        {staff ? <LayoutDashboard aria-hidden className="size-4" /> : <FolderOpen aria-hidden className="size-4" />}
        {staff ? "Dashboard" : "My reports"}
      </Link>
      <Link href="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} className="relative grid size-9 place-items-center rounded-full border bg-card shadow-sm transition-colors hover:bg-muted">
        <Bell aria-hidden className="size-4.5" />
        {unread > 0 && <span aria-hidden className="absolute top-0 right-0 size-2.5 rounded-full bg-destructive ring-2 ring-card" />}
      </Link>
      <Link href="/account" aria-label="My account" title={user.name} className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#1a4fd6] to-[#16a34a] font-heading font-bold text-white shadow-sm transition-transform hover:scale-105">
        {user.name.charAt(0).toUpperCase()}
      </Link>
    </div>
  );
}

/** The sidebar and top bar of the signed-in site. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="side">
        <Link href="/" aria-label="CommunityFix home" className="px-1.5"><Logo /></Link>
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
        <div className="mt-auto hidden rounded-2xl border border-white/10 bg-white/8 p-4 lg:block">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Phone aria-hidden className="size-4 text-[#fca5a5]" /> Emergency?
          </p>
          <p className="mt-1 text-sm text-[#c4d2e4]">Call your local hotline. Don&apos;t use this form.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="topbar max-sm:hidden">
          <div className="container-wide flex items-center justify-between gap-4 py-3">
            <form action="/issues" role="search" className="relative w-full max-w-md">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                maxLength={100}
                aria-label="Search reports"
                placeholder="Search reports by street or problem"
                className="h-10 w-full rounded-full border bg-card pr-4 pl-10 text-sm shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-[#3b82f6] focus-visible:ring-4 focus-visible:ring-[#3b82f6]/15"
              />
            </form>
            <Suspense><AccountLink /></Suspense>
          </div>
        </header>
        <main className="page-grid flex-1">{children}</main>
        <p className="flex items-center justify-center gap-1.5 px-4 pb-5 text-sm text-muted-foreground lg:hidden">
          <Phone aria-hidden className="size-4 text-destructive" /> Emergency? Call your local hotline.
        </p>
      </div>
    </div>
  );
}
