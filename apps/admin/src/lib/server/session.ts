import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { CurrentUser } from "@/types";
import { RESTORED_COOKIE, SESSION_COOKIE, callBackend, rawCookie } from "./backend";

interface MeResponse {
  user?: { id: string; name: string; email: string; role: string };
}

/** Utilisateur ADMIN de la requete en cours, ou null (aucune session, session expiree, autre role). */
export const getAdminUser = cache(async (): Promise<CurrentUser | null> => {
  const token = rawCookie((await headers()).get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  try {
    const result = await callBackend("/api/auth/me", { method: "GET", cookie: `${SESSION_COOKIE}=${token}` });
    if (result.status !== 200) return null;
    const user = (JSON.parse(result.body) as MeResponse).user;
    if (!user || user.role !== "ADMIN") return null;
    return { name: user.name, email: user.email, role: "admin" };
  } catch {
    return null;
  }
});

/**
 * A appeler dans le layout ET dans les pages sensibles.
 * Sans session valide : tentative de renouvellement (une seule fois), sinon /login.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getAdminUser();
  if (user) return user;
  const alreadyTried = (await cookies()).get(RESTORED_COOKIE) !== undefined;
  redirect(alreadyTried ? "/login" : "/api/auth/restore");
}