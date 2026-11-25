import { Injectable } from '@nestjs/common';
import { Task } from '../task.decorator.js';
import type { TaskContext, TaskHandler } from '../task.types.js';
import { InjectDrizzle } from '@nestjs/drizzle';
import { schema, type Database } from '@dafne/backend-database';
import { and, gte, inArray, isNull } from 'drizzle-orm';

/** Finished runs are kept this many days, unless TASKS_RETENTION_DAYS says. */
export const DEFAULT_RETENTION_DAYS = 30;

/** The tasks' own housekeeping: fails lost runs, deletes old ones. */
@Task({ key: 'quotations.expiry', cron: '2 18 * * *', timeoutSeconds: 600 })
@Injectable()
export class QuotationsExpiryTask implements TaskHandler<unknown, { expired: number }> {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async run(ctx: TaskContext) {
    const { quotation } = schema;
    const results = await this.db
      .update(quotation)
      .set({ status: 'expired' })
      .where(and(
        inArray(quotation.status, ['draft', 'sent']),
        gte(quotation.validUntil, new Date()),
        isNull(quotation.deletedAt),
      ));

    return { expired: results.rowCount ?? 0 };
  }
}
