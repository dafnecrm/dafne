#!/usr/bin/env node
/*
 * Fails when a project depends on one its scope doesn't allow
 * (tools/boundaries.mjs). It reads the Nx project graph, so it sees both
 * the imports and the dependencies in package.json, for every project:
 * ESLint covers the frontend's imports, this covers the rest (the backend
 * lints with oxlint, which has no such rule). Run: `pnpm boundaries`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEP_CONSTRAINTS, SCOPES } from "./boundaries.mjs";

const dir = mkdtempSync(join(tmpdir(), "dafne-graph-"));
const file = join(dir, "graph.json");
try {
  execFileSync("pnpm", ["exec", "nx", "graph", `--file=${file}`], { stdio: "ignore" });
  const { graph } = JSON.parse(readFileSync(file, "utf8"));
  const problems = [];

  const scopeOf = (name) => {
    const tags = graph.nodes[name]?.data.tags ?? [];
    return tags.filter((tag) => SCOPES.includes(tag));
  };

  for (const name of Object.keys(graph.nodes)) {
    const scopes = scopeOf(name);
    if (scopes.length !== 1) {
      problems.push(`${name}: needs exactly one of ${SCOPES.join(", ")} in nx.tags (has ${scopes.join(", ") || "none"})`);
      continue;
    }
    const allowed = DEP_CONSTRAINTS.find((c) => c.sourceTag === scopes[0]).onlyDependOnLibsWithTags;
    for (const { target } of graph.dependencies[name] ?? []) {
      if (!graph.nodes[target]) {
        continue;
      } // npm packages
      const [targetScope] = scopeOf(target);
      if (!allowed.includes(targetScope)) {
        problems.push(`${name} (${scopes[0]}) depends on ${target} (${targetScope ?? "no scope"}): ${scopes[0]} may only depend on ${allowed.join(", ")}`);
      }
    }
  }

  if (problems.length) {
    console.error(`Project boundaries (tools/boundaries.mjs):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Project boundaries: ${Object.keys(graph.nodes).length} projects OK.`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
