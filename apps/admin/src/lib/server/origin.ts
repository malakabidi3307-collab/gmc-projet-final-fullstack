import { NextResponse, type NextRequest } from "next/server";
import { APP_ORIGIN } from "./backend";

/** Protection CSRF du BFF : une requete qui modifie des donnees doit venir de cette application. */
export function isTrustedOrigin(request: NextRequest): boolean {
  return request.headers.get("origin") === APP_ORIGIN;
}

export function forbiddenOrigin(): NextResponse {
  return NextResponse.json(
    { error: { code: "ORIGIN_NOT_ALLOWED", message: "Origine de la requête non autorisée." } },
    { status: 403 },
  );
}