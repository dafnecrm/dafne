import pluralize from 'pluralize';

/** One word group in every casing the templates need. */
export interface Casings {
  /** invoice-item */
  kebab: string;
  /** invoiceItem */
  camel: string;
  /** InvoiceItem */
  pascal: string;
  /** invoice_item */
  snake: string;
  /** INVOICE_ITEM */
  constant: string;
  /** invoice item */
  lower: string;
  /** Invoice item */
  title: string;
  /** an invoice item (with its article) */
  a: string;
  /** An invoice item */
  A: string;
}

/** A resource name, singular (`s`) and plural (`p`). */
export interface ResourceNames {
  s: Casings;
  p: Casings;
}

/** Splits "invoiceItems", "Invoice items", "invoice_items" or "invoice-items" into words. */
export function words(input: string): string[] {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function casings(parts: string[]): Casings {
  if (!parts.length) {
    throw new Error('The name is empty.');
  }
  const lower = parts.join(' ');
  const a = `${/^[aeiou]/.test(lower) ? 'an' : 'a'} ${lower}`;
  return {
    kebab: parts.join('-'),
    camel: parts[0] + parts.slice(1).map(capitalize).join(''),
    pascal: parts.map(capitalize).join(''),
    snake: parts.join('_'),
    constant: parts.join('_').toUpperCase(),
    lower,
    title: capitalize(lower),
    a,
    A: capitalize(a),
  };
}

/** Names of a resource from its singular or plural name (only the last word is inflected). */
export function resourceNames(input: string): ResourceNames {
  const parts = words(input);
  if (!parts.length) {
    throw new Error(`"${input}" is not a valid name.`);
  }
  if (!/^[a-z]/.test(parts[0])) {
    throw new Error(`"${input}" must start with a letter.`);
  }
  const last = parts[parts.length - 1];
  const singular = pluralize.singular(last);
  const plural = pluralize.plural(singular);
  if (singular === plural) {
    throw new Error(
      `"${input}" has the same singular and plural; pick a name whose plural differs (the generated names would clash).`,
    );
  }
  return {
    s: casings([...parts.slice(0, -1), singular]),
    p: casings([...parts.slice(0, -1), plural]),
  };
}

/** Edit distance between two strings (insertions, deletions, substitutions). */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * The candidate closest to `input` (a typo of it), if any is close enough.
 * Several inputs (e.g. a name as typed and its plural): the closest to any.
 */
export function closest(input: string | readonly string[], candidates: readonly string[]): string | undefined {
  const inputs = typeof input === 'string' ? [input] : input;
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.min(...inputs.map((one) => editDistance(one, candidate)));
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best !== undefined && bestDistance <= Math.max(2, Math.floor(best.length / 2)) ? best : undefined;
}
