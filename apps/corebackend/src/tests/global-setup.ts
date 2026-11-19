import { execSync } from "node:child_process";
import { loadTestEnv } from "./test-env.js";

// Applique les migrations sur la base de test avant la premiere suite (idempotent).
export default function setup(): void {
  loadTestEnv();
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit" });
}