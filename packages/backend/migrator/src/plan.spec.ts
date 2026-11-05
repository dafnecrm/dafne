import { isEmptyStatement, pendingMigrations, type Migration } from './plan.ts';

const m = (database: string, name: string): Migration => ({
  database,
  name,
  folderMillis: Date.UTC(
    Number(name.slice(0, 4)),
    Number(name.slice(4, 6)) - 1,
    Number(name.slice(6, 8)),
    Number(name.slice(8, 10)),
    Number(name.slice(10, 12)),
    Number(name.slice(12, 14)),
  ),
  hash: name,
  sql: [],
});

describe('pendingMigrations', () => {
  it('interleaves the databases by timestamp', () => {
    const all = [
      m('dafne_sales', '20260101000000_init'),
      m('dafne_auth', '20260201000000_move-users'),
      m('dafne_sales', '20260301000000_notes'),
      m('dafne_auth', '20260102000000_init'),
    ];
    expect(pendingMigrations(all, new Map()).map((x) => `${x.database}/${x.name}`)).toEqual([
      'dafne_sales/20260101000000_init',
      'dafne_auth/20260102000000_init',
      'dafne_auth/20260201000000_move-users',
      'dafne_sales/20260301000000_notes',
    ]);
  });

  it('leaves out what each database already applied, by name', () => {
    const all = [m('dafne_sales', '20260101000000_init'), m('dafne_auth', '20260101000000_init')];
    const applied = new Map([['dafne_sales', new Set(['20260101000000_init'])]]);
    expect(pendingMigrations(all, applied)).toEqual([all[1]]);
  });
});

describe('isEmptyStatement', () => {
  it('treats comments and blanks as empty', () => {
    expect(isEmptyStatement('\n-- moved to dafne_auth\n  \n')).toBe(true);
    expect(isEmptyStatement('-- x\nDROP TABLE `a`;')).toBe(false);
  });
});
