import { NextResponse, type NextRequest } from "next/server";
import { backendUnavailable, callBackend, toResponse } from "@/lib/server/backend";
import { forbiddenOrigin, isTrustedOrigin } from "@/lib/server/origin";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) return forbiddenOrigin();

  let payload: { email?: unknown; password?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Corps de requete invalide." } },
      { status: 400 },
    );
  }
  try {
    // Le client est impose ici : le navigateur ne peut pas choisir "web" depuis l'application Admin.
    const result = await callBackend("/api/auth/login", {
      method: "POST",
      json: { email: payload.email, password: payload.password, client: "admin" },
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return toResponse(result);
  } catch {
    return backendUnavailable();
  }
}