import type { Database } from '@dafne/backend-database';
import type { Queue } from 'bullmq';
import type { ActiveRun, TaskRuns } from './task-runs.js';
import type { TaskJobData } from './tasks.constants.js';
import type { TasksRegistry } from './tasks.registry.js';
import { TasksScheduler } from './tasks.scheduler.js';

const now = new Date('2026-11-25T12:00:00Z');
const old = new Date(now.getTime() - 5 * 60_000);

function scheduler({ settings = [] as object[], active = [] as ActiveRun[], jobs = {} as Record<string, string>, known = ['a.b'] } = {}) {
  const query = { from: () => query, where: () => Promise.resolve(settings) };
  const db = { select: () => query } as unknown as Database;
  const queue = {
    upsertJobScheduler: vi.fn(),
    removeJobScheduler: vi.fn(),
    getJobSchedulers: vi.fn().mockResolvedValue([{ key: 'task:a.b' }, { key: 'task:gone' }]),
    getJob: vi.fn((id: string) => Promise.resolve(jobs[id] ? { getState: () => Promise.resolve(jobs[id]) } : undefined)),
  };
  const registry = {
    has: (key: string) => known.includes(key),
    all: () => known.map((key) => ({ options: { key } })),
  };
  const runs = { active: vi.fn().mockResolvedValue(active), fail: vi.fn() };
  const s = new TasksScheduler(
    db,
    queue as unknown as Queue<TaskJobData>,
    registry as unknown as TasksRegistry,
    runs as unknown as TaskRuns,
  );
  return { s, queue, runs };
}

describe('TasksScheduler', () => {
  it('schedules an enabled task with a cron pattern', async () => {
    const { s, queue } = scheduler({ settings: [{ enabled: true, cron: '0 3 * * *', timezone: 'UTC' }] });
    await s.sync('a.b');
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'task:a.b',
      { pattern: '0 3 * * *', tz: 'UTC' },
      expect.objectContaining({ name: 'a.b', data: { taskKey: 'a.b' } }),
    );
  });

  it('unschedules a task turned off or without a pattern', async () => {
    for (const settings of [{ enabled: false, cron: '0 3 * * *' }, { enabled: true, cron: null }]) {
      const { s, queue } = scheduler({ settings: [{ timezone: 'UTC', ...settings }] });
      await s.sync('a.b');
      expect(queue.removeJobScheduler).toHaveBeenCalledWith('task:a.b');
      expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
    }
  });

  it('removes the schedules of tasks no longer in code', async () => {
    const { s, queue } = scheduler({ settings: [{ enabled: true, cron: '0 3 * * *', timezone: 'UTC' }] });
    await s.syncAll();
    expect(queue.removeJobScheduler).toHaveBeenCalledWith('task:gone');
    expect(queue.removeJobScheduler).not.toHaveBeenCalledWith('task:a.b');
  });

  it('fails old active runs whose job is gone or over, not the others', async () => {
    const { s, runs } = scheduler({
      active: [
        { id: 1, taskKey: 'a.b', jobId: 'run-1', queuedAt: old }, // job gone
        { id: 2, taskKey: 'a.b', jobId: 'run-2', queuedAt: old }, // job completed
        { id: 3, taskKey: 'a.b', jobId: 'run-3', queuedAt: old }, // job active
        { id: 4, taskKey: 'a.b', jobId: null, queuedAt: old }, // never queued
        { id: 5, taskKey: 'a.b', jobId: null, queuedAt: now }, // just triggered
      ],
      jobs: { 'run-2': 'completed', 'run-3': 'active' },
    });
    await expect(s.reconcile(now)).resolves.toBe(3);
    expect(runs.fail.mock.calls.map(([id]) => id)).toEqual([1, 2, 4]);
    expect(runs.fail).toHaveBeenCalledWith(1, { message: 'tasks.run.workerLost' });
  });
});
