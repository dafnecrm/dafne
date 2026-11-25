import type { Database } from '@dafne/backend-database';
import { NotFoundException } from '@nestjs/common';
import { TaskRuns, toJson } from './task-runs.js';

/** A Postgres error as drizzle wraps it. */
function pgError(code: string, constraint = '') {
  return new Error('query failed', { cause: Object.assign(new Error('pg'), { code, constraint }) });
}

/** A database whose inserts answer, in turn, with `outcomes` (an id, or an error to throw). */
function database(outcomes: (number | Error)[]) {
  const values = vi.fn((row: Record<string, unknown>) => ({
    returning: () => {
      const outcome = outcomes.shift();
      return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve([{ id: outcome, row }]);
    },
  }));
  return { db: { insert: () => ({ values }) } as unknown as Database, values };
}

describe('TaskRuns.claim', () => {
  it('records a queued run', async () => {
    const { db, values } = database([7]);
    await expect(new TaskRuns(db).claim({ taskKey: 'a.b', trigger: 'manual', triggeredBy: 'u1' })).resolves.toEqual({
      runId: 7,
      skipped: false,
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ taskKey: 'a.b', status: 'queued', trigger: 'manual', triggeredBy: 'u1' }),
    );
  });

  it('records a skipped run when the task has an active one', async () => {
    const { db, values } = database([pgError('23505', 'task_run_active_idx'), 8]);
    await expect(new TaskRuns(db).claim({ taskKey: 'a.b', trigger: 'schedule' })).resolves.toEqual({
      runId: 8,
      skipped: true,
    });
    expect(values).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'skipped', finishedAt: expect.any(Date) }));
  });

  it('answers 404 for an unknown task, and rethrows other errors', async () => {
    await expect(new TaskRuns(database([pgError('23503')]).db).claim({ taskKey: 'x', trigger: 'api' })).rejects.toThrow(
      NotFoundException,
    );
    const other = pgError('23505', 'another_idx');
    await expect(new TaskRuns(database([other]).db).claim({ taskKey: 'x', trigger: 'api' })).rejects.toBe(other);
  });
});

describe('toJson', () => {
  it('keeps JSON, turns undefined and the unserializable into null', () => {
    expect(toJson({ a: 1, at: new Date('2026-01-01T00:00:00Z') })).toEqual({ a: 1, at: '2026-01-01T00:00:00.000Z' });
    expect(toJson(undefined)).toBeNull();
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(toJson(loop)).toBeNull();
  });
});
