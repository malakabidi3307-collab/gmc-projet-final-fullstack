import type { ReactNode } from "react";
import { AppShell } from "@/components/ifag/app-shell";
import { RoleProvider } from "@/components/ifag/role-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <RoleProvider><AppShell>{children}</AppShell></RoleProvider>;
}
