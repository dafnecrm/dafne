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
  if (!parts.length) throw new Error('The name is empty.');
  const lower = parts.join(' ');
  return {
    kebab: parts.join('-'),
    camel: parts[0] + parts.slice(1).map(capitalize).join(''),
    pascal: parts.map(capitalize).join(''),
    snake: parts.join('_'),
    constant: parts.join('_').toUpperCase(),
    lower,
    title: capitalize(lower),
  };
}

/** Names of a resource from its singular or plural name (only the last word is inflected). */
export function resourceNames(input: string): ResourceNames {
  const parts = words(input);
  if (!parts.length) throw new Error(`"${input}" is not a valid name.`);
  if (!/^[a-z]/.test(parts[0]))
    throw new Error(`"${input}" must start with a letter.`);
  const last = parts[parts.length - 1];
  const singular = pluralize.singular(last);
  const plural = pluralize.plural(singular);
  if (singular === plural)
    throw new Error(
      `"${input}" has the same singular and plural; pick a name whose plural differs (the generated names would clash).`,
    );
  return {
    s: casings([...parts.slice(0, -1), singular]),
    p: casings([...parts.slice(0, -1), plural]),
  };
}
