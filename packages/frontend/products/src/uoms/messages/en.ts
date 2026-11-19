/**
 * Uom texts in English. The source of truth: it.ts must have the
 * same keys (UomsMessages), and the apps merge them under
 * `uoms`.
 */
export const en = {
  title: "Units of measure",
  singular: "Unit of measure",
  new: "New unit of measure",
  all: "All units of measure",
  noun: "units of measure",
  create: "Create unit of measure",
  editMeta: "Edit unit of measure",
  newDescription: "The unit's symbol, name, kind and conversions.",
  editDescription: "Saving replaces the unit's details and its conversions.",
  empty: {
    title: "No units of measure found",
    filtered: "No unit of measure where {filter}.",
    none: "Add your first unit of measure to get started.",
  },
  deleteDescription: "The unit will no longer be listed or editable.",
  notFound: "This unit of measure no longer exists.",
  placeholder: "Choose a unit",
  sections: { details: "Details", conversions: "Conversions" },
  fields: {
    createdAt: "Added",
    id: "Symbol",
    idHint: "E.g. kg. It can't be changed later.",
    name: "Name",
    description: "Description",
    kind: "Kind",
  },
  kind: {
    weight: "Weight",
    volume: "Volume",
    length: "Length",
    area: "Area",
    count: "Count",
    time: "Time",
  },
  conversions: {
    add: "Add conversion",
    none: "No conversions yet.",
    equals: "1 {to} = {factor} {from}",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type UomsMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "uoms.fields.id". */
export type UomsMessageKey = `uoms.${Paths<UomsMessages>}`;
