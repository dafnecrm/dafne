import { createTreeWithEmptyWorkspace } from 'nx/src/generators/testing-utils/create-tree-with-empty-workspace.js';
import { Changes } from '../src/core/changes.ts';
import { resourceNames } from '../src/core/names.ts';
import { serviceFile } from '../src/pieces/backend.ts';

describe('serviceFile', () => {
  const names = resourceNames('sales-order-type');

  it('finds the service in its own lib', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('packages/backend/sales-order-types/src/sales-order-types.service.ts', '');
    expect(serviceFile(new Changes(tree), names)).toBe('packages/backend/sales-order-types/src/sales-order-types.service.ts');
  });

  it('finds the service in a folder of another lib', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('packages/backend/sales-orders/package.json', '{}');
    tree.write('packages/backend/sales-orders/src/sales-order-types/sales-order-types.service.ts', '');
    expect(serviceFile(new Changes(tree), names)).toBe(
      'packages/backend/sales-orders/src/sales-order-types/sales-order-types.service.ts',
    );
  });

  it('falls back to its own lib', () => {
    expect(serviceFile(new Changes(createTreeWithEmptyWorkspace()), names)).toBe(
      'packages/backend/sales-order-types/src/sales-order-types.service.ts',
    );
  });
});
