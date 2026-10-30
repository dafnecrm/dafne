import { taskBodySchema, listTasksQuerySchema } from './tasks.ts';

/** Paths of the fields that failed, e.g. ['name']. */
function failedFields(body: unknown) {
  const result = taskBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('taskBodySchema', () => {
  it('trims values', () => {
    expect(
      taskBodySchema.parse({
        name: '  Acme  ',
        dueDate: '2026-01-01T10:00:00.000Z',
        notes: 'Notes',
        type: 'email',
      }),
    ).toEqual({
      name: 'Acme',
      notes: 'Notes',
      type: 'email',
    });
  });

  it('rejects a blank name', () => {
    expect(
      failedFields({
        name: '   ',
        dueDate: '2026-01-01T10:00:00.000Z',
        notes: 'Notes',
        type: 'email',
      }),
    ).toEqual(['name']);
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(
      failedFields({
        name: 'Acme',
        deletedAt: '2026-01-01',
        dueDate: '2026-01-01T10:00:00.000Z',
        notes: 'Notes',
        type: 'email',
      }),
    ).toEqual(['unrecognized_keys']);
  });
});

describe('listTasksQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(listTasksQuerySchema.parse({ limit: '10', offset: '20' })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listTasksQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});
