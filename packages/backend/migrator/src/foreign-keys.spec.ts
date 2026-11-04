import { qualifyForeignKeys } from './foreign-keys.ts';

const fk = { name: 'note_created_by_id_user_id_fkey', table: 'note', tableTo: 'user', onDelete: 'SET NULL', onUpdate: 'NO ACTION' };
const owner = (table: string) => (table === 'user' ? 'dafne_auth' : undefined);

describe('qualifyForeignKeys', () => {
  it('qualifies the table of another database and writes back ON DELETE', () => {
    const sql =
      'CREATE TABLE `note` (\n\t`created_by_id` varchar(36),\n\tCONSTRAINT `note_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`)\n);';
    expect(qualifyForeignKeys(sql, [fk], owner)).toContain(
      'FOREIGN KEY (`created_by_id`) REFERENCES `dafne_auth`.`user`(`id`) ON DELETE SET NULL\n',
    );
  });

  it('handles ALTER TABLE ADD CONSTRAINT and keeps it idempotent', () => {
    const sql =
      'ALTER TABLE `note` ADD CONSTRAINT `note_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL;';
    const once = qualifyForeignKeys(sql, [fk], owner);
    expect(once).toBe(
      'ALTER TABLE `note` ADD CONSTRAINT `note_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dafne_auth`.`user`(`id`) ON DELETE SET NULL;',
    );
    expect(qualifyForeignKeys(once, [fk], owner)).toBe(once);
  });

  it('writes back the actions of its own tables, unqualified', () => {
    const sql = 'CONSTRAINT `a_fk` FOREIGN KEY (`b_id`) REFERENCES `b`(`id`)\n);';
    expect(qualifyForeignKeys(sql, [{ ...fk, name: 'a_fk', tableTo: 'b', onDelete: 'CASCADE' }], owner)).toBe(
      'CONSTRAINT `a_fk` FOREIGN KEY (`b_id`) REFERENCES `b`(`id`) ON DELETE CASCADE\n);',
    );
  });
});
