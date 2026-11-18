import { abilityFor } from './index.ts';

describe('abilityFor', () => {
  it('lets admins do everything', () => {
    const ability = abilityFor({ admin: true, permissions: [] });
    expect(ability.can('delete', 'Customer')).toBe(true);
    expect(ability.can('changeStatus', 'SalesOrder')).toBe(true);
  });

  it('lets others do only what their permissions say', () => {
    const ability = abilityFor({ admin: false, permissions: ['Customer.create', 'SalesOrder.changeStatus'] });
    expect(ability.can('create', 'Customer')).toBe(true);
    expect(ability.can('delete', 'Customer')).toBe(false);
    expect(ability.can('changeStatus', 'SalesOrder')).toBe(true);
    expect(ability.can('create', 'SalesOrder')).toBe(false);
  });
});
