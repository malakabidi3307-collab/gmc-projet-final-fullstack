"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { USE_DEMO } from "@/lib/config";
import { getCurrentUser } from "@/lib/services";
import { LoadingSkeleton, Unauthorized } from "./state-views";
import type { CurrentUser, Role } from "@/types";

/**
 * Contexte utilisateur de l'application ADMIN.
 * - Mode démo : administrateur fictif, AUCUNE authentification.
 * - Mode API : l'utilisateur vient de GET /api/auth/me ; sans session ou sans rôle admin, rien n'est affiché.
 * ATTENTION : ceci ne protège que l'interface. Les autorisations doivent être appliquées par le backend.
 */
const DEMO_ADMIN: CurrentUser = { name: "Administrateur (démo)", email: "admin@demo.example", role: "admin" };
const Ctx = createContext<{ user: CurrentUser } | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(USE_DEMO ? DEMO_ADMIN : null);
  const [loading, setLoading] = useState(!USE_DEMO);
  useEffect(() => {
    if (USE_DEMO) return;
    getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="p-6"><LoadingSkeleton /></div>;
  if (!user || user.role !== "admin") return <div className="p-6"><Unauthorized /></div>;
  return <Ctx.Provider value={{ user }}>{children}</Ctx.Provider>;
}

export function useCurrentUser() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCurrentUser doit être utilisé dans <RoleProvider>");
  return c;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useCurrentUser();
  return roles.includes(user.role) ? <>{children}</> : <Unauthorized />;
}
