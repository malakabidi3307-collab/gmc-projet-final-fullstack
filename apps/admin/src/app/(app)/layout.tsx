import type { ReactNode } from "react";
import { AppShell } from "@/components/ifag/app-shell";
import { RoleProvider } from "@/components/ifag/role-context";
import { requireAdmin } from "@/lib/server/session";

// Verification cote serveur AVANT le rendu : sans session ADMIN valide, aucune page privee n'est produite.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return (
    <RoleProvider user={user}>
      <AppShell>{children}</AppShell>
    </RoleProvider>
  );
}