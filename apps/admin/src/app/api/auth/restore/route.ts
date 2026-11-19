import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE, RESTORED_COOKIE, rawCookie, refreshSession } from "@/lib/server/backend";

// Appelee par le layout quand l'access token est absent ou expire (un Server Component ne peut pas poser de cookie).
export async function GET(request: NextRequest) {
  const token = rawCookie(request.headers.get("cookie"), REFRESH_COOKIE);
  let ok = false;
  let setCookies: string[] = [];
  if (token) {
    try {
      const result = await refreshSession(token, request.headers.get("user-agent") ?? undefined);
      ok = result.status === 200;
      setCookies = result.setCookies;
    } catch {
      ok = false;
    }
  }
  const response = NextResponse.redirect(new URL(ok ? "/dashboard" : "/login", request.url));
  for (const cookie of setCookies) response.headers.append("Set-Cookie", cookie);
  if (ok) {
    // Anti-boucle : si le layout echoue encore juste apres un renouvellement, il ira a /login.
    response.cookies.set(RESTORED_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10,
      secure: process.env.NODE_ENV === "production",
    });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}