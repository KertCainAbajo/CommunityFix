import Link from "next/link";

import { EmptyState } from "@/components/issue-parts";

export default function NotFound() {
  return (
    <EmptyState>
      We couldn&apos;t find that page. <Link href="/" className="text-primary underline">Go home</Link>
    </EmptyState>
  );
}
