import nx from "@nx/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { DEP_CONSTRAINTS } from "../../tools/boundaries.mjs";

/*
 * ESLint of the frontend: the libs in packages/frontend/* use this file as
 * it is (`eslint src`); apps/frontend adds Next's rules on top of
 * `boundaries`.
 */

/**
 * Project boundaries (tools/boundaries.mjs): the frontend imports only
 * frontend and shared packages, never a backend one, not even for types.
 */
export const boundaries = {
  files: ["**/*.{ts,tsx,js,jsx,mjs}"],
  // Config files (eslint, next, vitest) aren't app code.
  ignores: ["**/*.config.{js,mjs,cjs,ts}"],
  plugins: { "@nx": nx },
  rules: {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        depConstraints: DEP_CONSTRAINTS,
        // The packages ship sources (no build): Next compiles them.
        enforceBuildableLibDependency: false,
        // A type-only import still couples the projects.
        allowCircularSelfDependency: true,
      },
    ],
  },
};

/** Braces on every if/else body, one-liners included. */
export const codeStyle = { rules: { curly: ["error", "all"] } };

export default tseslint.config(
  { ignores: ["**/out-tsc/**", "**/node_modules/**"] },
  tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  // As in eslint-config-next (apps/frontend): unused code is a warning.
  { rules: { "@typescript-eslint/no-unused-vars": "warn" } },
  codeStyle,
  boundaries,
);
