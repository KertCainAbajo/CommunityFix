import { ArrowRight, CircleHelp, MapPin, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { CATEGORY_ICONS, STAGES } from "@/components/issue-parts";
import { StageBar } from "@/components/tracked-report";
import { timeAgo } from "@/lib/format";
import { categoryPhoto } from "@/lib/photos";
import type { Issue, Meta } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A report as a photo card. Without a real photo it borrows one, and says so. */
export function ReportCard({ issue, meta, own = false, featured = false }: { issue: Issue; meta: Meta; own?: boolean; featured?: boolean }) {
  const current = STAGES.indexOf(issue.status);
  const Icon = CATEGORY_ICONS[issue.category] ?? CircleHelp;

  return (
    <li className={featured ? "bento-featured" : undefined}>
      <Link href={own ? `/track/${issue.tracking_code}` : `/issues/${issue.id}`} className="card lift group flex h-full flex-col overflow-hidden">
        <span className={cn("relative block overflow-hidden bg-muted", featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-0 lg:flex-1" : "aspect-[16/10]")}>
          {featured && (
            <span className="absolute top-2 right-2 z-10 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-primary shadow">Newest</span>
          )}
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
        <span className={cn("grid content-start gap-2 p-4", featured ? "lg:p-6" : "flex-1")}>
          <span className="flex items-center justify-between gap-2">
            <span className="plate" data-status={issue.status}>{meta.statuses[issue.status]}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(issue.updated_at)}</span>
          </span>
          <span className={cn("font-heading leading-snug font-bold [overflow-wrap:anywhere]", featured && "text-2xl")}>{issue.title}</span>
          {featured && <span className="line-clamp-2 text-muted-foreground [overflow-wrap:anywhere]">{issue.description}</span>}
          <span className="flex items-start gap-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            <MapPin aria-hidden className="mt-0.5 size-3.5 flex-none" /> {issue.address}
          </span>
          {issue.status !== "rejected" && current >= 0 && <span className="mt-1"><StageBar issue={issue} /></span>}
        </span>
        <span className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground">
          {own ? (
            <span className="font-mono text-xs">{issue.tracking_code}</span>
          ) : (
            <span className="flex items-center gap-1.5"><Icon aria-hidden className="size-4 text-primary" /> {meta.categories[issue.category]}</span>
          )}
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
