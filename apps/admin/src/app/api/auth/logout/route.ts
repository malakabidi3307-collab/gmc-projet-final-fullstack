import type { NextRequest } from "next/server";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  backendUnavailable,
  callBackend,
  rawCookie,
  toResponse,
} from "@/lib/server/backend";
import { forbiddenOrigin, isTrustedOrigin } from "@/lib/server/origin";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) return forbiddenOrigin();

  const header = request.headers.get("cookie");
  const session = rawCookie(header, SESSION_COOKIE);
  const refresh = rawCookie(header, REFRESH_COOKIE);
  // Seuls les cookies de l'application Admin sont transmis au backend.
  const cookie = [session && `${SESSION_COOKIE}=${session}`, refresh && `${REFRESH_COOKIE}=${refresh}`]
    .filter(Boolean)
    .join("; ");
  try {
    // Express revoque la session et renvoie les Set-Cookie d'effacement, relayes tels quels.
    return toResponse(await callBackend("/api/auth/logout", { method: "POST", cookie: cookie || undefined }));
  } catch {
    // Backend injoignable : on efface au moins les cookies localement (memes chemins que cookies.ts).
    const res = backendUnavailable();
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/api/auth", maxAge: 0 });
    return res;
  }
}