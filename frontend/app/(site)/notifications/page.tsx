import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, PageSkeleton } from "@/components/issue-parts";
import { MarkAllRead } from "@/components/resident-forms";
import { getNotifications, requireAccount } from "@/lib/api";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

async function Notices() {
  await requireAccount("/notifications");
  const { items, unread } = await getNotifications();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Notifications</h1>
        {unread > 0 && <MarkAllRead />}
      </div>
      {items.length === 0 ? (
        <div className="card"><EmptyState>Nothing yet. Updates on your reports will appear here.</EmptyState></div>
      ) : (
        <ul className="card divide-y overflow-hidden">
          {items.map((notice) => (
            <li key={notice.id}>
              <Link href={notice.href} className="flex gap-3 p-4 transition-colors hover:bg-muted">
                <span className={`grid size-10 flex-none place-items-center rounded-full ${notice.read ? "bg-muted text-muted-foreground" : "bg-sky text-primary"}`}>
                  <Bell aria-hidden className="size-5" />
                </span>
                <span className="grid min-w-0 gap-0.5 [overflow-wrap:anywhere]">
                  <span className={notice.read ? "font-medium" : "font-bold"}>{notice.title}</span>
                  <span className="text-muted-foreground">{notice.message}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(notice.created_at)}</span>
                </span>
                {!notice.read && <span className="ml-auto size-2.5 flex-none self-center rounded-full bg-primary"><span className="sr-only">Unread</span></span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Notices />
    </Suspense>
  );
}
