import type { Database } from '@dafne/backend-database';
import { ForbiddenException, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Actor } from './crud.js';
import { CrudHooksRegistry } from './crud-hooks.js';
import { CrudHooksModule } from './crud-hooks.module.js';
import type {
  CrudAfterCommitHook,
  CrudCommittedContext,
  CrudHook,
  CrudHookContext,
  CrudHooksConfig,
  Transaction,
} from './crud-hooks.types.js';

interface Body {
  name: string;
}
interface Detail {
  id: number;
  name: string;
}
type Context = CrudHookContext<number, Body, Detail>;

const actor = { id: 'u1' } as Actor;
const tx = { tx: true } as unknown as Transaction;

/** What ran, in order. */
let calls: string[];

@Injectable()
class Upper implements CrudHook<number, Body, Detail> {
  run(context: Context) {
    calls.push(`pre ${context.body?.name}`);
    context.body = { name: context.body!.name.toUpperCase() };
  }
}

@Injectable()
class Audit implements CrudHook<number, Body, Detail> {
  seen: Context[] = [];
  run(context: Context) {
    calls.push('post');
    this.seen.push(context);
  }
}

@Injectable()
class Refuse implements CrudHook {
  run() {
    return 'things.locked';
  }
}

@Injectable()
class Mail implements CrudAfterCommitHook<number, Body, Detail> {
  seen: CrudCommittedContext<number, Body, Detail>[] = [];
  run(context: CrudCommittedContext<number, Body, Detail>) {
    calls.push('afterCommit');
    this.seen.push(context);
  }
}

@Injectable()
class Broken implements CrudAfterCommitHook {
  run(): void {
    throw new Error('smtp down');
  }
}

describe('CrudHooks', () => {
  const db = { transaction: vi.fn() };
  const load = vi.fn();

  /** A runner over `hooks`, registered as `forFeature` does. */
  function runner(hooks: CrudHooksConfig, instances: object[] = []) {
    const registry = new CrudHooksRegistry();
    registry.register('things', hooks, new Map(instances.map((instance) => [instance.constructor as never, instance])));
    return registry.for<number, Body, Detail>('things', { db: db as unknown as Database, load });
  }

  beforeEach(() => {
    calls = [];
    vi.resetAllMocks();
    db.transaction.mockImplementation((callback: (tx: Transaction) => unknown) => callback(tx));
    load.mockImplementation(async (id: number) => {
      calls.push(`load ${id}`);
      return { id, name: 'saved' };
    });
  });

  it('without hooks, writes and reads the result in one transaction', async () => {
    const write = vi.fn(async (context: Context) => {
      calls.push(`write ${context.body?.name}`);
      return 7;
    });

    await expect(runner({}).create({ body: { name: 'a' }, actor }, write)).resolves.toEqual({ id: 7, name: 'saved' });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(write.mock.calls[0][0]).toMatchObject({ resource: 'things', operation: 'create', actor, tx });
    expect(load).toHaveBeenCalledWith(7, tx);
    expect(calls).toEqual(['write a', 'load 7']);
  });

  it('doesn\'t read `previous` when the operation has no hooks', async () => {
    await runner({ create: { pre: [Upper] } }, [new Upper()]).update({ id: 1, body: { name: 'a' }, actor }, async () => {});

    expect(calls).toEqual(['load 1']);
  });

  it('runs pre hooks, the write with their body, the result, post hooks, then after-commit hooks', async () => {
    const audit = new Audit();
    const mail = new Mail();
    const hooks = runner({ update: { pre: [Upper], post: [Audit], afterCommit: [Mail] } }, [new Upper(), audit, mail]);

    await hooks.update({ id: 3, body: { name: 'a' }, actor }, async ({ body }) => {
      calls.push(`write ${body?.name}`);
    });
    await vi.waitFor(() => expect(mail.seen).toHaveLength(1));

    expect(calls).toEqual(['load 3', 'pre a', 'write A', 'load 3', 'post', 'afterCommit']);
    expect(audit.seen[0]).toMatchObject({ id: 3, previous: { id: 3 }, result: { id: 3 }, tx });
    expect(mail.seen[0]).not.toHaveProperty('tx');
    expect(mail.seen[0]).toMatchObject({ operation: 'update', id: 3, result: { id: 3, name: 'saved' } });
  });

  it('gives post hooks the new id on create', async () => {
    const audit = new Audit();
    await runner({ create: { post: [Audit] } }, [audit]).create({ body: { name: 'a' }, actor }, async () => 9);

    expect(audit.seen[0]).toMatchObject({ id: 9, result: { id: 9 } });
    expect(audit.seen[0].previous).toBeUndefined();
  });

  it('stops the write with a 403 when a hook returns a message, inside the transaction', async () => {
    const write = vi.fn();

    await expect(runner({ delete: { pre: [Refuse] } }, [new Refuse()]).delete({ id: 1, actor }, write)).rejects.toEqual(
      new ForbiddenException('things.locked'),
    );
    expect(write).not.toHaveBeenCalled();
    // The error came out of the transaction's callback: drizzle rolls back.
    await expect(db.transaction.mock.results[0].value).rejects.toThrow('things.locked');
  });

  it('logs a failed after-commit hook without failing the write', async () => {
    const mail = new Mail();
    const hooks = runner({ delete: { afterCommit: [Broken, Mail] } }, [new Broken(), mail]);

    await expect(hooks.delete({ id: 1, actor }, async () => {})).resolves.toBeUndefined();
    // The next hook still runs.
    await vi.waitFor(() => expect(mail.seen).toHaveLength(1));
  });
});

@Injectable()
class Rules {
  locked = true;
}

@Injectable()
class RulesHook implements CrudHook {
  constructor(private readonly rules: Rules) {}
  run() {
    return this.rules.locked ? 'things.locked' : undefined;
  }
}

@Module({ imports: [CrudHooksModule.forFeature('things', { delete: { pre: [RulesHook] } }, { providers: [Rules] })] })
class OtherLibModule {}

@Module({ imports: [CrudHooksModule.forFeature('things', { delete: { post: [Audit] } })] })
class AuditModule {}

@Module({ imports: [CrudHooksModule] })
class ThingsModule {}

describe('CrudHooksModule', () => {
  it('adds up the hooks every module registers, built with their dependencies, in one registry', async () => {
    const module = await Test.createTestingModule({ imports: [ThingsModule, OtherLibModule, AuditModule] }).compile();

    const registry = module.get(CrudHooksRegistry);
    expect(module.get(CrudHooksRegistry, { strict: false })).toBe(registry);
    const [pre] = registry.hooks<RulesHook>('things', 'delete', 'pre');
    expect(pre).toBeInstanceOf(RulesHook);
    expect(pre.run()).toBe('things.locked');
    expect(registry.hooks('things', 'delete', 'post')[0]).toBeInstanceOf(Audit);
    expect(registry.hooks('things', 'create', 'pre')).toEqual([]);
    expect(registry.hooks('others', 'delete', 'pre')).toEqual([]);
  });
});
