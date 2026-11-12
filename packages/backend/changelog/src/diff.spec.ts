import { diff } from './diff.js';

describe('diff', () => {
  it('gives only the fields that changed', () => {
    expect(diff({ notes: 'a', customerId: 1 }, { notes: 'b', customerId: 1 })).toEqual({
      notes: { from: 'a', to: 'b' },
    });
  });

  it('gives nothing when no field changed', () => {
    expect(diff({ notes: 'a', items: [{ position: 1 }] }, { notes: 'a', items: [{ position: 1 }] })).toEqual({});
  });

  it('compares arrays and objects as a whole', () => {
    const before = { items: [{ position: 1, quantity: 2 }] };
    const after = { items: [{ position: 1, quantity: 3 }] };
    expect(diff(before, after)).toEqual({ items: { from: before.items, to: after.items } });
  });

  it('logs dates as ISO strings, and compares them by value', () => {
    const at = new Date('2026-11-12T10:00:00.000Z');
    expect(diff({ at }, { at: new Date(at) })).toEqual({});
    expect(diff({ at: null }, { at })).toEqual({ at: { from: null, to: '2026-11-12T10:00:00.000Z' } });
  });

  it('gives the first values on create, without the empty ones', () => {
    expect(diff(undefined, { notes: 'a', typeId: null, extra: undefined })).toEqual({
      notes: { from: null, to: 'a' },
    });
  });
});
