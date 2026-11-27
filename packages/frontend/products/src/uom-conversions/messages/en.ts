/**
 * Uom conversion texts in English. The source of truth: it.ts must have the
 * same keys (UomConversionsMessages), and the apps merge them under
 * `uomConversions`.
 */
export const en = {
  all: "All conversions",
  create: "Create conversion",
  deleteDescription: "Products will no longer be sold in one of these units by the other.",
  editDescription: "Saving replaces the conversion: products sold in these units use the new factor from now on.",
  editMeta: "Edit conversion",
  empty: {
    filtered: "No conversion where {filter}.",
    none: "Add your first conversion to get started.",
    title: "No conversions found",
  },
  fields: {
    createdAt: "Added",
    equals: "1 {to} = {factor} {from}",
    factor: "Factor",
    fromUomId: "From",
    id: "ID",
    toUomId: "To",
    uomId: "Unit",
  },
  new: "New conversion",
  newDescription: "How many of a unit make one of another unit of the same kind: 1 kg = 1000 g. The same for every product.",
  notFound: "This conversion no longer exists.",
  noun: "conversions",
  sections: { details: "Details" },
  singular: "Conversion",
  title: "Conversions",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UomConversionsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "uomConversions.fields.id". */
export type UomConversionsMessageKey =
  `uomConversions.${Paths<UomConversionsMessages>}`;
