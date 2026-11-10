import type { TransitionContext, TransitionHook, TransitionHookResult } from '@dafne/backend-fsm';
import { msg, type SalesOrderStatus } from '@dafne/contracts';
import { Injectable, Logger } from '@nestjs/common';

type Context = TransitionContext<SalesOrderStatus, number>;

/** Example pre hook: logs the transition before it runs. */
@Injectable()
export class SalesOrderLogPreHook implements TransitionHook<SalesOrderStatus, number> {
  private readonly logger = new Logger(SalesOrderLogPreHook.name);

  run({ id, from, to, user }: Context): TransitionHookResult {
    this.logger.log(`Sales order ${id}: ${from} → ${to} starting (user ${user?.id ?? '-'}) - pre hook`);
  }
}

/** Example post hook: logs the transition once it's done (still in its transaction). */
@Injectable()
export class SalesOrderLogPostHook implements TransitionHook<SalesOrderStatus, number> {
  private readonly logger = new Logger(SalesOrderLogPostHook.name);

  run({ id, from, to }: Context): void {
    this.logger.log(`Sales order ${id}: ${from} → ${to} done - post hook`);
  }
}
