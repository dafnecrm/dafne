import type { Database } from '@dafne/backend-database';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { TaskRuns } from './task-runs.js';
import { TasksClient } from './tasks.client.js';
import type { TaskJobData } from './tasks.constants.js';

function client({ settings = [{ enabled: true }], skipped = false, add = vi.fn().mockResolvedValue({}) } = {}) {
  const query = { from: () => query, where: () => Promise.resolve(settings) };
  const db = { select: () => query } as unknown as Database;
  const queue = { on: vi.fn(), add } as unknown as Queue<TaskJobData>;
  const runs = {
    claim: vi.fn().mockResolvedValue({ runId: 5, skipped }),
    setJob: vi.fn(),
    fail: vi.fn(),
  };
  return { tasks: new TasksClient(db, queue, runs as unknown as TaskRuns), runs, add };
}

describe('TasksClient.trigger', () => {
  it('records the run and queues it', async () => {
    const { tasks, runs, add } = client();
    await expect(tasks.trigger('a.b', { actor: { id: 'u1' }, source: 'sales', payload: { x: 1 } })).resolves.toEqual({
      runId: 5,
      skipped: false,
    });
    expect(runs.claim).toHaveBeenCalledWith({ taskKey: 'a.b', trigger: 'api', triggeredBy: 'u1', source: 'sales', payload: { x: 1 } });
    expect(runs.setJob).toHaveBeenCalledWith(5, 'run-5');
    expect(add).toHaveBeenCalledWith('a.b', { taskKey: 'a.b', runId: 5 }, expect.objectContaining({ jobId: 'run-5' }));
  });

  it('queues nothing for a skipped run', async () => {
    const { tasks, add } = client({ skipped: true });
    await expect(tasks.trigger('a.b')).resolves.toEqual({ runId: 5, skipped: true });
    expect(add).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown task', async () => {
    await expect(client({ settings: [] }).tasks.trigger('x')).rejects.toThrow(NotFoundException);
  });

  it('refuses API triggers of a task turned off, not an admin', async () => {
    const off = { settings: [{ enabled: false }] };
    await expect(client(off).tasks.trigger('a.b')).rejects.toThrow(ConflictException);
    await expect(client(off).tasks.trigger('a.b', { trigger: 'manual' })).resolves.toEqual({ runId: 5, skipped: false });
  });

  it('fails the run when it cannot be queued', async () => {
    const { tasks, runs } = client({ add: vi.fn().mockRejectedValue(new Error('Redis down')) });
    await expect(tasks.trigger('a.b')).rejects.toThrow('Redis down');
    expect(runs.fail).toHaveBeenCalledWith(5, expect.objectContaining({ message: 'Error: Redis down' }));
  });
});
