/**
 * Customer texts in English. The source of truth: it.ts must have the same
 * keys (CustomersMessages), and the apps merge them under `customers`.
 */
export const en = {
  title: "Customers",
  singular: "Customer",
  new: "New customer",
  all: "All customers",
  noun: "customers",
  create: "Create customer",
  newDescription: "Only the name is required. Add as many addresses as you need.",
  editDescription: "Saving replaces the customer's details and addresses.",
  empty: {
    title: "No customers found",
    filtered: "No customer where {filter}.",
    none: "Add your first customer to get started.",
  },
  deleteDescription: "The customer will no longer be listed or editable.",
  notFound: "This customer no longer exists.",
  sections: {
    details: "Details",
    contact: "Contact",
    addresses: "Addresses",
    addressesCount: "Addresses ({count})",
  },
  fields: {
    type: "Type",
    name: "Name",
    companyName: "Company name",
    birthDate: "Birth date",
    fiscalCode: "Fiscal code",
    vatNumber: "VAT number",
    email: "Email",
    phone: "Phone",
    createdAt: "Added",
    id: "Customer ID",
  },
  type: {
    person: "Person",
    company: "Company",
  },
  addresses: {
    ordered: "In the order they're shown on the customer's page.",
    none: "No addresses yet.",
    add: "Add address",
    edit: "Edit address",
    editN: "Edit address {n}",
    removeN: "Remove address {n}",
    save: "Save address",
    savedWith: "Saved together with the customer.",
    searchHint: "Pick a place to fill in the fields below, then check them.",
    noneDetail: "No address has been added yet.",
    addOne: "Add one",
    fields: {
      type: "Type",
      street: "Street",
      postalCode: "Postal code",
      city: "City",
      region: "State / province",
      country: "Country",
    },
  },
  addressType: {
    residence: "Residence",
    domicile: "Domicile",
    head_office: "Head office",
    shipping: "Shipping",
    billing: "Billing",
  },
  editMeta: "Edit customer",
  customerPlaceholder: "Choose a customer…",
  loadingCustomers: "Searching customers…",
  noCustomers: "No customers found.",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type CustomersMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "customers.fields.name". */
export type CustomersMessageKey = `customers.${Paths<CustomersMessages>}`;
