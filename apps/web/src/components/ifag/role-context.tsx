"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { USE_DEMO } from "@/lib/config";
import { getCurrentUser } from "@/lib/services";
import { Unauthorized } from "./state-views";
import type { CurrentUser, Role } from "@/types";

const DEMO_USERS: Record<Role, CurrentUser> = {
  admin: { name: "Administrateur (démo)", email: "admin@demo.example", role: "admin" },
  trainer: { name: "S. Benali", email: "s.benali@demo.example", role: "trainer" },
  learner: { name: "Amina Meziane", email: "amina.m@demo.example", role: "learner" },
};
interface Ctx { user: CurrentUser; setRole: (r: Role) => void; loading: boolean }
const RoleCtx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(DEMO_USERS.admin);
  const [loading, setLoading] = useState(!USE_DEMO);
  useEffect(() => {
    if (USE_DEMO) return;
    // Mode API : l'utilisateur vient de GET /api/auth/me (le rôle n'est alors plus modifiable).
    getCurrentUser().then(setUser).catch(() => undefined).finally(() => setLoading(false));
  }, []);
  return <RoleCtx.Provider value={{ user, loading, setRole: (r) => USE_DEMO && setUser(DEMO_USERS[r]) }}>{children}</RoleCtx.Provider>;
}

export function useCurrentUser() {
  const c = useContext(RoleCtx);
  if (!c) throw new Error("useCurrentUser doit être utilisé dans <RoleProvider>");
  return c;
}

// Garde d'interface uniquement : l'autorisation réelle doit être appliquée par le backend.
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useCurrentUser();
  return roles.includes(user.role) ? <>{children}</> : <Unauthorized />;
}
