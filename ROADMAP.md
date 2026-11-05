# Roadmap

🚧 Planned work, not yet implemented 🚧

## CLI: sharing tables through `dafne_core`

Today `dafne g backend-app` and `dafne g backend-lib` only ask for a name, and nothing moves
a table from an app's database to `dafne_core` (which doesn't exist yet).
When a second app needs a table of another app (e.g. `reporting` reading
`customer` from `dafne_sales`), the CLI should handle it, both when the app is
created and later, when a feature is added to it. One mechanism for both:

1. **`dafne_core` package**: a database package like the apps' ones
   (`"dafne": { "database": "dafne_core" }`, `migrations/`), created the
   first time it's needed.
2. **`move-to-core` generator** (e.g. `dafne db share customer`), callable at
   any time:
   - moves the table's Drizzle definition into the core package;
   - writes a migration with `RENAME TABLE dafne_<app>.<table> TO
     dafne_core.<table>` (same server: no data copy);
   - updates imports and foreign keys in the app that owned it;
   - updates the `package.json` dependencies of the lib and the app.
3. **Questions in `g backend-app` / `g backend-lib`**: which features to use and, for each
   table in another app's database, whether to move it to core or read it
   through that app's API. Choosing core runs the generator above.
