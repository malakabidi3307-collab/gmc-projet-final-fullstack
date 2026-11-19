import type { NextRequest } from "next/server";
import { SESSION_COOKIE, backendUnavailable, callBackend, rawCookie, toResponse } from "@/lib/server/backend";
import { forbiddenOrigin, isTrustedOrigin } from "@/lib/server/origin";

// Seules ces ressources Express sont accessibles ; /auth passe par ses propres routes.
const ALLOWED = new Set(["admin", "courses", "enrollments", "health", "training-sessions", "users"]);
const WRITE_METHODS = new Set(["POST", "PATCH", "DELETE"]);

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context, method: Method) {
  const { path } = await context.params;
  if (path.length === 0 || !ALLOWED.has(path[0])) {
    return Response.json({ error: { code: "NOT_FOUND", message: "Ressource introuvable." } }, { status: 404 });
  }
  if (WRITE_METHODS.has(method) && !isTrustedOrigin(request)) return forbiddenOrigin();

  const token = rawCookie(request.headers.get("cookie"), SESSION_COOKIE);
  const body = method === "POST" || method === "PATCH" ? await request.text() : undefined;
  try {
    return toResponse(
      await callBackend(`/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, {
        method,
        // Seul le cookie de session Admin est transmis a Express.
        cookie: token ? `${SESSION_COOKIE}=${token}` : undefined,
        rawBody: body || undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      }),
    );
  } catch {
    return backendUnavailable();
  }
}

export const GET = (request: NextRequest, context: Context) => forward(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => forward(request, context, "POST");
export const PATCH = (request: NextRequest, context: Context) => forward(request, context, "PATCH");
export const DELETE = (request: NextRequest, context: Context) => forward(request, context, "DELETE");