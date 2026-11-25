import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { isCron, isTimeZone } from './schedule.js';
import { Task } from './task.decorator.js';
import type { TaskHandler, TaskOptions } from './task.types.js';
import { DEFAULT_TIMEZONE } from './tasks.constants.js';

/** A task found in the app: its options and its handler. */
export interface RegisteredTask {
  options: TaskOptions;
  handler: TaskHandler;
}

/** `tasks.cleanup`, `quotations.expire-old`: dot-separated, lowercase words. */
const KEY = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;

/** Checks a task's options, throwing at startup on a mistake in code. */
export function checkTaskOptions(options: TaskOptions): void {
  const { key, cron, timezone = DEFAULT_TIMEZONE, timeoutSeconds } = options;
  if (!KEY.test(key)) {
    throw new Error(`Task key "${key}": use dot-separated, lowercase words (e.g. quotations.expire)`);
  }
  if (!isTimeZone(timezone)) {
    throw new Error(`Task ${key}: "${timezone}" isn't a time zone`);
  }
  if (cron !== undefined && !isCron(cron, timezone)) {
    throw new Error(`Task ${key}: "${cron}" isn't a cron pattern`);
  }
  if (timeoutSeconds !== undefined && !(Number.isInteger(timeoutSeconds) && timeoutSeconds > 0)) {
    throw new Error(`Task ${key}: the timeout must be a positive number of seconds`);
  }
}

/** The tasks of the app: its providers decorated with `@Task`. */
@Injectable()
export class TasksRegistry {
  private tasks?: Map<string, RegisteredTask>;

  constructor(private readonly discovery: DiscoveryService) {}

  /** Every task, by key. Found on first use: the worker may ask before the app's hooks run. */
  private found(): Map<string, RegisteredTask> {
    if (!this.tasks) {
      const tasks = new Map<string, RegisteredTask>();
      for (const wrapper of this.discovery.getProviders({ metadataKey: Task.KEY })) {
        const options = this.discovery.getMetadataByDecorator(Task, wrapper);
        if (!options || !wrapper.instance) {
          continue;
        }
        checkTaskOptions(options);
        if (tasks.has(options.key)) {
          throw new Error(`Two tasks have the key ${options.key}`);
        }
        tasks.set(options.key, { options, handler: wrapper.instance as TaskHandler });
      }
      this.tasks = tasks;
    }
    return this.tasks;
  }

  get(key: string): RegisteredTask | undefined {
    return this.found().get(key);
  }

  has(key: string): boolean {
    return this.found().has(key);
  }

  /** Every task, sorted by key. */
  all(): RegisteredTask[] {
    return [...this.found().values()].sort((a, b) => a.options.key.localeCompare(b.options.key));
  }
}
