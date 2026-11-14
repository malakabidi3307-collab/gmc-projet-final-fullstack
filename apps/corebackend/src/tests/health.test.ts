import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /api/health", () => {
  it("repond 200 avec un statut ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
  });
});

describe("GET /api/health/db", () => {
  it("confirme la connexion a la base de test", async () => {
    const res = await request(app).get("/api/health/db");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "up" });
  });
});

describe("gestion des erreurs", () => {
  it("renvoie 404 au format d'erreur commun", async () => {
    const res = await request(app).get("/api/nexiste-pas");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("renvoie 400 sur un JSON invalide", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{pas du json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});

describe("CORS", () => {
  it("autorise une origine configuree, avec credentials", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:3001");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("n'autorise pas une origine inconnue", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});