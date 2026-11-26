/**
 * Uom conversion texts in English. The source of truth: it.ts must have the
 * same keys (UomConversionsMessages), and the apps merge them under
 * `uomConversions`.
 */
export const en = {
  title: "Conversions",
  singular: "Conversion",
  new: "New conversion",
  all: "All conversions",
  noun: "conversions",
  create: "Create conversion",
  editMeta: "Edit conversion",
  newDescription: "How many of a unit make one of another unit of the same kind: 1 kg = 1000 g. The same for every product.",
  editDescription: "Saving replaces the conversion: products sold in these units use the new factor from now on.",
  empty: {
    title: "No conversions found",
    filtered: "No conversion where {filter}.",
    none: "Add your first conversion to get started.",
  },
  deleteDescription: "Products will no longer be sold in one of these units by the other.",
  notFound: "This conversion no longer exists.",
  sections: { details: "Details" },
  fields: {
    createdAt: "Added",
    id: "ID",
    fromUomId: "From",
    toUomId: "To",
    uomId: "Unit",
    factor: "Factor",
    equals: "1 {to} = {factor} {from}",
  },
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
