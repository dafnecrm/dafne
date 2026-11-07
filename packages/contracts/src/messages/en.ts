/**
 * English texts of the contracts' message keys: validation messages (Zod
 * `error`s) and the errors the services throw. The frontend merges them
 * into its messages under `contracts`; the backend translates API errors
 * with them. Add every new key here and in it.ts.
 */
export const en = {
  common: {
    date: { invalid: 'Enter a valid date' },
    email: { invalid: 'Enter a valid email address' },
    number: { invalid: 'Enter a number' },
  },
  customers: {
    notFound: 'Customer not found',
    type: {
      required: 'Choose the type',
      locked: "The type can't be changed after the customer is created",
    },
    name: { required: 'Enter the name' },
    fiscalCode: { invalid: 'Enter a valid fiscal code' },
    vatNumber: { invalid: 'Enter a valid VAT number' },
    email: {
      required: 'Enter the email',
      taken: 'A customer with this email already exists',
    },
    phone: { invalid: 'Enter a valid phone number' },
    addresses: {
      typeTaken: 'Another address already has this type',
      country: 'Choose the country from the list',
    },
  },
  customerAddresses: {
    type: { required: 'Choose the type' },
    street: { required: 'Enter the street' },
    city: { required: 'Enter the city' },
    countryCode: { required: 'Choose the country' },
  },
  activities: {
    notFound: 'Activity not found',
    notOpen: 'Activity not found or closed',
    notClosed: 'Activity not found or not closed',
    name: { required: 'Enter the name' },
    type: { required: 'Choose the type' },
  },
  products: {
    notFound: 'Product not found',
    name: { required: 'Enter the name' },
  },
  users: {
    notFound: 'User not found',
    firstname: { required: 'Enter the first name' },
    lastname: { required: 'Enter the last name' },
    email: { taken: 'A user with this email already exists' },
  },
  geo: {
    q: { required: 'Enter what to search' },
    unavailable: 'Address search is unavailable. Try again later.',
  },
  salesOrders: {
    notFound: 'Sales order not found',
    customerId: { required: 'Enter the customer id' },
  },
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type ContractMessages = Shape<typeof en>;

/** "customers.name.required" and the like: every key with a text. */
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type ContractMessageKey = Paths<typeof en>;
