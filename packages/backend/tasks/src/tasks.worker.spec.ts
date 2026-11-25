import type { Database } from '@dafne/backend-database';
import type { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { StartedRun, TaskRuns } from './task-runs.js';
import type { TaskContext, TaskHandler } from './task.types.js';
import type { TaskJobData } from './tasks.constants.js';
import type { TasksRegistry } from './tasks.registry.js';
import { TasksWorker } from './tasks.worker.js';

const started: StartedRun = {
  taskKey: 'a.b',
  trigger: 'manual',
  triggeredBy: 'u1',
  source: null,
  payload: { x: 1 },
  timeoutSeconds: null,
};

function worker(handler?: TaskHandler, { run = started as StartedRun | null, settings = [{ enabled: true }], skipped = false } = {}) {
  const query = { from: () => query, where: () => Promise.resolve(settings) };
  const db = { select: () => query } as unknown as Database;
  const runs = {
    claim: vi.fn().mockResolvedValue({ runId: 9, skipped }),
    start: vi.fn().mockResolvedValue(run ?? undefined),
    succeed: vi.fn(),
    fail: vi.fn(),
    log: vi.fn(),
  };
  const registry = { get: () => (handler ? { options: { key: 'a.b' }, handler } : undefined) };
  const w = new TasksWorker(db, runs as unknown as TaskRuns, registry as unknown as TasksRegistry, {} as ConfigService);
  return { w, runs };
}

const job = (data: TaskJobData) => ({ id: 'j1', data }) as Job<TaskJobData>;

describe('TasksWorker', () => {
  it('runs the handler and saves its result and log', async () => {
    let seen: TaskContext | undefined;
    const { w, runs } = worker({
      run: async (ctx) => {
        seen = ctx;
        await ctx.log.info('working', { step: 1 });
        return { done: 3 };
      },
    });
    await w.process(job({ taskKey: 'a.b', runId: 4 }));
    expect(seen).toMatchObject({ key: 'a.b', runId: 4, trigger: 'manual', triggeredBy: 'u1', payload: { x: 1 } });
    expect(runs.log).toHaveBeenCalledWith(4, 'info', 'working', { step: 1 });
    expect(runs.succeed).toHaveBeenCalledWith(4, { done: 3 });
  });

  it('fails the run with what the handler threw', async () => {
    const { w, runs } = worker({ run: () => Promise.reject(new Error('boom')) });
    await w.process(job({ taskKey: 'a.b', runId: 4 }));
    expect(runs.fail).toHaveBeenCalledWith(4, { message: 'boom', stack: expect.stringContaining('boom') });
    expect(runs.succeed).not.toHaveBeenCalled();
  });

  it('fails the run on timeout, aborting its signal', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const { w, runs } = worker(
      {
        run: (ctx) => {
          signal = ctx.signal;
          return new Promise(() => undefined);
        },
      },
      { run: { ...started, timeoutSeconds: 2 } },
    );
    const done = w.process(job({ taskKey: 'a.b', runId: 4 }));
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    vi.useRealTimers();
    expect(signal?.aborted).toBe(true);
    expect(runs.fail).toHaveBeenCalledWith(4, { message: 'tasks.run.timedOut' });
  });

  it('fails a run of a task the app no longer has', async () => {
    const { w, runs } = worker(undefined);
    await w.process(job({ taskKey: 'gone', runId: 4 }));
    expect(runs.fail).toHaveBeenCalledWith(4, { message: 'tasks.run.unknownTask' });
    expect(runs.start).not.toHaveBeenCalled();
  });

  it('records a schedule tick as a run with its job', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const { w, runs } = worker({ run });
    await w.process(job({ taskKey: 'a.b' }));
    expect(runs.claim).toHaveBeenCalledWith({ taskKey: 'a.b', trigger: 'schedule', jobId: 'j1' });
    expect(runs.start).toHaveBeenCalledWith(9);
    expect(run).toHaveBeenCalled();
  });

  it('skips a tick while a run is active, or when the task is off', async () => {
    const run = vi.fn();
    const busy = worker({ run }, { skipped: true });
    await busy.w.process(job({ taskKey: 'a.b' }));
    expect(busy.runs.start).not.toHaveBeenCalled();

    const off = worker({ run }, { settings: [{ enabled: false }] });
    await off.w.process(job({ taskKey: 'a.b' }));
    expect(off.runs.claim).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('does nothing for a run that is over already', async () => {
    const run = vi.fn();
    const { w, runs } = worker({ run }, { run: null });
    await w.process(job({ taskKey: 'a.b', runId: 4 }));
    expect(run).not.toHaveBeenCalled();
    expect(runs.succeed).not.toHaveBeenCalled();
  });
});
