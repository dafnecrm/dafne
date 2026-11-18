import { readdirSync, readFileSync } from 'node:fs';
import { PERMISSION_KEYS } from '@dafne/contracts';

// The migration that gives "Tutti gli utenti" every permission lists them
// by hand: it must list every one the catalog had then.
describe('group-permissions migration', () => {
  it('seeds every permission of the catalog', () => {
    const dir = new URL('../migrations/', import.meta.url);
    const folder = readdirSync(dir).find((name) => name.endsWith('_group-permissions'))!;
    const sql = readFileSync(new URL(`${folder}/migration.sql`, dir), 'utf8');
    for (const key of PERMISSION_KEYS) {
      expect(sql).toContain(`'${key}'`);
    }
  });
});
