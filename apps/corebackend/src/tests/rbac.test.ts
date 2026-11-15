import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/app-error.js";
import { requireRole } from "../middlewares/authenticate.js";

type RoleName = "ADMIN" | "TRAINER" | "LEARNER";

function run(userRole: RoleName | null, allowed: RoleName[]): unknown {
  const next = vi.fn();
  const req = {
    user: userRole ? { id: "u1", name: "Test", email: "t@test.example", role: userRole, app: "web" } : undefined,
  } as unknown as Request;
  requireRole(...allowed)(req, {} as Response, next as unknown as NextFunction);
  return next.mock.calls[0]?.[0];
}

describe("requireRole", () => {
  it("laisse passer un role autorise", () => {
    expect(run("ADMIN", ["ADMIN"])).toBeUndefined();
  });

  it("refuse un role non autorise avec 403", () => {
    const error = run("LEARNER", ["ADMIN", "TRAINER"]);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(403);
  });

  it("refuse l'absence d'utilisateur avec 401", () => {
    const error = run(null, ["ADMIN"]);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
  });
});