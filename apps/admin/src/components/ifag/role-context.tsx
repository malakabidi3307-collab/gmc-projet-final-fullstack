"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Unauthorized } from "./state-views";
import type { CurrentUser, Role } from "@/types";

/**
 * Contexte utilisateur de l'application ADMIN.
 * L'utilisateur est fourni par le layout serveur apres verification de la session.
 * ATTENTION : ceci ne gere que l'affichage. Les autorisations sont appliquees par le backend.
 */
const Ctx = createContext<{ user: CurrentUser } | null>(null);

export function RoleProvider({ user, children }: { user: CurrentUser; children: ReactNode }) {
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