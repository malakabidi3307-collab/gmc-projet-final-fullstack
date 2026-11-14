import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/tests/setup.ts"],
    globalSetup: ["src/tests/global-setup.ts"],
    // Les tests d'integration partagent une seule base : on les execute en sequence.
    fileParallelism: false,
  },
});