import { readdirSync, readFileSync } from 'node:fs';
import { PERMISSION_KEYS } from '@dafne/contracts';

// "Tutti gli utenti" has every permission: the group-permissions migration
// gave it the catalog of then, and each permission added since comes with
// a migration that gives it too. The groups are in auth since
// 20261120105132_user-groups: `SELECT "id", p FROM "auth"."user_group" … WHERE "all_users"`.
describe('permission seeds', () => {
  it('seeds every permission of the catalog', () => {
    const dir = new URL('../migrations/', import.meta.url);
    const sql = readdirSync(dir)
      .filter((name) => /^\d{14}_/.test(name))
      .map((folder) => readFileSync(new URL(`${folder}/migration.sql`, dir), 'utf8'))
      .join('\n');
    for (const key of PERMISSION_KEYS) {
      expect(sql).toContain(`'${key}'`);
    }
  });
});
