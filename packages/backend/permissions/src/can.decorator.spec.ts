import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { abilityFor } from '@dafne/permissions';
import type { MyPermissions } from '@dafne/contracts';
import { AbilityGuard, CAN } from './can.decorator.js';

function setup(required: unknown, mine: MyPermissions) {
  const reflector = { getAllAndOverride: (key: string) => (key === CAN ? required : undefined) } as unknown as Reflector;
  const permissions = { abilityFor: vi.fn(async () => abilityFor(mine)) };
  const guard = new AbilityGuard(reflector, permissions as never);
  const context = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1' } }) }),
  } as unknown as ExecutionContext;
  return { guard, context, permissions };
}

describe('AbilityGuard', () => {
  const create = { action: 'create', subject: 'Customer' };

  it('lets routes without @Can through', async () => {
    const { guard, context, permissions } = setup(undefined, { admin: false, permissions: [] });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(permissions.abilityFor).not.toHaveBeenCalled();
  });

  it('lets through who has the permission, and admins', async () => {
    for (const mine of [{ admin: false, permissions: ['Customer.create'] }, { admin: true, permissions: [] }] as MyPermissions[]) {
      const { guard, context } = setup(create, mine);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('refuses the others with 403', async () => {
    const { guard, context } = setup(create, { admin: false, permissions: ['Customer.update'] });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
