import { schema } from '@dafne/backend-database';
import { StateTransition, type Transaction, type TransitionContext } from '@dafne/backend-fsm';
import { type ActivityStatus, msg } from '@dafne/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

const { activity } = schema;

/**
 * Reads and writes the status of activities that aren't deleted. Closing
 * records who completed the activity and when; reopening clears both.
 */
@Injectable()
export class ActivityTransition extends StateTransition<ActivityStatus, number> {
  async currentStatus(id: number, tx: Transaction): Promise<ActivityStatus> {
    // FOR UPDATE: a second change of the same activity waits for this one.
    const [found] = await tx
      .select({ status: activity.status })
      .from(activity)
      .where(and(eq(activity.id, id), isNull(activity.deletedAt)))
      .for('update');
    if (!found) {
      throw new NotFoundException(msg('activities.notFound'));
    }
    return found.status;
  }

  async execute({ id, to, tx, user }: TransitionContext<ActivityStatus, number>): Promise<void> {
    const now = new Date();
    const completed =
      to === 'closed'
        ? { completedAt: now, completedById: user?.id ?? null }
        : { completedAt: null, completedById: null };
    await tx
      .update(activity)
      .set({ status: to, ...completed, updatedAt: now, ...(user && { updatedById: user.id }) })
      .where(eq(activity.id, id));
  }
}
