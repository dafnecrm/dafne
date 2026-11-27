/**
 * Uom texts in English. The source of truth: it.ts must have the
 * same keys (UomsMessages), and the apps merge them under
 * `uoms`.
 */
export const en = {
  all: "All units of measure",
  conversions: {
    add: "Add conversion",
    equals: "1 {to} = {factor} {from}",
    none: "No conversions yet.",
  },
  create: "Create unit of measure",
  deleteDescription: "The unit will no longer be listed or editable.",
  editDescription: "Saving replaces the unit's details and its conversions.",
  editMeta: "Edit unit of measure",
  empty: {
    filtered: "No unit of measure where {filter}.",
    none: "Add your first unit of measure to get started.",
    title: "No units of measure found",
  },
  fields: {
    createdAt: "Added",
    description: "Description",
    id: "Symbol",
    idHint: "E.g. kg. It can't be changed later.",
    kind: "Kind",
    name: "Name",
  },
  kind: {
    area: "Area",
    count: "Count",
    length: "Length",
    time: "Time",
    volume: "Volume",
    weight: "Weight",
  },
  new: "New unit of measure",
  newDescription: "The unit's symbol, name, kind and conversions.",
  notFound: "This unit of measure no longer exists.",
  noun: "units of measure",
  placeholder: "Choose a unit",
  sections: { conversions: "Conversions", details: "Details" },
  singular: "Unit of measure",
  title: "Units of measure",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UomsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "uoms.fields.id". */
export type UomsMessageKey = `uoms.${Paths<UomsMessages>}`;
