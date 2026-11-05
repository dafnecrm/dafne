# Roadmap

🚧 Planned work, not yet implemented 🚧

## CLI: sharing tables through the `core` schema

Today `dafne g backend-app` and `dafne g backend-lib` only ask for a name, and nothing moves
a table from an app's schema to `core` (which doesn't exist yet).
When a second app needs a table of another app (e.g. `reporting` reading
`customer` from `sales`), the CLI should handle it, both when the app is
created and later, when a feature is added to it. One mechanism for both:

1. **`core` package**: a schema package like the apps' ones
   (`"dafne": { "schema": "core" }`, `migrations/`), created the
   first time it's needed.
2. **`move-to-core` generator** (e.g. `dafne db share customer`), callable at
   any time:
   - moves the table's Drizzle definition into the core package;
   - writes a migration with `ALTER TABLE <app>.<table> SET SCHEMA core`
     (no data copy);
   - updates imports and foreign keys in the app that owned it;
   - updates the `package.json` dependencies of the lib and the app.
3. **Questions in `g backend-app` / `g backend-lib`**: which features to use and, for each
   table in another app's schema, whether to move it to core or read it
   through that app's API. Choosing core runs the generator above.
