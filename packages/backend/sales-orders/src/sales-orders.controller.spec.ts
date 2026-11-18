import { ForbiddenException } from '@nestjs/common';
import type { UserSession } from '@dafne/backend-session';
import type { SalesOrderBody } from '@dafne/contracts';
import { abilityFor } from '@dafne/permissions';
import { SalesOrdersController } from './sales-orders.controller.js';

const session = { user: { id: 'u1' } } as UserSession;
const body = (status?: SalesOrderBody['status']) =>
  ({ customerId: 1, typeId: 'STD', notes: null, items: [], status }) as SalesOrderBody;

function setup(permissions: string[]) {
  const service = {
    create: vi.fn(async () => ({ id: 1 })),
    update: vi.fn(async () => ({ id: 1 })),
    get: vi.fn(async () => ({ id: 1, status: 'draft' })),
  };
  const ability = abilityFor({ admin: false, permissions: permissions as never });
  const controller = new SalesOrdersController(service as never, {} as never, {
    abilityFor: async () => ability,
  } as never);
  return { controller, service };
}

describe('SalesOrdersController status permission', () => {
  it('lets update keep the status without changeStatus', async () => {
    const { controller, service } = setup(['SalesOrder.update']);
    await controller.update(1, body('draft'), session);
    expect(service.update).toHaveBeenCalled();
  });

  it('needs changeStatus to change it through update or create', async () => {
    const { controller, service } = setup(['SalesOrder.update', 'SalesOrder.create']);
    await expect(controller.update(1, body('open'), session)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.create(body('open'), session)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('allows it with changeStatus', async () => {
    const { controller, service } = setup(['SalesOrder.update', 'SalesOrder.changeStatus']);
    await controller.update(1, body('open'), session);
    expect(service.update).toHaveBeenCalled();
  });
});
