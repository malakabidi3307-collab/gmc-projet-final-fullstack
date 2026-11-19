import type { NextRequest } from "next/server";
import { REFRESH_COOKIE, backendUnavailable, rawCookie, refreshSession, toResponse } from "@/lib/server/backend";
import { forbiddenOrigin, isTrustedOrigin } from "@/lib/server/origin";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) return forbiddenOrigin();

  // Ce cookie a Path=/api/auth : le navigateur ne l'envoie qu'a ces routes.
  const token = rawCookie(request.headers.get("cookie"), REFRESH_COOKIE);
  if (!token) {
    return Response.json({ error: { code: "UNAUTHENTICATED", message: "Authentification requise." } }, { status: 401 });
  }
  try {
    // Les appels simultanes sur le meme token partagent une seule rotation.
    return toResponse(await refreshSession(token, request.headers.get("user-agent") ?? undefined));
  } catch {
    return backendUnavailable();
  }
}