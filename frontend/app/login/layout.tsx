import { PortalShell } from "@/components/portal";

export default function ResidentPortalLayout({ children }: LayoutProps<"/login">) {
  return <PortalShell>{children}</PortalShell>;
}
