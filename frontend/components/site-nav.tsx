import { BarChart3, Bell, ClipboardList, FolderOpen, Hash, LayoutDashboard, LogOut, Megaphone, Radar, Settings, Users } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { buttonVariants } from "@/components/ui/button";
import { getNotifications, getUser, isStaff } from "@/lib/api";

const icon = "size-[1.15rem] flex-none text-muted-foreground";

const PUBLIC_LINKS = [
  { href: "/", label: "Overview", Icon: Radar },
  { href: "/issues", label: "All reports", Icon: ClipboardList },
  { href: "/track", label: "Track a report", Icon: Hash },
];

function PublicLinks() {
  return PUBLIC_LINKS.map(({ href, label, Icon }) => (
    <NavLink key={href} href={href} icon={<Icon aria-hidden className={icon} />}>{label}</NavLink>
  ));
}

function ReportButton() {
  return (
    <Link href="/report" className={buttonVariants({ className: "cta mb-3 h-11 w-full gap-2 text-[0.95rem]" })}>
      <Megaphone aria-hidden className="size-[1.1rem]" /> Report a problem
    </Link>
  );
}

export function SiteNavFallback() {
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 lg:grid">
      <ReportButton />
      {/* Prepared ahead of time, before the current page is known, so nothing is highlighted yet. */}
      {PUBLIC_LINKS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="side-link">
          <Icon aria-hidden className={icon} /> {label}
        </Link>
      ))}
    </nav>
  );
}

export async function SiteNav() {
  const user = await getUser();
  const notices = user ? await getNotifications() : null;

  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 lg:grid">
      <ReportButton />
      <PublicLinks />
      {user && !isStaff(user) && (
        <>
          <p className="side-section eyebrow hidden lg:block">Your account</p>
          <NavLink href="/my-reports" icon={<FolderOpen aria-hidden className={icon} />}>My reports</NavLink>
        </>
      )}
      {isStaff(user) && (
        <>
          <p className="side-section eyebrow hidden lg:block">Staff workspace</p>
          <NavLink href="/dashboard" icon={<LayoutDashboard aria-hidden className={icon} />}>Dashboard</NavLink>
          <NavLink href="/dashboard/analytics" icon={<BarChart3 aria-hidden className={icon} />}>Analytics</NavLink>
          {user.role === "admin" && (
            <NavLink href="/dashboard/staff" icon={<Users aria-hidden className={icon} />}>Staff accounts</NavLink>
          )}
        </>
      )}
      {user && (
        <>
          <NavLink href="/notifications" icon={<Bell aria-hidden className={icon} />} count={notices?.unread}>Notifications</NavLink>
          <NavLink href="/account" icon={<Settings aria-hidden className={icon} />}>My account</NavLink>
          <form action={logout}>
            <button type="submit" className="side-link w-full cursor-pointer">
              <LogOut aria-hidden className={icon} /> Log out
            </button>
          </form>
        </>
      )}
    </nav>
  );
}
