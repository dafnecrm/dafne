import type { CrudHook, CrudHookContext } from '@dafne/backend-crud';
import type { TransitionContext, TransitionHook } from '@dafne/backend-fsm';
import { Inject, Injectable, type Type } from '@nestjs/common';
import { ChangelogService } from './changelog.service.js';
import { diff } from './diff.js';

/** What a resource logs of its records. */
export interface ChangelogOptions<Detail> {
  /** The fields of the record (its Detail) whose changes are logged. */
  fields: readonly (keyof Detail & string)[];
  /**
   * How a field is logged, when not as it is: e.g. the items of a sales
   * order without their product's name.
   */
  map?: { [K in keyof Detail]?: (value: Detail[K]) => unknown };
}

/** The logged fields of a record. */
function snapshot<Detail>(record: Detail, { fields, map = {} }: ChangelogOptions<Detail>): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((field) => {
      const value = record[field];
      const mapper = map[field];
      return [field, mapper ? mapper(value) : value];
    }),
  );
}

/** Names a class built by a factory (for logs and Nest's errors). */
function named<T extends Type>(type: T, name: string): T {
  Object.defineProperty(type, 'name', { value: name });
  return type;
}

/**
 * The CrudHook that logs the writes of `resource` (a post hook, in the
 * write's transaction): a create with the fields' first values, an update
 * with the fields that changed (nothing if none did), a delete with none.
 * A new class per call: CrudHooksModule tells hooks apart by class.
 */
export function changelogCrudHook<Detail>(resource: string, options: ChangelogOptions<Detail>): Type<CrudHook> {
  @Injectable()
  class ChangelogCrudHook implements CrudHook<unknown, unknown, Detail> {
    constructor(@Inject(ChangelogService) private readonly changelog: ChangelogService) {}

    async run({ operation, id, previous, result, actor, tx }: CrudHookContext<unknown, unknown, Detail>) {
      const changes =
        operation === 'delete'
          ? {}
          : diff(previous && snapshot(previous, options), snapshot(result as Detail, options));
      if (operation === 'update' && !Object.keys(changes).length) {
        return;
      }
      await this.changelog.record(tx, { resource, recordId: id, operation, changes, actorId: actor.id });
    }
  }
  return named(ChangelogCrudHook as Type<CrudHook>, `ChangelogCrudHook(${resource})`);
}

/**
 * The TransitionHook that logs the status changes of `resource`'s state
 * machine, as `{ [field]: { from, to } }` (field: `status`). Give it to
 * the machine as a hook of every transition:
 * `FsmModule.forFeature({ …, imports: [ChangelogModule], post: [hook] })`.
 */
export function changelogTransitionHook(resource: string, field = 'status'): Type<TransitionHook> {
  @Injectable()
  class ChangelogTransitionHook implements TransitionHook {
    constructor(@Inject(ChangelogService) private readonly changelog: ChangelogService) {}

    async run({ id, from, to, user, tx }: TransitionContext) {
      await this.changelog.record(tx, {
        resource,
        recordId: id,
        operation: 'transition',
        changes: { [field]: { from, to } },
        actorId: user?.id,
      });
    }
  }
  return named(ChangelogTransitionHook as Type<TransitionHook>, `ChangelogTransitionHook(${resource})`);
}
