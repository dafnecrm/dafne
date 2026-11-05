import { isEmptyStatement, pendingMigrations, type Migration } from './plan.ts';

const m = (schema: string, name: string): Migration => ({
  schema,
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
  it('interleaves the schemas by timestamp', () => {
    const all = [
      m('sales', '20260101000000_init'),
      m('auth', '20260201000000_move-users'),
      m('sales', '20260301000000_notes'),
      m('auth', '20260102000000_init'),
    ];
    expect(
      pendingMigrations(all, new Map()).map((x) => `${x.schema}/${x.name}`),
    ).toEqual([
      'sales/20260101000000_init',
      'auth/20260102000000_init',
      'auth/20260201000000_move-users',
      'sales/20260301000000_notes',
    ]);
  });

  it('leaves out what each schema already applied, by name', () => {
    const all = [
      m('sales', '20260101000000_init'),
      m('auth', '20260101000000_init'),
    ];
    const applied = new Map([['sales', new Set(['20260101000000_init'])]]);
    expect(pendingMigrations(all, applied)).toEqual([all[1]]);
  });
});

describe('isEmptyStatement', () => {
  it('treats comments and blanks as empty', () => {
    expect(isEmptyStatement('\n-- moved to core\n  \n')).toBe(true);
    expect(isEmptyStatement('-- x\nDROP TABLE "a";')).toBe(false);
  });
});
