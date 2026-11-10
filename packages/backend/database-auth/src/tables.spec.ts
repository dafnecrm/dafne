import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTableConfig, PgTimestamp, type PgTable } from 'drizzle-orm/pg-core';
import { intoAuthSchema } from './into-schema.ts';
import { authSchema } from './schema.ts';

describe('auth tables', () => {
  it.each(Object.entries(authSchema))(
    '%s is in the auth schema, with time zones',
    (_, table) => {
      const config = getTableConfig(table as PgTable);
      expect(config.schema).toBe('auth');
      for (const column of config.columns.filter(
        (c) => c instanceof PgTimestamp,
      )) {
        expect((column as PgTimestamp).withTimezone, column.name).toBe(true);
      }
    },
  );

  it('src/better-auth.ts went through tables:schema', () => {
    const source = readFileSync(
      join(import.meta.dirname, 'better-auth.ts'),
      'utf8',
    );
    expect(intoAuthSchema(source)).toBe(source);
  });
});

describe('intoAuthSchema', () => {
  it('moves pgTables into authDb, with time zones', () => {
    const out = intoAuthSchema(
      'import { pgTable, text, timestamp } from "drizzle-orm/pg-core";\n\nexport const user = pgTable("user", {\n  id: text("id").primaryKey(),\n  createdAt: timestamp("created_at").notNull(),\n});\n',
    );
    expect(out).toContain(
      'import { text, timestamp } from "drizzle-orm/pg-core";\nimport { authDb } from \'./auth-db.ts\';',
    );
    expect(out).toContain('export const user = authDb.table("user", {');
    expect(out).toContain(
      'timestamp("created_at", { withTimezone: true }).notNull()',
    );
    expect(intoAuthSchema(out)).toBe(out);
  });
});
