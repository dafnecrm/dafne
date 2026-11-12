import type { Database } from '@dafne/backend-database';
import { ForbiddenException, Injectable, Logger, type Type } from '@nestjs/common';
import type { Actor } from './crud.js';
import type {
  CrudAfterCommitHook,
  CrudHook,
  CrudHookContext,
  CrudHooksConfig,
  CrudOperation,
  CrudOperationHooks,
  Transaction,
} from './crud-hooks.types.js';

/** What a write gets: the hook context, with the body (after the pre hooks) for create and update. */
export type WriteContext<Id, Body, Detail> = CrudHookContext<Id, Body, Detail> & { body: Body };

/** One `CrudHooksModule.forFeature`: its config and the instances of its classes. */
interface Registration {
  hooks: CrudHooksConfig;
  instances: Map<Type, unknown>;
}

/** What a service gives its runner. */
export interface CrudHooksOptions<Id, Detail> {
  /** The database the runner opens the write's transaction on. */
  db: Database;
  /** Reads a record in the transaction: `previous` and `result`. Throws 404 if it's missing. */
  load: (id: Id, tx: Transaction) => Promise<Detail>;
}

/**
 * The hooks of every resource, as `CrudHooksModule.forFeature` registers
 * them (from any lib: they add up, in import order). One instance in the
 * app (`CrudHooksModule`).
 */
@Injectable()
export class CrudHooksRegistry {
  private readonly registrations = new Map<string, Registration[]>();

  register(resource: string, hooks: CrudHooksConfig, instances: Map<Type, unknown>): void {
    const registrations = this.registrations.get(resource) ?? [];
    registrations.push({ hooks, instances });
    this.registrations.set(resource, registrations);
  }

  /** The hooks of a resource's operation in one phase, in registration order. */
  hooks<T>(resource: string, operation: CrudOperation, phase: keyof CrudOperationHooks): T[] {
    return (this.registrations.get(resource) ?? []).flatMap(({ hooks, instances }) =>
      (hooks[operation]?.[phase] ?? []).map((type: Type) => instances.get(type) as T),
    );
  }

  /** The runner a resource's service writes through. */
  for<Id, Body, Detail>(resource: string, options: CrudHooksOptions<Id, Detail>): CrudHooks<Id, Body, Detail> {
    return new CrudHooks<Id, Body, Detail>(resource, this, options);
  }
}

/**
 * Runs a resource's writes with their hooks: in one transaction, `previous`
 * (when the operation has hooks), the pre hooks, the write, `result`, the
 * post hooks; after the commit, the after-commit hooks. A service gets it
 * with `registry.for('<resource>', { db, load })`.
 */
export class CrudHooks<Id, Body, Detail> {
  private readonly logger: Logger;

  constructor(
    readonly resource: string,
    private readonly registry: CrudHooksRegistry,
    private readonly options: CrudHooksOptions<Id, Detail>,
  ) {
    this.logger = new Logger(`CrudHooks(${resource})`);
  }

  /** Runs `write` (which inserts and returns the new id); returns the created record. */
  async create(
    input: { body: Body; actor: Actor },
    write: (context: WriteContext<Id, Body, Detail>) => Promise<Id>,
  ): Promise<Detail> {
    const { result } = await this.run('create', input, write);
    return result as Detail;
  }

  /** Runs `write` (which updates, or throws 404); returns the updated record. */
  async update(
    input: { id: Id; body: Body; actor: Actor },
    write: (context: WriteContext<Id, Body, Detail>) => Promise<void>,
  ): Promise<Detail> {
    const { result } = await this.run('update', input, write);
    return result as Detail;
  }

  /** Runs `write` (which deletes, or throws 404). */
  async delete(
    input: { id: Id; actor: Actor },
    write: (context: CrudHookContext<Id, Body, Detail>) => Promise<void>,
  ): Promise<void> {
    await this.run('delete', input, write);
  }

  private async run(
    operation: CrudOperation,
    input: { id?: Id; body?: Body; actor: Actor },
    write: (context: WriteContext<Id, Body, Detail>) => Promise<Id | void>,
  ): Promise<CrudHookContext<Id, Body, Detail>> {
    const { registry, resource } = this;
    const { db, load } = this.options;
    const pre = registry.hooks<CrudHook>(resource, operation, 'pre');
    const post = registry.hooks<CrudHook>(resource, operation, 'post');
    const afterCommit = registry.hooks<CrudAfterCommitHook>(resource, operation, 'afterCommit');
    const hooked = pre.length + post.length + afterCommit.length > 0;

    const context = await db.transaction(async (tx) => {
      const context: CrudHookContext<Id, Body, Detail> = { resource, operation, ...input, tx };
      if (hooked && operation !== 'create') {
        context.previous = await load(context.id as Id, tx);
      }
      for (const hook of pre) {
        await runHook(hook, context);
      }
      const id = await write(context as WriteContext<Id, Body, Detail>);
      if (operation === 'create') {
        context.id = id as Id;
      }
      if (operation !== 'delete') {
        context.result = await load(context.id as Id, tx);
      }
      for (const hook of post) {
        await runHook(hook, context);
      }
      return context;
    });

    if (afterCommit.length) {
      // Not awaited: the response doesn't wait for emails and the like.
      void this.runAfterCommit(afterCommit, context);
    }
    return context;
  }

  private async runAfterCommit(hooks: CrudAfterCommitHook[], context: CrudHookContext<Id, Body, Detail>) {
    const { tx: _tx, ...committed } = context;
    for (const hook of hooks) {
      try {
        await hook.run(committed);
      } catch (error) {
        this.logger.error(`${context.operation} ${String(context.id)}: ${hook.constructor.name} failed`, error);
      }
    }
  }
}

/** Runs a hook: a message it returns fails the write with it (403). */
async function runHook(hook: CrudHook, context: CrudHookContext<unknown, unknown, unknown>) {
  const message = await hook.run(context);
  if (typeof message === 'string' && message) {
    throw new ForbiddenException(message);
  }
}
