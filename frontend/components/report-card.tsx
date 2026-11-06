import { ArrowRight, MapPin, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { STAGES } from "@/components/issue-parts";
import { timeAgo } from "@/lib/format";
import { categoryPhoto } from "@/lib/photos";
import type { Issue, Meta } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A report as a photo card. Without a real photo it borrows one, and says so. */
export function ReportCard({ issue, meta, own = false }: { issue: Issue; meta: Meta; own?: boolean }) {
  const current = STAGES.indexOf(issue.status);

  return (
    <li>
      <Link href={own ? `/track/${issue.tracking_code}` : `/issues/${issue.id}`} className="card lift group flex h-full flex-col overflow-hidden">
        <span className="relative block aspect-[16/10] overflow-hidden bg-muted">
          {!issue.photo_url && (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">Sample photo</span>
          )}
          <img
            src={issue.photo_url ?? categoryPhoto(issue.category)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </span>
        <span className="grid flex-1 content-start gap-2 p-4">
          <span className="flex items-center justify-between gap-2">
            <span className="plate" data-status={issue.status}>{meta.statuses[issue.status]}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(issue.updated_at)}</span>
          </span>
          <span className="font-heading leading-snug font-bold [overflow-wrap:anywhere]">{issue.title}</span>
          <span className="flex items-start gap-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            <MapPin aria-hidden className="mt-0.5 size-3.5 flex-none" /> {issue.address}
          </span>
          {own && issue.status !== "rejected" && (
            <span aria-hidden className="mt-1 grid grid-cols-4 gap-1.5">
              {STAGES.map((stage, index) => (
                <span key={stage} className={cn("h-1.5 rounded-full", index <= current ? "bg-brand-green" : "bg-muted")} />
              ))}
            </span>
          )}
        </span>
        <span className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground">
          {own ? <span className="font-mono text-xs">{issue.tracking_code}</span> : meta.categories[issue.category]}
          {own && (
            <span className="flex flex-none items-center gap-1 font-semibold text-primary">
              Open <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
          {!own && !!issue.supporters && (
            <span className="flex flex-none items-center gap-1 font-semibold text-primary">
              <ThumbsUp aria-hidden className="size-3.5" /> {issue.supporters}
              <span className="sr-only">{issue.supporters === 1 ? "neighbor" : "neighbors"} also affected</span>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
