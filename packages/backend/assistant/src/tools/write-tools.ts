import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { translate } from '@dafne/backend-common';
import type { Actor } from '@dafne/backend-crud';
import {
  ACTIVITY_TYPES,
  activityBodySchema,
  CUSTOMER_ADDRESS_TYPES,
  CUSTOMER_TYPES,
  customerBodySchema,
  SALES_ORDER_STATUSES,
  salesOrderBodySchema,
  type AssistantAction,
  type ASSISTANT_WRITE_TOOLS,
  type ContractLocale,
  type PermissionAction,
  type PermissionSubject,
  type CustomerAddressBody,
  type CustomerBodyInput,
  type CustomerDetail,
  quotationBodySchema,
} from '@dafne/contracts';
import type { ToolContext, ToolDeps } from './tool-deps.js';

export type WriteToolName = (typeof ASSISTANT_WRITE_TOOLS)[number];

/*
 * Tools that write. The model only *proposes*: the tool validates the change
 * with the contract's own schema and saves it as a pending action; nothing
 * is written until the user confirms it in the UI, and then it runs as that
 * user (CrudHooks, change log and state machine guards included).
 */

/** What a confirmed action gave back: the record it wrote. */
export interface ActionResult {
  resource: string;
  id: number;
}

interface WriteTool<Input> {
  /** What the user must be allowed (their groups' permissions) to propose and run it. */
  needs: { action: PermissionAction; subject: PermissionSubject };
  description: string;
  inputSchema: z.ZodType<Input>;
  /** Validates and builds the payload; a string is an error for the model. */
  prepare: (input: Input, deps: ToolDeps, locale: ContractLocale) => Promise<Record<string, unknown> | string>;
  /** Runs a confirmed payload as `actor`. */
  run: (payload: Record<string, unknown>, deps: ToolDeps, actor: Actor) => Promise<ActionResult>;
}

/** Zod issues as "path: message", in the user's language. */
function issues(error: z.ZodError, locale: ContractLocale): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'input'}: ${translate(issue.message, locale)}`)
    .join('; ');
}

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/** A customer as the body of its PUT (which replaces it whole). */
function customerBody(customer: CustomerDetail): CustomerBodyInput {
  return {
    type: customer.type,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    birthDate: day(customer.birthDate),
    fiscalCode: customer.fiscalCode,
    vatNumber: customer.vatNumber,
    notes: customer.notes,
    addresses: customer.addresses.map(({ id: _id, ...address }) => address),
  };
}

const customerFields = {
  name: z.string().max(255),
  email: z.string().max(255),
  phone: z.string().max(32).optional().describe('International format, e.g. +39 06 1234567'),
  vatNumber: z.string().max(13).optional().describe('Companies: Italian partita IVA'),
  fiscalCode: z.string().max(16).optional().describe('Persons: Italian codice fiscale'),
  birthDate: z.string().max(10).optional().describe('Persons: YYYY-MM-DD'),
  notes: z.string().max(4000).optional(),
};

const addressInput = z.object({
  type: z
    .enum(CUSTOMER_ADDRESS_TYPES)
    .describe('residence or domicile for persons, head_office for companies; shipping, billing for both'),
  street: z.string().max(255).describe('Street and house number'),
  city: z.string().max(100),
  postalCode: z.string().max(20).optional(),
  region: z.string().max(100).optional().describe('Province or region, e.g. MI'),
  countryCode: z.string().max(2).optional().describe('ISO 3166-1 alpha-2, e.g. FR; leave it out for Italy'),
});
type AddressInput = z.infer<typeof addressInput>;

/** An address from the model as the contract wants it: Italy unless said otherwise. */
const addressBody = (address: AddressInput): CustomerAddressBody => ({
  type: address.type,
  street: address.street,
  city: address.city,
  postalCode: address.postalCode ?? null,
  region: address.region ?? null,
  countryCode: address.countryCode ?? 'IT',
});

const createCustomerInput = z.object({
  type: z.enum(CUSTOMER_TYPES),
  ...customerFields,
  addresses: z.array(addressInput).max(20).optional().describe('Only those the user gave; at most one of each type'),
});
const createCustomer: WriteTool<z.infer<typeof createCustomerInput>> = {
  needs: { action: 'create', subject: 'Customer' },
  description:
    'Propose creating a customer, with its addresses if the user gave them. The user confirms it in the UI: never say it is created. Ask for the email if the user did not give it.',
  inputSchema: createCustomerInput,
  prepare: async (input, _deps, locale) => {
    const body = { ...input, addresses: (input.addresses ?? []).map(addressBody) };
    const parsed = customerBodySchema.safeParse(body);
    return parsed.success ? { body } : issues(parsed.error, locale);
  },
  run: async (payload, deps, actor) => {
    const created = await deps.customers.create(customerBodySchema.parse(payload.body), actor);
    return { resource: 'customers', id: created.id };
  },
};

const updateCustomerInput = z.object({
  id: z.int().positive(),
  changes: z
    .object({
      name: customerFields.name.optional(),
      email: customerFields.email.optional(),
      phone: customerFields.phone,
      vatNumber: customerFields.vatNumber,
      fiscalCode: customerFields.fiscalCode,
      birthDate: customerFields.birthDate,
      notes: customerFields.notes,
      addresses: z
        .array(addressInput)
        .max(20)
        .optional()
        .describe('Addresses to add, or to replace those of the same type; the others stay'),
    })
    .describe('Only the fields to change'),
});

/** `current` with `changes` on top: same type replaced in place, new types appended. */
function mergeAddresses(current: CustomerAddressBody[], changes: CustomerAddressBody[]): CustomerAddressBody[] {
  const merged = current.map((address) => changes.find((change) => change.type === address.type) ?? address);
  return [...merged, ...changes.filter((change) => !current.some((address) => address.type === change.type))];
}

const updateCustomer: WriteTool<z.infer<typeof updateCustomerInput>> = {
  needs: { action: 'update', subject: 'Customer' },
  description:
    'Propose changing some fields of a customer (id from search_customers), or adding or replacing its addresses. The user confirms it in the UI.',
  inputSchema: updateCustomerInput,
  prepare: async ({ id, changes: input }, deps, locale) => {
    const current = await deps.customers.get(id);
    const currentBody = customerBody(current);
    const { addresses, ...fields } = input;
    const newAddresses = addresses?.map(addressBody);
    const changes = newAddresses ? { ...fields, addresses: newAddresses } : fields;
    const body = {
      ...currentBody,
      ...fields,
      addresses: mergeAddresses(currentBody.addresses as CustomerAddressBody[], newAddresses ?? []),
    };
    const parsed = customerBodySchema.safeParse(body);
    return parsed.success ? { id, name: current.name, changes, body } : issues(parsed.error, locale);
  },
  run: async (payload, deps, actor) => {
    const id = Number(payload.id);
    await deps.customers.update(id, customerBodySchema.parse(payload.body), actor);
    return { resource: 'customers', id };
  },
};

const createActivityInput = z.object({
  name: z.string().max(255),
  type: z.enum(ACTIVITY_TYPES),
  dueDate: z.string().max(10).optional().describe('YYYY-MM-DD'),
  notes: z.string().max(4000).optional(),
});
const createActivity: WriteTool<z.infer<typeof createActivityInput>> = {
  needs: { action: 'create', subject: 'Activity' },
  description: 'Propose creating an activity (call, email, meeting or task). The user confirms it in the UI.',
  inputSchema: createActivityInput,
  prepare: async (input, _deps, locale) => {
    const parsed = activityBodySchema.safeParse(input);
    return parsed.success ? { body: input } : issues(parsed.error, locale);
  },
  run: async (payload, deps, actor) => {
    const created = await deps.activities.create(activityBodySchema.parse(payload.body), actor);
    return { resource: 'activities', id: created.id };
  },
};

const closeActivityInput = z.object({ id: z.int().positive() });
const closeActivity: WriteTool<z.infer<typeof closeActivityInput>> = {
  needs: { action: 'changeStatus', subject: 'Activity' },
  description:
    'Propose marking an open activity (a call, email, meeting or task; never a sales order) as done. The user confirms it in the UI.',
  inputSchema: closeActivityInput,
  prepare: async ({ id }, deps) => {
    const activity = await deps.activities.get(id);
    return activity.status === 'open' ? { id, name: activity.name } : `Activity ${id} is already closed`;
  },
  run: async (payload, deps, actor) => {
    const id = Number(payload.id);
    await deps.activities.changeActivityStatus(id, 'closed', actor);
    return { resource: 'activities', id };
  },
};

const changeOrderStatusInput = z.object({ id: z.int().positive(), status: z.enum(SALES_ORDER_STATUSES) });
const changeOrderStatus: WriteTool<z.infer<typeof changeOrderStatusInput>> = {
  needs: { action: 'changeStatus', subject: 'SalesOrder' },
  description:
    'Propose moving a sales order to another status, e.g. "segna come completato l\'ordine 10" is status completed. The user confirms it in the UI; the order rules may still refuse it.',
  inputSchema: changeOrderStatusInput,
  prepare: async ({ id, status }, deps) => {
    const order = await deps.salesOrders.get(id);
    return order.status === status
      ? `Order ${id} is already ${status}`
      : { id, customer: order.customer.name, from: order.status, status };
  },
  run: async (payload, deps, actor) => {
    const id = Number(payload.id);
    const status = z.enum(SALES_ORDER_STATUSES).parse(payload.status);
    await deps.salesOrders.changeSalesOrderStatus(id, status, actor);
    return { resource: 'sales-orders', id };
  },
};

const createOrderInput = z.object({
  customer: z.string().min(1).max(255).describe('The customer: its name as the user said it, or its id'),
  items: z
    .array(
      z.object({
        product: z.string().min(1).max(255).describe('The product: its name as the user said it, or its id'),
        quantity: z.number().positive(),
      }),
    )
    .min(1)
    .max(50),
  // Loose on purpose: small models fill it with guesses, checked below.
  typeId: z.string().max(100).optional().describe('Only if the user named an order type; usually leave it out'),
  notes: z.string().max(4000).optional(),
});

const createQuotationInput = z.object({
  customer: z.string().min(1).max(255).describe('The customer: its name as the user said it, or its id'),
  items: z
    .array(
      z.object({
        product: z.string().min(1).max(255).describe('The product: its name as the user said it, or its id'),
        quantity: z.number().positive(),
      }),
    )
    .min(1)
    .max(50),
  // Loose on purpose: small models fill it with guesses, checked below.
  typeId: z.string().max(100).optional().describe('Only if the user named an order type; usually leave it out'),
  notes: z.string().max(4000).optional(),
});

/**
 * One record from what the user called it: an id, the only match, or the
 * match by exact name. Otherwise a question for the model to ask.
 */
async function resolve<T extends { id: number; name: string }>(
  what: string,
  value: string,
  find: (search: string) => Promise<T[]>,
): Promise<T | string> {
  const found = await find(value.trim());
  const exact = found.filter((item) => item.name.toLowerCase() === value.trim().toLowerCase() || String(item.id) === value.trim());
  if (exact.length === 1) {
    return exact[0]!;
  }
  if (found.length === 1) {
    return found[0]!;
  }
  return found.length
    ? `Several ${what}s match "${value}": ${found.map((item) => `${item.name} (id ${item.id})`).join(', ')}. Ask the user which one.`
    : `No ${what} matches "${value}". Tell the user.`;
}

const createOrder: WriteTool<z.infer<typeof createOrderInput>> = {
  needs: { action: 'create', subject: 'SalesOrder' },
  description:
    'Propose a new sales order (draft) for a customer, with its products and quantities, named as the user named them (the tool finds them). The user confirms it in the UI.',
  inputSchema: createOrderInput,
  prepare: async ({ customer: customerName, items, typeId, notes }, deps, locale) => {
    const customer = await resolve('customer', customerName, async (search) =>
      (await deps.customers.list({ search, limit: 10 })).items,
    );
    if (typeof customer === 'string') {
      return customer;
    }
    const products: { id: number; name: string }[] = [];
    for (const item of items) {
      const product = await resolve('product', item.product, async (search) =>
        /^\d+$/.test(search)
          ? [await deps.products.get(Number(search))]
          : (await deps.products.list({ name: search, limit: 10 })).items,
      );
      if (typeof product === 'string') {
        return product;
      }
      products.push(product);
    }
    const customerId = customer.id;
    const types = (await deps.salesOrderTypes.list({ active: 'true', limit: 50 })).items;
    // An unknown type (often a guess) falls back to the only active one.
    const type =
      types.find((t) => t.id.toLowerCase() === typeId?.trim().toLowerCase()) ??
      (types.length === 1 ? types[0] : undefined);
    if (!type) {
      return `Ask the user which order type to use: ${types.map((t) => `${t.id} (${t.description})`).join(', ')}`;
    }
    const body = {
      customerId,
      typeId: type.id,
      notes: notes ?? null,
      items: items.map((item, i) => ({ productId: products[i]!.id, quantity: item.quantity, position: i + 1 })),
    };
    const parsed = salesOrderBodySchema.safeParse(body);
    if (!parsed.success) {
      return issues(parsed.error, locale);
    }
    return {
      body,
      customer: customer.name,
      type: type.description,
      lines: items.map((item, i) => ({ product: products[i]!.name, quantity: item.quantity })),
    };
  },
  run: async (payload, deps, actor) => {
    const created = await deps.salesOrders.create(salesOrderBodySchema.parse(payload.body), actor);
    return { resource: 'sales-orders', id: created.id };
  },
};

const createQuotation: WriteTool<z.infer<typeof createQuotationInput>> = {
  needs: { action: 'create', subject: 'Quotation' },
  description:
    'Propose a new quotation (draft) for a customer, with its products and quantities, named as the user named them (the tool finds them). The user confirms it in the UI.',
  inputSchema: createQuotationInput,
  prepare: async ({ customer: customerName, items, typeId, notes }, deps, locale) => {
    const customer = await resolve('customer', customerName, async (search) =>
      (await deps.customers.list({ search, limit: 10 })).items,
    );
    if (typeof customer === 'string') {
      return customer;
    }
    const products: { id: number; name: string }[] = [];
    for (const item of items) {
      const product = await resolve('product', item.product, async (search) =>
        /^\d+$/.test(search)
          ? [await deps.products.get(Number(search))]
          : (await deps.products.list({ name: search, limit: 10 })).items,
      );
      if (typeof product === 'string') {
        return product;
      }
      products.push(product);
    }
    const customerId = customer.id;
    const types = (await deps.salesOrderTypes.list({ active: 'true', limit: 50 })).items;
    // An unknown type (often a guess) falls back to the only active one.
    const type =
      types.find((t) => t.id.toLowerCase() === typeId?.trim().toLowerCase()) ??
      (types.length === 1 ? types[0] : undefined);
    if (!type) {
      return `Ask the user which order type to use: ${types.map((t) => `${t.id} (${t.description})`).join(', ')}`;
    }
    const body = {
      customerId,
      typeId: type.id,
      notes: notes ?? null,
      items: items.map((item, i) => ({ productId: products[i]!.id, quantity: item.quantity, position: i + 1 })),
    };
    const parsed = quotationBodySchema.safeParse(body);
    if (!parsed.success) {
      return issues(parsed.error, locale);
    }
    return {
      body,
      customer: customer.name,
      type: type.description,
      lines: items.map((item, i) => ({ product: products[i]!.name, quantity: item.quantity })),
    };
  },
  run: async (payload, deps, actor) => {
    const created = await deps.quotations.create(quotationBodySchema.parse(payload.body), actor);
    return { resource: 'quotations', id: created.id };
  },
};

/** A write tool with its input type erased, to keep them in one map. */
const erase = <Input>(definition: WriteTool<Input>) => definition as unknown as WriteTool<unknown>;

export const WRITE_TOOLS: Record<WriteToolName, WriteTool<unknown>> = {
  propose_create_customer: erase(createCustomer),
  propose_update_customer: erase(updateCustomer),
  propose_create_activity: erase(createActivity),
  propose_close_activity: erase(closeActivity),
  propose_change_sales_order_status: erase(changeOrderStatus),
  propose_create_sales_order: erase(createOrder),
  propose_create_quotation: erase(createQuotation),
};

/** What the model reads after proposing. */
const proposed = (action: AssistantAction) => ({
  proposed: true,
  actionId: action.id,
  note: 'Saved as a proposal: the user must confirm it in the app. Tell them briefly what you proposed; do not propose it again.',
});

export function writeTools(deps: ToolDeps, context: ToolContext): Record<WriteToolName, Tool> {
  const tools = {} as Record<WriteToolName, Tool>;
  for (const [name, definition] of Object.entries(WRITE_TOOLS) as [WriteToolName, WriteTool<unknown>][]) {
    tools[name] = tool({
      description: definition.description,
      inputSchema: definition.inputSchema as z.ZodType<Record<string, unknown>>,
      execute: async (input, { toolCallId }) => {
        const payload = await definition.prepare(input, deps, context.locale);
        if (typeof payload === 'string') {
          return { proposed: false, error: payload };
        }
        return proposed(await context.propose(name, toolCallId, payload));
      },
    });
  }
  return tools;
}
