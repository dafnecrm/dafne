/**
 * Customer texts in English. The source of truth: it.ts must have the same
 * keys (CustomersMessages), and the apps merge them under `customers`.
 */
export const en = {
  addressType: {
    billing: "Billing",
    domicile: "Domicile",
    head_office: "Head office",
    residence: "Residence",
    shipping: "Shipping",
  },
  addresses: {
    add: "Add address",
    addOne: "Add one",
    edit: "Edit address",
    editN: "Edit address {n}",
    fields: {
      city: "City",
      country: "Country",
      postalCode: "Postal code",
      region: "State / province",
      street: "Street",
      type: "Type",
    },
    none: "No addresses yet.",
    noneDetail: "No address has been added yet.",
    ordered: "In the order they're shown on the customer's page.",
    removeN: "Remove address {n}",
    save: "Save address",
    savedWith: "Saved together with the customer.",
    searchHint: "Pick a place to fill in the fields below, then check them.",
  },
  all: "All customers",
  create: "Create customer",
  customerPlaceholder: "Choose a customer…",
  deleteDescription: "The customer will no longer be listed or editable.",
  editDescription: "Saving replaces the customer's details and addresses.",
  editMeta: "Edit customer",
  empty: {
    filtered: "No customer where {filter}.",
    none: "Add your first customer to get started.",
    title: "No customers found",
  },
  fields: {
    addresses: 'Addresses',
    birthDate: "Birth date",
    companyName: "Company name",
    createdAt: "Added",
    email: "Email",
    fiscalCode: "Fiscal code",
    id: "ID",
    language: "Document language",
    name: "Name",
    notes: 'Notes',
    phone: "Phone",
    type: "Type",
    vatNumber: "VAT number",
  },
  language: {
    en: "English",
    it: "Italian",
    none: "Same as the user",
  },
  loadingCustomers: "Searching customers…",
  new: "New customer",
  newDescription: "Only the name is required. Add as many addresses as you need.",
  noCustomers: "No customers found.",
  notFound: "This customer no longer exists.",
  noun: "customers",
  sections: {
    addresses: "Addresses",
    addressesCount: "Addresses ({count})",
    contact: "Contact",
    details: "Details",
  },
  singular: "Customer",
  title: "Customers",
  type: {
    company: "Company",
    person: "Person",
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type CustomersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "customers.fields.name". */
export type CustomersMessageKey = `customers.${Paths<CustomersMessages>}`;
