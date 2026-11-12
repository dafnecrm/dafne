import type { Actor, CrudHookContext, Transaction } from '@dafne/backend-crud';
import type { TransitionContext } from '@dafne/backend-fsm';
import { changelogCrudHook, changelogTransitionHook } from './changelog.hooks.js';
import type { ChangelogService } from './changelog.service.js';

interface Detail {
  id: number;
  notes: string | null;
  updatedAt: Date;
  items: { position: number; product: { id: number; name: string } }[];
}

const tx = {} as Transaction;
const actor = { id: 'u1' } as Actor;
const changelog = { record: vi.fn() };

const CrudHook = changelogCrudHook<Detail>('things', {
  fields: ['notes', 'items'],
  map: { items: (items) => items.map(({ position, product }) => ({ position, productId: product.id })) },
});
const hook = new CrudHook(changelog as unknown as ChangelogService);

const record = (notes: string | null, productName = 'P'): Detail => ({
  id: 7,
  notes,
  updatedAt: new Date(),
  items: [{ position: 1, product: { id: 3, name: productName } }],
});

const context = (overrides: Partial<CrudHookContext<unknown, unknown, Detail>>) =>
  ({ resource: 'things', actor, tx, id: 7, ...overrides }) as CrudHookContext<unknown, unknown, Detail>;

beforeEach(() => changelog.record.mockReset());

describe('changelogCrudHook', () => {
  it('logs a create with the first values of the fields, mapped', async () => {
    await hook.run(context({ operation: 'create', result: record('a') }));
    expect(changelog.record).toHaveBeenCalledWith(tx, {
      resource: 'things',
      recordId: 7,
      operation: 'create',
      changes: {
        notes: { from: null, to: 'a' },
        items: { from: null, to: [{ position: 1, productId: 3 }] },
      },
      actorId: 'u1',
    });
  });

  it('logs an update with the fields that changed only', async () => {
    await hook.run(context({ operation: 'update', previous: record('a'), result: record('b', 'renamed') }));
    expect(changelog.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ operation: 'update', changes: { notes: { from: 'a', to: 'b' } } }),
    );
  });

  it('logs nothing for an update that changed no logged field', async () => {
    await hook.run(context({ operation: 'update', previous: record('a'), result: record('a') }));
    expect(changelog.record).not.toHaveBeenCalled();
  });

  it('logs a delete with no fields', async () => {
    await hook.run(context({ operation: 'delete', previous: record('a') }));
    expect(changelog.record).toHaveBeenCalledWith(tx, expect.objectContaining({ operation: 'delete', changes: {} }));
  });

  it('is a class of its own per resource', () => {
    expect(changelogCrudHook('others', { fields: [] })).not.toBe(CrudHook);
    expect(CrudHook.name).toBe('ChangelogCrudHook(things)');
  });
});

describe('changelogTransitionHook', () => {
  it('logs the status change, with who made it', async () => {
    const TransitionHook = changelogTransitionHook('things');
    await new TransitionHook(changelog as unknown as ChangelogService).run({
      id: 7,
      from: 'draft',
      to: 'open',
      tx,
      user: actor,
    } as TransitionContext);
    expect(changelog.record).toHaveBeenCalledWith(tx, {
      resource: 'things',
      recordId: 7,
      operation: 'transition',
      changes: { status: { from: 'draft', to: 'open' } },
      actorId: 'u1',
    });
  });
});
