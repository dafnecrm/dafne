import {
  type ArrayLiteralExpression,
  Node,
  type ObjectLiteralExpression,
  Project,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph';

/*
 * ts-morph finds the nodes; the edits are plain text insertions that copy
 * the file's own quotes, indentation and trailing commas, so files that
 * aren't Prettier-formatted (left as they are) still read naturally.
 */

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { allowJs: true, jsx: 4 /* preserve */ },
});

/** Parses `source`, lets `edit` change it, returns the new text. */
export function editSource(
  path: string,
  source: string,
  edit: (file: SourceFile) => void,
): string {
  const file = project.createSourceFile(`/${path}`, source, { overwrite: true });
  edit(file);
  const text = file.getFullText();
  project.removeSourceFile(file);
  return text;
}

/** The quote the file's imports use. */
export function quoteOf(file: SourceFile): string {
  const first = file.getImportDeclarations()[0]?.getModuleSpecifier().getText();
  return first?.startsWith('"') ? '"' : "'";
}

/** Inserts a full import line after the last import. */
export function insertImportLine(file: SourceFile, clause: string, module: string) {
  const q = quoteOf(file);
  const line = `import ${clause} from ${q}${module}${q};`;
  const imports = file.getImportDeclarations();
  const last = imports[imports.length - 1];
  if (last) {
    file.insertText(last.getEnd(), `\n${line}`);
  } else {
    file.insertText(0, `${line}\n`);
  }
}

/** Adds `import { name } from 'module'` unless the name is already imported from it. */
export function ensureNamedImport(
  file: SourceFile,
  module: string,
  name: string,
  { typeOnly = false }: { typeOnly?: boolean } = {},
) {
  const existing = file.getImportDeclaration(
    (decl) => decl.getModuleSpecifierValue() === module,
  );
  const spec = typeOnly && !existing?.isTypeOnly() ? `type ${name}` : name;
  if (!existing) {
    return insertImportLine(file, `{ ${spec} }`, module);
  }
  const named = existing.getNamedImports();
  if (named.some((n) => n.getName() === name)) {
    return;
  }
  // A value from an `import type { … }` line: `import { type …, name }`.
  if (!typeOnly && existing.isTypeOnly()) {
    const names = named.map((n) => `type ${n.getText()}`);
    const q = quoteOf(file);
    existing.replaceWithText(`import { ${[...names, name].join(', ')} } from ${q}${module}${q};`);
    return;
  }
  name = spec;
  // Before the first type-only import (`type LucideIcon`), or at the end.
  const typeIndex = named.findIndex((n) => n.isTypeOnly());
  const list = named[0]?.getParentOrThrow();
  if (!list || !Node.isNamedImports(list)) {
    return void existing.addNamedImport(name);
  }
  if (typeIndex > 0) {
    insertListElement(file, list.getElements(), typeIndex, name);
  } else {
    appendToList(file, list, list.getElements(), name);
  }
}

export type ListNode = ArrayLiteralExpression | ObjectLiteralExpression | Node;

/** Whitespace at the start of the line holding `pos`. */
function indentAt(file: SourceFile, pos: number) {
  const text = file.getFullText();
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart))![0];
}

/** Appends `element` after the last of `elements`, inside the brackets of `list`. */
export function appendToList(file: SourceFile, list: ListNode, elements: Node[], element: string) {
  const text = file.getFullText();
  const last = elements[elements.length - 1];
  if (!last) {
    // `[]` or `{}`: put it between the brackets.
    file.insertText(list.getEnd() - 1, element);
    return;
  }
  const closing = list.getEnd() - 1;
  const between = text.slice(last.getEnd(), closing);
  const trailingComma = /^\s*,/.test(between);
  const multiline = text.slice(list.getStart(), last.getStart()).includes('\n');
  if (multiline) {
    const indent = indentAt(file, last.getStart());
    if (trailingComma) {
      const afterComma = last.getEnd() + between.indexOf(',') + 1;
      file.insertText(afterComma, `\n${indent}${element},`);
    } else {
      file.insertText(last.getEnd(), `,\n${indent}${element}`);
    }
  } else {
    file.insertText(last.getEnd(), `, ${element}`);
  }
}

/** Inserts `element` before `elements[index]` (index > 0). */
export function insertListElement(file: SourceFile, elements: Node[], index: number, element: string) {
  const before = elements[index];
  const prev = elements[index - 1];
  const multiline = file.getFullText().slice(prev.getEnd(), before.getStart()).includes('\n');
  const indent = indentAt(file, before.getStart());
  file.insertText(before.getStart(), multiline ? `${element},\n${indent}` : `${element}, `);
}

/** Appends `element` to the array unless it's already there. */
export function ensureArrayElement(file: SourceFile, array: ArrayLiteralExpression, element: string) {
  if (array.getElements().some((e) => e.getText() === element)) {
    return;
  }
  appendToList(file, array, array.getElements(), element);
}

/** Inserts an element into an array at `index`. */
export function insertArrayElement(
  file: SourceFile,
  array: ArrayLiteralExpression,
  index: number,
  element: string,
) {
  const elements = array.getElements();
  if (index >= elements.length || index === 0) {
    if (index === 0 && elements.length) {
      const first = elements[0];
      const indent = indentAt(file, first.getStart());
      file.insertText(first.getStart(), `${element},\n${indent}`);
    } else {
      appendToList(file, array, elements, element);
    }
    return;
  }
  insertListElement(file, elements, index, element);
}

/** The argument object of the class decorator `name`, e.g. `@Module({...})`. */
export function decoratorObject(file: SourceFile, name: string): ObjectLiteralExpression {
  for (const cls of file.getClasses()) {
    const arg = cls.getDecorator(name)?.getArguments()[0];
    if (arg && Node.isObjectLiteralExpression(arg)) {
      return arg;
    }
  }
  throw new Error(`No @${name}({...}) class found in ${file.getBaseName()}.`);
}

/** The array literal in `property: [...]` of an object, added (as `property: []`) if missing. */
export function arrayProperty(
  file: SourceFile,
  object: () => ObjectLiteralExpression,
  property: string,
): ArrayLiteralExpression {
  if (!object().getProperty(property)) {
    appendToList(file, object(), object().getProperties(), `${property}: []`);
  }
  const prop = object().getPropertyOrThrow(property);
  if (!Node.isPropertyAssignment(prop)) {
    throw new Error(`"${property}" isn't a plain array property.`);
  }
  return prop.getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);
}

/** The object literal assigned to `const name = {...}` (looking through `as`/`satisfies`). */
export function variableObject(file: SourceFile, name: string): ObjectLiteralExpression {
  const init = file.getVariableDeclarationOrThrow(name).getInitializerOrThrow();
  const object = Node.isObjectLiteralExpression(init)
    ? init
    : init.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
  if (!object) {
    throw new Error(`"${name}" isn't an object literal.`);
  }
  return object;
}

/** Adds `...name` to an object literal unless it's already spread there. */
export function ensureSpread(file: SourceFile, object: ObjectLiteralExpression, name: string) {
  const properties = object.getProperties();
  const has = properties.some(
    (p) => Node.isSpreadAssignment(p) && p.getExpression().getText() === name,
  );
  if (!has) {
    appendToList(file, object, properties, `...${name}`);
  }
}

/**
 * Removes an element of a list (array, object, arguments, imports) with
 * its comments and the comma that separates it from its neighbours.
 */
export function removeListElement(file: SourceFile, elements: Node[], element: Node) {
  const text = file.getFullText();
  const index = elements.indexOf(element);
  const after = text.slice(element.getEnd());
  const comma = /^\s*,/.exec(after);
  if (comma) {
    // ", " on one line: drop the spaces too; a newline stays for the next one.
    const spaces = /^[ \t]*/.exec(after.slice(comma[0].length))![0];
    // On its own line: drop the line with its comments; inline: just "x, ".
    const leading = text.slice(element.getFullStart(), element.getStart());
    const start = leading.includes('\n') ? element.getFullStart() : element.getStart();
    file.removeText(start, element.getEnd() + comma[0].length + spaces.length);
  } else if (index > 0) {
    file.removeText(elements[index - 1].getEnd(), element.getEnd());
  } else {
    file.removeText(element.getFullStart(), element.getEnd());
  }
}

/** Removes unused named imports (and imports left empty) from `module`. */
export function removeUnusedImports(file: SourceFile, module: (specifier: string) => boolean) {
  // Default imports (`import Link from "next/link"`) that only they make up.
  for (;;) {
    // Re-read after each removal: editing the text forgets the old nodes.
    const decl = file.getImportDeclarations().find((d) => {
      const name = d.getDefaultImport()?.getText();
      if (!name || d.getNamedImports().length || d.getNamespaceImport() || !module(d.getModuleSpecifierValue())) {
        return false;
      }
      return !file
        .getDescendantsOfKind(SyntaxKind.Identifier)
        .some((id) => id.getText() === name && !id.getFirstAncestorByKind(SyntaxKind.ImportDeclaration));
    });
    if (!decl) {
      break;
    }
    const end = decl.getEnd();
    const next = file.getFullText().slice(end).match(/^\r?\n/)?.[0].length ?? 0;
    file.removeText(decl.getStart(), end + next);
  }
  for (;;) {
    const unused = file
      .getImportDeclarations()
      .filter((d) => module(d.getModuleSpecifierValue()))
      .flatMap((d) => d.getNamedImports().map((n) => ({ d, n })))
      .find(({ n }) => {
        const name = n.getAliasNode()?.getText() ?? n.getName();
        const uses = file
          .getDescendantsOfKind(SyntaxKind.Identifier)
          .filter((id) => id.getText() === name && !id.getFirstAncestorByKind(SyntaxKind.ImportDeclaration))
          // `.primaryKey()` or `{ primaryKey: 1 }` don't use the import.
          .filter((id) => {
            const parent = id.getParent();
            if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === id) {
              return false;
            }
            if (Node.isPropertyAssignment(parent) && parent.getNameNode() === id) {
              return false;
            }
            return true;
          });
        return uses.length === 0;
      });
    if (!unused) {
      return;
    }
    const named = unused.d.getNamedImports();
    if (named.length === 1) {
      const decl = unused.d;
      const end = decl.getEnd();
      const next = file.getFullText().slice(end).match(/^\r?\n/)?.[0].length ?? 0;
      file.removeText(decl.getStart(), end + next);
    } else {
      removeListElement(file, named, unused.n);
    }
  }
}

/**
 * Adds a hook call (e.g. `const optionLabel = useOptionLabel();`) to the
 * component that translates, after its `const t = useTranslations(…);`,
 * unless the file already has it. Hooks can't go in the JSX's callbacks
 * (TanStack's render props), so options and helpers are made here.
 */
export function ensureHookLine(file: SourceFile, line: string): boolean {
  const text = file.getFullText();
  if (text.includes(line)) {
    return true;
  }
  const t = /\n([ \t]*)const t = (?:await get|use)Translations\([^)]*\);?\n/.exec(text);
  if (!t) {
    return false;
  }
  file.insertText(t.index + t[0].length, `${t[1]}${line}\n`);
  return true;
}

/** Removes a JSX element; on a line of its own, the whole line goes. */
export function removeJsxElement(file: SourceFile, element: Node) {
  const text = file.getFullText();
  const lineStart = text.lastIndexOf('\n', element.getStart() - 1) + 1;
  const alone = /^[ \t]*$/.test(text.slice(lineStart, element.getStart()));
  const after = /^[ \t]*\r?\n/.exec(text.slice(element.getEnd()));
  if (alone && after) {
    file.removeText(lineStart, element.getEnd() + after[0].length);
  } else {
    file.removeText(element.getStart(), element.getEnd());
  }
}
