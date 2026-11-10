import { Node, type ObjectLiteralExpression, type SourceFile, SyntaxKind } from 'ts-morph';
import { appendToList, editSource, removeListElement } from '../wiring/ast.ts';
import type { FormField } from './body.ts';

/*
 * Keeps the sample bodies of a service spec valid for the contract: every
 * `body({...})` (the spec's helper, `const body = (input) =>
 * <s>BodySchema.parse(input)`) gets the fields that just became required
 * (new, or no longer optional), with a sample value, and loses the fields
 * that left the body (the schema is strict, so they'd make the test throw).
 * Fields that were already required are never added: a sample without one
 * is deliberate (e.g. a test that the schema asks for it). Samples with a
 * spread (`{ ...base, phone }`) are left alone too, since the spread may
 * already hold the field. Assertions are left alone.
 */

export interface SpecReport {
  added: string[];
  removed: string[];
}

/** A sample value that passes the contract's default validation. */
function sample(field: FormField): string {
  switch (field.kind) {
    case 'enum':
      return `'${field.values![0]}'`;
    case 'boolean':
      return 'false';
    case 'number':
    case 'id':
      return '1';
    case 'uuid':
      return "'00000000-0000-4000-8000-000000000001'";
    case 'decimal':
      return "'1.00'";
    case 'date':
      return "'2026-01-01'";
    case 'datetime':
      return "'2026-01-01T10:00:00.000Z'";
    case 'email':
      return "'name@example.com'";
    default:
      return `'${field.label}'`;
  }
}

/** Required: the contract has no default and doesn't accept null. */
const required = (field: FormField) =>
  field.kind !== 'unsupported' && !field.optional && field.defaultValue === undefined;

/** The parsed value of a sample, for `expect(schema.parse(x)).toEqual({...})`. */
function parsed(field: FormField): string | undefined {
  // Dates come out as Date objects: left to the test's author.
  return field.kind === 'date' || field.kind === 'datetime' ? undefined : sample(field);
}

/** Service spec: the `body({...})` calls (body = the parse helper). */
export function syncServiceSpec(
  path: string,
  source: string,
  fields: FormField[],
  removable: Set<string>,
  wasRequired: Set<string> = new Set(),
) {
  return syncSpecSamples(path, source, fields, removable, wasRequired, {
    enabled: (file) => /\.parse\(/.test(file.getVariableDeclaration('body')?.getInitializer()?.getText() ?? ''),
    callees: ['body'],
  });
}

/** Contract spec: `failedFields({...})` and `<s>BodySchema.parse({...})` / `.safeParse({...})`. */
export function syncContractSpec(
  path: string,
  source: string,
  schema: string,
  fields: FormField[],
  removable: Set<string>,
  wasRequired: Set<string> = new Set(),
) {
  return syncSpecSamples(path, source, fields, removable, wasRequired, {
    enabled: () => true,
    callees: ['failedFields', `${schema}.parse`, `${schema}.safeParse`],
  });
}

function syncSpecSamples(
  path: string,
  source: string,
  fields: FormField[],
  /** Keys to drop from the samples: columns that aren't (any more) in the body. */
  removable: Set<string>,
  /** Body fields that were required before the sync: never added. */
  wasRequired: Set<string>,
  options: { enabled: (file: SourceFile) => boolean; callees: string[] },
): { content: string; report: SpecReport } {
  const report: SpecReport = { added: [], removed: [] };
  const bodyKeys = new Set(fields.map((f) => f.key));
  const needed = fields.filter((f) => required(f) && !wasRequired.has(f.key));

  const isHelper = options.enabled;
  const calls = (file: SourceFile) =>
    file
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((c) => options.callees.includes(c.getExpression().getText()))
      .filter((c) => Node.isObjectLiteralExpression(c.getArguments()[0]));
  const samples = (file: SourceFile): ObjectLiteralExpression[] =>
    calls(file).map((c) => c.getArguments()[0] as ObjectLiteralExpression);
  /** `{...}` in `expect(<call>).toEqual({...})`, for the n-th sample. */
  const expected = (file: SourceFile, index: number): ObjectLiteralExpression | undefined => {
    const call = calls(file)[index];
    const expectCall = call?.getParentIfKind(SyntaxKind.CallExpression);
    if (!expectCall || expectCall.getExpression().getText() !== 'expect') {
      return undefined;
    }
    const toEqual = expectCall.getParentIfKind(SyntaxKind.PropertyAccessExpression)?.getParentIfKind(SyntaxKind.CallExpression);
    const name = toEqual?.getExpression().asKind(SyntaxKind.PropertyAccessExpression)?.getName();
    if (name !== 'toEqual' && name !== 'toStrictEqual') {
      return undefined;
    }
    return toEqual!.getArguments()[0]?.asKind(SyntaxKind.ObjectLiteralExpression);
  };
  const keyOf = (p: Node) => (Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p) ? p.getName() : undefined);

  // Removals, one at a time (each edit re-parses).
  for (;;) {
    let removed = false;
    source = editSource(path, source, (file) => {
      if (!isHelper(file)) {
        return;
      }
      for (const object of samples(file)) {
        const stale = object.getProperties().find((p) => {
          const key = keyOf(p);
          return key !== undefined && !bodyKeys.has(key) && removable.has(key);
        });
        if (stale) {
          report.removed.push(keyOf(stale)!);
          removeListElement(file, object.getProperties(), stale);
          removed = true;
          return;
        }
      }
    });
    if (!removed) {
      break;
    }
  }

  // Additions: the n-th sample, field by field.
  source = editSource(path, source, (file) => {
    if (!isHelper(file)) {
      return;
    }
    const count = samples(file).length;
    for (let i = 0; i < count; i++) {
      for (const field of needed) {
        const object = samples(file)[i];
        if (object.getProperties().some((p) => keyOf(p) === field.key || Node.isSpreadAssignment(p))) {
          continue;
        }
        appendToList(file, object, object.getProperties(), `${field.key}: ${sample(field)}`);
        if (!report.added.includes(field.key)) {
          report.added.push(field.key);
        }
        // What parse returns for it, when the test compares the whole result.
        const result = expected(file, i);
        const value = parsed(field);
        if (result && value !== undefined && !result.getProperties().some((p) => keyOf(p) === field.key)) {
          appendToList(file, result, result.getProperties(), `${field.key}: ${value}`);
        }
      }
    }
  });

  // Optional fields missing from a sample come out of parse as null: a
  // compared result must have them (toEqual tells null from missing).
  const nullable = fields.filter((f) => f.kind !== 'unsupported' && f.optional && !f.contractDefault);
  source = editSource(path, source, (file) => {
    if (!isHelper(file)) {
      return;
    }
    const count = samples(file).length;
    for (let i = 0; i < count; i++) {
      for (const field of nullable) {
        const object = samples(file)[i];
        if (object.getProperties().some((p) => keyOf(p) === field.key || Node.isSpreadAssignment(p))) {
          continue;
        }
        const result = expected(file, i);
        if (!result || result.getProperties().some((p) => keyOf(p) === field.key || Node.isSpreadAssignment(p))) {
          continue;
        }
        appendToList(file, result, result.getProperties(), `${field.key}: null`);
        if (!report.added.includes(`${field.key} (null in the expected result)`)) {
          report.added.push(`${field.key} (null in the expected result)`);
        }
      }
    }
  });
  return { content: source, report };
}
