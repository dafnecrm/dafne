/** English texts of the contracts' message keys. */
export const en = {
  common: {
    date: { invalid: 'Enter a valid date' },
    number: { invalid: 'Enter a number' },
  },
  customers: {
    notFound: 'Customer not found',
  },
};

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type ContractMessages = Shape<typeof en>;
