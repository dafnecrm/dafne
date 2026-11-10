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
  database: {
    duplicate: 'A record with these data already exists',
    missingReference: 'A record this one points to does not exist',
    stillReferenced: 'Other records still use this one',
    required: 'A required value is missing',
    invalid: 'A value is not valid',
  },
  fsm: {
    transitionNotAllowed: "The status can't be changed to this one",
    transitionForbidden: "The status can't be changed now",
  },
  geo: {
    q: { required: 'Enter what to search' },
    unavailable: 'Address search is unavailable. Try again later.',
  },
  salesOrders: {
    notFound: 'Sales order not found',
    customerId: {
      required: 'Enter the customer id',
      notFound: 'Choose a customer from the list'
    },
    items: {
      notFound: 'Sales order item not found',
      position: {
        required: 'Enter the position',
        duplicate: 'Two items have the same position',
      },
      productId: {
        required: 'Enter the product id',
        notFound: 'Choose a product from the list'
      },
      quantity: { required: 'Enter the quantity' },
      enterAtLeastOneItem: 'Enter at least one item',
    },
    type: { required: 'Enter the type' },
    typeId: {
      required: 'Enter the type id',
      notFound: 'Choose a type from the list',
    },
    status: { required: 'Choose the status' }
  },
  salesOrderTypes: { 
    notFound: 'Sales order type not found',
    id: {
      required: 'Enter the type id',
      taken: 'This id is already in use'
    },
    description: {
      required: 'Enter the type description'
    },
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
