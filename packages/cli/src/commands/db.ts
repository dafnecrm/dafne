import { Command } from "commander";
import { findWorkspaceRoot, runNx } from "../core/nx.ts";

/*
 * `dafne db …`: the migrations of the database's schemas, through the
 * targets of @dafne/backend-migrator and of the schema packages
 * (`"dafne": { "schema": … }` in their package.json).
 */

const MIGRATOR = "@dafne/backend-migrator";
const DEFAULT_DATABASE_PACKAGE = "@dafne/backend-database";

export function dbCommand() {
  const db = new Command("db").description(
    "The database: create it, and its migrations (every schema, one order)",
  );

  db.command("create")
    .description(
      "Create the database and its owner from MIGRATIONS_DATABASE_URL, as the superuser of ADMIN_DATABASE_URL",
    )
    .option("--admin-url <url>", "superuser URL, instead of ADMIN_DATABASE_URL")
    .option("--icu-locale <locale>", "ICU locale of the database (default und)")
    .option("--locale <locale>", "LC_COLLATE / LC_CTYPE (default C.UTF-8)")
    .action(
      async (options: {
        adminUrl?: string;
        icuLocale?: string;
        locale?: string;
      }) => {
        const args = ["run", `${MIGRATOR}:create-database`, "--"];
        if (options.adminUrl) args.push("--admin-url", options.adminUrl);
        if (options.icuLocale) args.push("--icu-locale", options.icuLocale);
        if (options.locale) args.push("--locale", options.locale);
        process.exitCode = await runNx(findWorkspaceRoot(), args);
      },
    );

  db.command("migrate")
    .description(
      "Apply the pending migrations of every schema (MIGRATIONS_DATABASE_URL)",
    )
    .action(async () => {
      process.exitCode = await runNx(findWorkspaceRoot(), [
        "run",
        `${MIGRATOR}:migrate`,
      ]);
    });

  db.command("generate")
    .description(
      "Generate a migration from the table changes of a schema package (drizzle-kit)",
    )
    .argument(
      "[project]",
      `schema package (default: ${DEFAULT_DATABASE_PACKAGE})`,
      DEFAULT_DATABASE_PACKAGE,
    )
    .option("--name <name>", "migration name, e.g. add-invoice")
    .option("--custom", "an empty migration, for SQL written by hand")
    .action(
      async (project: string, options: { name?: string; custom?: boolean }) => {
        const args = ["run", `${project}:migration:generate`, "--"];
        if (options.name) args.push("--name", options.name);
        if (options.custom) args.push("--custom");
        process.exitCode = await runNx(findWorkspaceRoot(), args);
      },
    );

  return db;
}
