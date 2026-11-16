import { CrudHooksModule } from '@dafne/backend-crud';
import { Module, type DynamicModule } from '@nestjs/common';
import { changelogCrudHook, type ChangelogOptions } from './changelog.hooks.js';
import { ChangelogService } from './changelog.service.js';

/**
 * The change log of CRUD resources, in the changelog schema. A resource's
 * module turns it on with
 * `ChangelogModule.forFeature<SalesOrderDetail>('sales-orders', { fields: [...] })`
 * (its creates, updates and deletes), and its state machine's status
 * changes with `changelogTransitionHook`. It reads the log with
 * `ChangelogService.list` (import `ChangelogModule`). Writes that skip
 * CrudHooks (the users, written by Better Auth) use
 * `ChangelogService.recordSnapshot`.
 */
@Module({
  // The app's database (its DatabaseModule, or the auth app's
  // AuthDatabaseModule), global: the log works in both.
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
