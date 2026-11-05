import { PortalShell } from "@/components/portal";

export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return <PortalShell>{children}</PortalShell>;
}
