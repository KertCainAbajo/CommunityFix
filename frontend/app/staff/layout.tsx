import type { Metadata } from "next";

import { PortalShell } from "@/components/portal";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StaffPortalLayout({ children }: LayoutProps<"/staff">) {
  return <PortalShell>{children}</PortalShell>;
}
