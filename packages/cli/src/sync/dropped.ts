import { Node, type PropertyAssignment, type SourceFile, SyntaxKind } from 'ts-morph';
import type { Changes } from '../core/changes.ts';
import { casings, words, type ResourceNames } from '../core/names.ts';
import { contractFile, tableFile, serviceFile } from '../pieces/backend.ts';
import { editSource, removeListElement } from '../wiring/ast.ts';
import { readResponse } from './response.ts';
import { readTable } from './table.ts';

/*
 * What `syncOne` leaves behind when columns are removed: it edits the
 * members that come from columns, not the code that names a column as a
 * default or tests it. Here: the default sort (service and contract), and
 * the specs that sort, filter or validate by a removed column.
 *
 * ts-morph forgets the nodes it handed out when the text changes, so the
 * loops below look nodes up again after each edit.
 */

/** The sort used when the dropped one was the default: createdAt, else the first field left. */
export const fallbackSort = (sortFields: string[]) => (sortFields.includes('createdAt') ? 'createdAt' : sortFields[0]);

const lower = (key: string) => casings(words(key)).lower;
const alternation = (keys: string[]) => keys.map((k) => k.replace(/\W/g, '')).join('|');

/** The `it(...)` calls of a spec, in order. */
const tests = (file: SourceFile) =>
  file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => c.getExpression().getText() === 'it' && Node.isExpressionStatement(c.getParent()));

const titleOf = (test: Node) => {
  const title = Node.isCallExpression(test) ? test.getArguments()[0] : undefined;
  return title && Node.isStringLiteral(title) ? title.getLiteralValue() : test.getText().slice(0, 40);
};

/** Removes the `it(...)` statements for which `matches` holds; returns their titles. */
function removeTests(file: SourceFile, matches: (test: Node) => boolean): string[] {
  const removed: string[] = [];
  for (let i = tests(file).length - 1; i >= 0; i--) {
    const test = tests(file)[i];
    if (!matches(test)) {
      continue;
    }
    removed.push(titleOf(test));
    (test.getParent() as Node & { remove(): void }).remove();
  }
  return removed;
}

/**
 * Fixes the default sort, and the specs of the service and the contract,
 * of a resource whose columns `dropped` were just removed (after syncOne).
 */
export function syncDropped(changes: Changes, names: ResourceNames, dropped: string[]) {
  if (!dropped.length) {
    return;
  }
  const contractPath = contractFile(names);
  const contract = changes.read(contractPath);
  if (contract === undefined) {
    return;
  }
  const tablePath = tableFile(names);
  const tableSource = changes.read(tablePath);
  const table = tableSource === undefined ? undefined : readTable(tablePath, tableSource, names);
  const info = readResponse(contractPath, contract, names, table);
  const sort = fallbackSort(info.sortFields);
  const filter = info.filterFields.find((key) => info.fields.find((f) => f.key === key)?.kind === 'text');
  const keys = alternation(dropped);
  const gone = new Set(dropped);
  const variable = names.s.camel;

  // Contract: the enums only the removed columns used (INVOICE_STATUSES, InvoiceStatus).
  const original = changes.original(contractPath);
  if (original !== undefined) {
    changes.update(contractPath, (text) => dropUnusedEnums(contractPath, text, original));
  }

  // Contract: `/** Defaults to name. */` above sortBy.
  if (sort) {
    changes.update(contractPath, (text) =>
      text.replace(new RegExp(`(\\/\\*\\*\\s*Defaults to )(${keys})(\\.\\s*\\*\\/)`), `$1${sort}$3`),
    );
  }

  const servicePath = serviceFile(changes, names);
  if (changes.exists(servicePath)) {
    // `sortBy = 'name',` in the list method.
    let defaultDropped = false;
    changes.update(servicePath, (text) =>
      text.replace(new RegExp(`(\\bsortBy\\s*=\\s*)(['"])(${keys})\\2`), (match, head, q) => {
        defaultDropped = true;
        return sort ? `${head}${q}${sort}${q}` : match;
      }),
    );
    if (defaultDropped && !sort) {
      changes.warn(`${servicePath}: the default sort was a removed column, and no sort field is left: fix it by hand.`);
    }

    const specPath = servicePath.replace(/\.ts$/, '.spec.ts');
    if (changes.exists(specPath)) {
      changes.update(specPath, (text) => {
        if (defaultDropped && sort) {
          // The default-order test: asc(order.name) → asc(order.createdAt), and its title.
          text = text.replace(new RegExp(`\\b(asc|desc)\\(${variable}\\.(${keys})\\)`, 'g'), `$1(${variable}.${sort})`);
          text = text.replace(new RegExp(`(it\\((['"])[^'"]*, by )(${keys})\\2`, 'g'), `$1${lower(sort)}$2`);
        }
        return editSource(specPath, text, (file) => {
          // The rows written: expect(row).toEqual({ … }), expect(update.set.mock…).toMatchObject({ … }).
          dropExpectedKeys(file, gone, /^(\w*[rR]ow|\w+\.(values|set)\.mock\b.*)$/);
          for (const title of dropFilters(file, names, gone, filter)) {
            changes.warn(`${specPath}: no text filter is left: removed the test "${title}".`);
          }
          dropFieldTests(file, gone);
        });
      });
    }
  }

  const contractSpecPath = contractPath.replace(/\.ts$/, '.spec.ts');
  if (changes.exists(contractSpecPath)) {
    changes.update(contractSpecPath, (text) =>
      editSource(contractSpecPath, text, (file) => {
        dropExpectedFailures(file, gone);
        // Removed keys in the expected bodies (the samples are synced already).
        dropExpectedKeys(file, gone, /./);
        dropFieldTests(file, gone);
      }),
    );
  }
}

/** Uses of `name` in `text` outside the statements in `except`. */
const usesOf = (text: string, name: string, except: string[]) =>
  [...text.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length - except.reduce((n, s) => n + [...s.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length, 0);

/**
 * Removes the enums (`X = [...] as const` and `type T = (typeof X)[number]`)
 * that the contract used before this run and doesn't now: those of the
 * removed columns. Other packages that import them (the frontend) are synced
 * on their own.
 */
function dropUnusedEnums(path: string, text: string, original: string): string {
  return editSource(path, text, (file) => {
    for (;;) {
      const found = file.getTypeAliases().flatMap((alias) => {
        const constant = /^\(typeof(\w+)\)\[number\]$/.exec(alias.getTypeNode()?.getText().replace(/\s/g, '') ?? '')?.[1];
        const statement = constant && file.getVariableStatement(constant);
        if (!statement) {
          return [];
        }
        const declarations = [alias.getText(true), statement.getText(true)];
        const usedNow = [alias.getName(), constant].some((n) => usesOf(file.getFullText(), n, declarations) > 0);
        const usedBefore = [alias.getName(), constant].some((n) => usesOf(original, n, declarations) > 0);
        return usedBefore && !usedNow ? [{ alias, statement }] : [];
      })[0];
      if (!found) {
        return;
      }
      found.alias.remove();
      file.getVariableStatement(found.statement.getDeclarations()[0].getName())?.remove();
    }
  });
}

/**
 * Removes the `gone` keys from the objects of `expect(<actual>).toEqual({…})`
 * and `.toMatchObject({…})` when the actual value's text matches `actual`.
 */
function dropExpectedKeys(file: SourceFile, gone: Set<string>, actual: RegExp) {
  const next = () =>
    file
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((call) => {
        const callee = call.getExpression();
        if (!Node.isPropertyAccessExpression(callee) || !['toEqual', 'toMatchObject'].includes(callee.getName())) {
          return false;
        }
        const target = callee.getExpression();
        if (!Node.isCallExpression(target) || target.getExpression().getText() !== 'expect') {
          return false;
        }
        return actual.test(target.getArguments()[0]?.getText().replace(/\s/g, '') ?? '');
      })
      .flatMap((call) => call.getArguments()[0]?.asKind(SyntaxKind.ObjectLiteralExpression) ?? [])
      .map((object) => ({ object, prop: object.getProperties().find((p) => Node.isPropertyAssignment(p) && gone.has(p.getName())) }))
      .find(({ prop }) => prop);
  for (let found = next(); found; found = next()) {
    removeListElement(file, found.object.getProperties(), found.prop!);
  }
}

/**
 * The contract spec's expected failures: `failedFields(…)).toEqual(['name',
 * 'email', 'phone'])` loses 'phone'; a test that expected only removed
 * fields goes.
 */
function dropExpectedFailures(file: SourceFile, gone: Set<string>) {
  const isGone = (e: Node) => Node.isStringLiteral(e) && gone.has(e.getLiteralValue());
  const failures = (node: Node) =>
    node
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((call) => /\bfailedFields\([\s\S]*\.toEqual$/.test(call.getExpression().getText()))
      .flatMap((call) => call.getArguments()[0]?.asKind(SyntaxKind.ArrayLiteralExpression) ?? []);
  removeTests(file, (test) => failures(test).some((a) => a.getElements().length > 0 && a.getElements().every(isGone)));
  for (;;) {
    const array = failures(file).find((a) => a.getElements().some(isGone));
    if (!array) {
      return;
    }
    removeListElement(file, array.getElements(), array.getElements().find(isGone)!);
  }
}

/**
 * The filter test of the service spec: `list({ name: '…', phone: '…' })`
 * expecting `and(notDeleted, ilike(customer.name, …), ilike(customer.phone, …))`.
 * A removed filter leaves both when others are there; when it was the only
 * one, `filter` (a text filter left) takes its place, or the test goes.
 * Returns the titles of the tests removed.
 */
function dropFilters(file: SourceFile, names: ResourceNames, gone: Set<string>, filter: string | undefined): string[] {
  const variable = names.s.camel;
  const keyOf = (call: Node) => {
    if (!Node.isCallExpression(call) || call.getExpression().getText() !== 'ilike') {
      return undefined;
    }
    const column = call.getArguments()[0];
    return column && Node.isPropertyAccessExpression(column) && column.getExpression().getText() === variable ? column.getName() : undefined;
  };
  const ilikes = (test: Node) => test.getDescendantsOfKind(SyntaxKind.CallExpression).filter((c) => keyOf(c) !== undefined);
  const droppedIn = (test: Node) => ilikes(test).filter((c) => gone.has(keyOf(c)!));
  const listProp = (test: Node) =>
    test
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((c) => c.getExpression().getText().endsWith(`.list${names.p.pascal}`))
      .flatMap((c) => c.getArguments().filter(Node.isObjectLiteralExpression))
      .map((object) => ({
        object,
        prop: object.getProperties().find((p): p is PropertyAssignment => Node.isPropertyAssignment(p) && gone.has(p.getName())),
      }))
      .find(({ prop }) => prop);

  const removed: string[] = [];
  for (let i = tests(file).length - 1; i >= 0; i--) {
    const test = () => tests(file)[i];
    if (!droppedIn(test()).length) {
      continue;
    }
    if (droppedIn(test()).length < ilikes(test()).length) {
      // Other filters are left: only the removed ones go.
      for (let call = droppedIn(test())[0]; call; call = droppedIn(test())[0]) {
        const parent = call.getParentIfKind(SyntaxKind.CallExpression);
        if (!parent) {
          break;
        }
        removeListElement(file, parent.getArguments(), call);
      }
      for (let found = listProp(test()); found; found = listProp(test())) {
        removeListElement(file, found.object.getProperties(), found.prop!);
      }
    } else if (filter) {
      for (let call = droppedIn(test())[0]; call; call = droppedIn(test())[0]) {
        call.getArguments()[0].replaceWithText(`${variable}.${filter}`);
      }
      for (let found = listProp(test()); found; found = listProp(test())) {
        found.prop!.getNameNode().replaceWithText(filter);
      }
    } else {
      removed.push(titleOf(test()));
      (test().getParent() as Node & { remove(): void }).remove();
    }
  }
  return removed;
}

/**
 * Tests about a removed field only: those looping over its values
 * (`for (const phone of [...])`). In the other titles, the clause naming
 * it goes: "rejects a blank name, a bad email and a bad phone" → "rejects
 * a blank name and a bad email".
 */
function dropFieldTests(file: SourceFile, gone: Set<string>) {
  removeTests(file, (test) =>
    test
      .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
      .some((v) => gone.has(v.getName()) && Node.isForOfStatement(v.getParent()?.getParent())),
  );
  const phrases = [...gone].map((key) => new RegExp(`\\b${lower(key)}\\b`, 'i'));
  for (let i = 0; i < tests(file).length; i++) {
    const title = tests(file)[i].getArguments()[0];
    if (!title || !Node.isStringLiteral(title)) {
      continue;
    }
    // "verb a, b and c": the clauses after the first word.
    const [, verb, rest] = /^(\w+ )(.+)$/.exec(title.getLiteralValue()) ?? [];
    if (!rest) {
      continue;
    }
    const clauses = rest.split(/, | and /);
    if (clauses.length < 2) {
      continue;
    }
    const kept = clauses.filter((c) => !phrases.some((phrase) => phrase.test(c)));
    if (kept.length === clauses.length || !kept.length) {
      continue;
    }
    const joined = kept.length === 1 ? kept[0] : `${kept.slice(0, -1).join(', ')} and ${kept[kept.length - 1]}`;
    title.setLiteralValue(`${verb}${joined}`);
  }
}
