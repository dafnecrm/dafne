import { fixMigration } from '../src/migrations/fix.js';

const fk = (name: string, onDelete: string, onUpdate = 'NO ACTION') => ({
  table: 'activity',
  name,
  columns: ['x'],
  tableTo: 'user',
  columnsTo: ['id'],
  onDelete,
  onUpdate,
  entityType: 'fks',
});

const sql = [
  'CREATE TABLE `activity` (',
  '\t`id` varchar(36) PRIMARY KEY,',
  '\t`created_by_id` varchar(36),',
  '\t`customer_id` varchar(36),',
  '\t`owner_id` varchar(36),',
  '\tCONSTRAINT `activity_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`),',
  '\tCONSTRAINT `activity_owner_id_user_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`),',
  '\tCONSTRAINT `activity_customer_id_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`)',
  ');',
  '--> statement-breakpoint',
  'ALTER TABLE `tag` ADD CONSTRAINT `tag_user_id_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE;',
].join('\n');

const snapshot = JSON.stringify({
  ddl: [
    { name: 'activity', entityType: 'tables' },
    fk('activity_created_by_id_user_id_fkey', 'SET NULL'),
    fk('activity_owner_id_user_id_fkey', 'NO ACTION'),
    fk('activity_customer_id_customer_id_fkey', 'CASCADE', 'CASCADE'),
    fk('tag_user_id_user_id_fkey', 'CASCADE'),
  ],
});

describe('fixMigration', () => {
  it('puts back ON DELETE / ON UPDATE on foreign keys inside CREATE TABLE', () => {
    const { sql: fixed, fixed: list } = fixMigration(sql, snapshot);
    expect(fixed).toContain('REFERENCES `user`(`id`) ON DELETE SET NULL,\n');
    expect(fixed).toContain('REFERENCES `customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE\n);');
    expect(list).toEqual([
      'activity_created_by_id_user_id_fkey: ON DELETE SET NULL',
      'activity_customer_id_customer_id_fkey: ON DELETE CASCADE ON UPDATE CASCADE',
    ]);
  });

  it('leaves NO ACTION keys and ALTER TABLE statements alone', () => {
    const { sql: fixed } = fixMigration(sql, snapshot);
    expect(fixed).toContain('FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`),\n');
    expect(fixed.match(/ON DELETE CASCADE;/g)).toHaveLength(1);
  });

  it('is idempotent', () => {
    const once = fixMigration(sql, snapshot).sql;
    const twice = fixMigration(once, snapshot);
    expect(twice.sql).toBe(once);
    expect(twice.fixed).toEqual([]);
  });
});
