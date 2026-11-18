import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-user-groups",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});
