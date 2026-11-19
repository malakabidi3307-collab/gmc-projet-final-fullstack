import { NextResponse } from "next/server";

export const API_URL = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

// Doit correspondre a ADMIN_ORIGIN cote Express : c'est l'origine qui designe l'application.
export const APP_ORIGIN = process.env.ADMIN_APP_ORIGIN ?? "http://localhost:3001";

export const SESSION_COOKIE = "ifag_admin_session";
export const REFRESH_COOKIE = "ifag_admin_refresh";
export const RESTORED_COOKIE = "ifag_admin_restored";

export interface BackendResult {
  status: number;
  body: string;
  contentType: string;
  setCookies: string[];
}

/** Valeur brute d'un cookie dans l'en-tete Cookie (sans decodage). */
export function rawCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || undefined;
  }
  return undefined;
}

export async function callBackend(
  path: string,
  init: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    cookie?: string;
    json?: unknown;
    rawBody?: string;
    userAgent?: string;
  },
): Promise<BackendResult> {
  const headers: Record<string, string> = { Accept: "application/json", Origin: APP_ORIGIN };
  if (init.cookie) headers.Cookie = init.cookie;
  if (init.userAgent) headers["User-Agent"] = init.userAgent;
  if (init.json !== undefined || init.rawBody) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method: init.method,
    headers,
    body: init.rawBody ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    cache: "no-store",
    redirect: "manual",
  });
  return {
    status: res.status,
    body: await res.text(),
    contentType: res.headers.get("content-type") ?? "application/json",
    // getSetCookie() garde un en-tete par cookie : HttpOnly, Path, Max-Age, SameSite restent intacts.
    setCookies: res.headers.getSetCookie(),
  };
}

export function toResponse(result: BackendResult): NextResponse {
  const noBody = result.status === 204 || result.status === 304;
  const res = new NextResponse(noBody ? null : result.body, {
    status: result.status,
    headers: { "Content-Type": result.contentType, "Cache-Control": "no-store" },
  });
  for (const cookie of result.setCookies) res.headers.append("Set-Cookie", cookie);
  return res;
}

export function backendUnavailable(): NextResponse {
  return NextResponse.json(
    { error: { code: "BACKEND_UNAVAILABLE", message: "Le serveur est indisponible." } },
    { status: 502 },
  );
}

// Rotation du refresh token : une seule requete par token, le resultat est reutilise 3 s
// pour que les appels simultanes ne declenchent pas un conflit de rotation.
const inflight = new Map<string, Promise<BackendResult>>();

export function refreshSession(refreshToken: string, userAgent?: string): Promise<BackendResult> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;
  const pending = callBackend("/api/auth/refresh", {
    method: "POST",
    cookie: `${REFRESH_COOKIE}=${refreshToken}`,
    userAgent,
  });
  inflight.set(refreshToken, pending);
  const release = () => void setTimeout(() => inflight.delete(refreshToken), 3000);
  pending.then(release, release);
  return pending;
}