import { activityBodySchema, listActivitiesQuerySchema } from './activities.ts';

/** Paths of the fields that failed, e.g. ['name']. */
function failedFields(body: unknown) {
  const result = activityBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('activityBodySchema', () => {
  it('trims values', () => {
    expect(activityBodySchema.parse({ name: '  Acme  ' })).toEqual({
      name: 'Acme',
    });
  });

  it('rejects a blank name', () => {
    expect(failedFields({ name: '   ' })).toEqual(['name']);
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(failedFields({ name: 'Acme', deletedAt: '2026-01-01' })).toEqual([
      'unrecognized_keys',
    ]);
  });
});

describe('listActivitiesQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(
      listActivitiesQuerySchema.parse({ limit: '10', offset: '20' }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listActivitiesQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});
