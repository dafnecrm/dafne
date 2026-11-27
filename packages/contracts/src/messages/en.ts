/**
 * English texts of the contracts' message keys: validation messages (Zod
 * `error`s) and the errors the services throw. The frontend merges them
 * into its messages under `contracts`; the backend translates API errors
 * with them. Add every new key here and in it.ts.
 */
export const en = {
  activities: {
    name: { required: 'Enter the name' },
    notClosed: 'Activity not found or not closed',
    notFound: 'Activity not found',
    notOpen: 'Activity not found or closed',
    status: { required: 'Choose the status' },
    type: { required: 'Choose the type' },
  },
  assistant: {
    action: { notFound: 'Action not found', notPending: 'This action was already decided' },
    agent: { required: 'Choose an agent', unavailable: 'This agent is not available' },
    conversation: { notFound: 'Conversation not found' },
    failed: 'The assistant could not answer: try again',
    message: { required: 'Write a message', tooLong: 'The message is too long' },
    model: {
      none: 'This agent has no model: ask a super-admin to set one',
      notAllowed: "This agent doesn't allow switching model",
      required: 'Choose a model',
      unavailable: 'This model is not available',
    },
    noAnswer: 'The assistant gave no answer: try asking in other words',
    provider: {
      missingKey: 'The AI provider has no API key configured',
      unavailable: 'The AI provider is not reachable right now',
    },
    rateLimited: 'Too many messages: wait a few minutes',
    tools: { unknown: 'Unknown tool' },
  },
  assistantAgents: {
    defaultModelId: { required: 'Choose the default model' },
    groupIds: { required: 'Choose at least one group' },
    name: { required: 'Enter the name' },
    notFound: 'AI agent not found',
    systemPrompt: { required: 'Enter the instructions' },
  },
  assistantModels: {
    label: { required: 'Enter the label' },
    modelId: { required: 'Enter the model id' },
    notFound: 'AI model not found',
    providerId: { required: 'Choose the provider' },
  },
  assistantProviders: {
    apiKeyEnv: { invalid: 'Use the name of an environment variable, e.g. ANTHROPIC_API_KEY' },
    baseUrl: {
      invalid: 'Enter a URL starting with http:// or https://',
      required: 'Enter the server URL (e.g. http://localhost:11434/v1 for Ollama)',
    },
    kind: { required: 'Choose the kind' },
    name: { required: 'Enter the name' },
    notFound: 'AI provider not found',
  },
  common: {
    date: { invalid: 'Enter a valid date' },
    email: { invalid: 'Enter a valid email address' },
    number: { invalid: 'Enter a number' },
  },
  customerAddresses: {
    city: { required: 'Enter the city' },
    countryCode: { required: 'Choose the country' },
    street: { required: 'Enter the street' },
    type: { required: 'Choose the type' },
  },
  customers: {
    addresses: {
      country: 'Choose the country from the list',
      typeTaken: 'Another address already has this type',
    },
    email: {
      required: 'Enter the email',
      taken: 'A customer with this email already exists',
    },
    fiscalCode: { invalid: 'Enter a valid fiscal code' },
    language: { required: 'Choose the language' },
    name: { required: 'Enter the name' },
    notFound: 'Customer not found',
    phone: { invalid: 'Enter a valid phone number' },
    type: {
      locked: "The type can't be changed after the customer is created",
      required: 'Choose the type',
    },
    vatNumber: { invalid: 'Enter a valid VAT number' },
  },
  database: {
    duplicate: 'A record with these data already exists',
    invalid: 'A value is not valid',
    missingReference: 'A record this one points to does not exist',
    required: 'A required value is missing',
    stillReferenced: 'Other records still use this one',
  },
  documentTemplates: {
    file: {
      invalid: 'The template has errors: fix them in Word and upload it again',
      missing: 'Upload a .docx file',
      none: 'This template has no file yet',
      notDocx: 'The template must be a Word (.docx) file',
      tooLarge: 'The template is larger than 5 MB',
    },
    language: { required: 'Choose the language' },
    name: { required: 'Enter the name' },
    notFound: 'Document template not found',
    resource: { required: 'Enter the resource', unknown: 'Documents cannot be made for this resource' },
  },
  documents: {
    conversionFailed: 'The PDF could not be created: try again later',
    noTemplate: 'No template has been uploaded for this document yet',
    unknownResource: 'Documents cannot be made for this resource',
  },
  fsm: {
    transitionForbidden: "The status can't be changed now",
    transitionNotAllowed: "The status can't be changed to this one",
  },
  geo: {
    q: { required: 'Enter what to search' },
    unavailable: 'Address search is unavailable. Try again later.',
  },
  notifications: {
    emailNotSent: 'Email couldn\'t be sent'
  },
  permissions: {
    forbidden: "You don't have permission to do this",
    unknown: 'Unknown permission',
  },
  products: {
    name: { required: 'Enter the name' },
    notFound: 'Product not found',
    units: {
      uomId: {
        base: 'The base unit is already a unit of the product',
        duplicate: 'Two units are the same',
        notConvertible: 'The base unit has no conversion to this unit',
        notFound: 'Choose a unit from the list',
        required: 'Choose the unit',
      },
    },
    uomId: { notFound: 'Choose a unit of measure from the list', required: 'Choose the unit of measure' },
    used: 'Product is used.',
  },
  quotations: {
    customerId: {
      noAddress: 'Customer has no address',
      notFound: 'Choose a customer from the list',
      required: 'Enter the customer id',
    },
    items: {
      enterAtLeastOneItem: 'Enter at least one item',
      notFound: 'Quotation item not found',
    },
    notFound: 'Quotation not found',
    status: {
      mustBeDraft: 'Only a draft quotation can be changed',
      required: 'Choose the status',
    },
    typeId: {
      notFound: 'Choose a type from the list',
      required: 'Enter the quotation type',
    },
  },
  salesOrderTypes: {
    description: {
      required: 'Enter the type description'
    },
    id: {
      required: 'Enter the type id',
      taken: 'This id is already in use'
    },
    notFound: 'Sales order type not found',
  },
  salesOrders: {
    customerId: {
      noBillingAddress: 'Customer has no billing address',
      noShippingAddress: 'Customer has no shipping address',
      notFound: 'Choose a customer from the list',
      required: 'Enter the customer id'
    },
    items: {
      enterAtLeastOneItem: 'Enter at least one item',
      notFound: 'Sales order item not found',
      position: {
        duplicate: 'Two items have the same position',
        required: 'Enter the position',
      },
      productId: {
        notFound: 'Choose a product from the list',
        required: 'Enter the product id'
      },
      quantity: { positive: 'The quantity must be greater than zero', required: 'Enter the quantity' },
      uomId: {
        notConvertible: "The product can't be sold in this unit",
        notFound: 'Choose a unit of measure from the list',
      },
    },
    notFound: 'Sales order not found',
    status: {
      mustBeDraft: 'Status must be draft',
      required: 'Choose the status',
    },
    typeId: {
      notFound: 'Choose a type from the list',
      required: 'Enter the sales order type',
    }
  },
  tasks: {
    alreadyRunning: 'This task is already running: try again when it ends',
    cron: { invalid: 'Enter a valid cron pattern (e.g. 0 2 * * *)' },
    disabled: 'This task is turned off',
    notFound: 'Task not found',
    run: {
      notFound: 'Run not found',
      timedOut: 'The run took longer than its timeout',
      unknownTask: 'The tasks app no longer defines this task',
      workerLost: 'The run was interrupted (the tasks app stopped)',
    },
    timeoutSeconds: { invalid: 'Enter a number of seconds, from 1 to 86400' },
    timezone: {
      invalid: 'Enter a valid time zone (e.g. Europe/Rome)',
      required: 'Enter the time zone',
    },
  },
  uomConversions: {
    fromUomId: { required: 'Choose the unit' },
    notFound: 'Conversion not found',
    otherKind: 'Both units must be of the same kind',
    taken: 'These two units already have a conversion',
    toUomId: { required: 'Choose the unit', self: 'A unit cannot convert to itself' },
    uomNotFound: 'Choose a unit from the list',
  },
  uoms: {
    factor: { positive: 'The factor must be greater than zero', required: 'Enter the factor' },
    id: { required: 'Enter the symbol', taken: 'This symbol is already in use' },
    kind: { required: 'Choose the kind' },
    name: { required: 'Enter the name' },
    notFound: 'Unit of measure not found',
  },
  userGroups: { name: { required: 'Enter the name' }, notFound: 'User group not found' },
  users: {
    email: { taken: 'A user with this email already exists' },
    firstname: { required: 'Enter the first name' },
    lastname: { required: 'Enter the last name' },
    notFound: 'User not found',
    role: { superAdminRequired: 'Only a super-admin can grant the super-admin role' },
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
