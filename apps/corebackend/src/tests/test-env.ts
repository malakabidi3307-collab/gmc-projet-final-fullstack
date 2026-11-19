import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Charge .env.test et refuse de continuer si la base n'est pas une base de test.
export function loadTestEnv(): void {
  config({ path: fileURLToPath(new URL("../../.env.test", import.meta.url)), override: true, quiet: true });
  process.env.NODE_ENV = "test";

  const url = process.env.DATABASE_URL ?? "";
  const dbName = url.split("?")[0].split("/").pop() ?? "";
  if (!dbName.endsWith("_test")) {
    throw new Error("Securite : les tests exigent une base dont le nom finit par _test. Arret.");
  }
}