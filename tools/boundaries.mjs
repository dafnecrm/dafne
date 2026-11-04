/**
 * Which projects may depend on which, by their Nx tag (`nx.tags` in each
 * package.json). The only place these rules are written: ESLint
 * (@nx/enforce-module-boundaries, frontend) and tools/check-boundaries.mjs
 * (every project, imports and package.json dependencies) both read them.
 *
 * - Only the backend reaches the database: the frontend depends on frontend
 *   and shared packages, never on a backend one (not even for types).
 * - Shared packages (contracts, auth-options) are used by both sides, so
 *   they depend only on other shared packages.
 */
export const DEP_CONSTRAINTS = [
  {
    sourceTag: "scope:frontend",
    onlyDependOnLibsWithTags: ["scope:frontend", "scope:shared"],
  },
  {
    sourceTag: "scope:backend",
    onlyDependOnLibsWithTags: ["scope:backend", "scope:shared"],
  },
  {
    sourceTag: "scope:shared",
    onlyDependOnLibsWithTags: ["scope:shared"],
  },
  {
    sourceTag: "scope:tooling",
    onlyDependOnLibsWithTags: ["scope:tooling"],
  },
];

/** The scopes a project must have exactly one of. */
export const SCOPES = DEP_CONSTRAINTS.map((c) => c.sourceTag);
