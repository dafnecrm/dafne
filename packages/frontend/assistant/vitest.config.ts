import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-assistant",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});
