import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module, type DynamicModule } from '@nestjs/common';
import { changelogCrudHook, type ChangelogOptions } from './changelog.hooks.js';
import { ChangelogService } from './changelog.service.js';

/**
 * The change log of CRUD resources, in the changelog schema. A resource's
 * module turns it on with
 * `ChangelogModule.forFeature<SalesOrderDetail>('sales-orders', { fields: [...] })`
 * (its creates, updates and deletes), and its state machine's status
 * changes with `changelogTransitionHook`. It reads the log with
 * `ChangelogService.list` (import `ChangelogModule`).
 */
@Module({
  imports: [DatabaseModule],
  providers: [ChangelogService],
  exports: [ChangelogService],
})
export class ChangelogModule {
  static forFeature<Detail>(resource: string, options: ChangelogOptions<Detail>): DynamicModule {
    const hook = changelogCrudHook(resource, options);
    return CrudHooksModule.forFeature(
      resource,
      { create: { post: [hook] }, update: { post: [hook] }, delete: { post: [hook] } },
      { imports: [ChangelogModule] },
    );
  }
}
