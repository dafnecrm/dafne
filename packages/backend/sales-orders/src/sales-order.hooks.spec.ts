import { Logger } from '@nestjs/common';
import type { TransitionContext } from '@dafne/backend-fsm';
import type { SalesOrderStatus } from '@dafne/contracts';
import { SalesOrderLogPostHook, SalesOrderLogPreHook } from './sales-order.hooks.js';

describe('sales order hooks', () => {
  const context = { id: 7, from: 'draft', to: 'open', user: { id: 'u1' } } as TransitionContext<SalesOrderStatus, number>;

  beforeEach(() => vi.restoreAllMocks());

  it('logs the transition before it runs', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    new SalesOrderLogPreHook().run(context);
    expect(log).toHaveBeenCalledWith('Sales order 7: draft → open starting (user u1) - pre hook');
  });

  it('logs the transition once done', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    new SalesOrderLogPostHook().run(context);
    expect(log).toHaveBeenCalledWith('Sales order 7: draft → open done - post hook');
  });
});
