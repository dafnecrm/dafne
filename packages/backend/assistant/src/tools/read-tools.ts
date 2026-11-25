import { tool, type Tool } from 'ai';
import { z } from 'zod';
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  CUSTOMER_TYPES,
  listActivitiesQuerySchema,
  listCustomersQuerySchema,
  listProductsQuerySchema,
  listQuotationsQuerySchema,
  listSalesOrdersQuerySchema,
  QUOTATION_STATUSES,
  SALES_ORDER_STATUSES,
  type ASSISTANT_READ_TOOLS,
} from '@dafne/contracts';
import type { ToolDeps } from './tool-deps.js';

type ReadToolName = (typeof ASSISTANT_READ_TOOLS)[number];

/*
 * Tools that only read, through the CRM's own services: they run as soon as
 * the model calls them. Their outputs are compact (only the fields an
 * answer needs, at most 20 rows) so small local models keep their context.
 */

const MAX_ROWS = 20;
const limit = z.int().min(1).max(MAX_ROWS).optional().describe(`Max rows (default 10, at most ${MAX_ROWS})`);
const id = z.int().positive();

/** Long free text cut, so one record can't fill the context. */
const clip = (text: string | null, max = 500) =>
  text && text.length > max ? `${text.slice(0, max)}…` : text;

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export function readTools(deps: ToolDeps): Record<ReadToolName, Tool> {
  return {
    search_customers: tool({
      description:
        'Find customers by name or id (free text), optionally by type. Use it before any other tool that needs a customer id. Returns how many match (total) and the first rows.',
      inputSchema: z.object({
        query: z.string().max(255).optional().describe('Part of the name, or the id'),
        type: z.enum(CUSTOMER_TYPES).optional().describe('person or company'),
        limit,
      }),
      execute: async ({ query, type, limit: max }) => {
        const page = await deps.customers.list(
          listCustomersQuerySchema.parse({ search: query, type, limit: max ?? 10, sortBy: 'name', sortDirection: 'asc' }),
        );
        const exact = page.items.some((c) => c.name.toLowerCase() === query?.trim().toLowerCase());
        return {
          total: page.total,
          items: page.items.map((c) => ({ id: c.id, type: c.type, name: c.name, email: c.email, phone: c.phone })),
          // Small models follow tool results better than the system prompt.
          ...(page.total > 1 && !exact
            ? { note: 'Several customers match and none by its exact name: ask the user which one, do not pick one.' }
            : {}),
        };
      },
    }),

    get_customer: tool({
      description: 'One customer with its details and addresses, by id.',
      inputSchema: z.object({ id }),
      execute: async ({ id: customerId }) => {
        const c = await deps.customers.get(customerId);
        return {
          id: c.id,
          type: c.type,
          name: c.name,
          email: c.email,
          phone: c.phone,
          vatNumber: c.vatNumber,
          fiscalCode: c.fiscalCode,
          birthDate: day(c.birthDate),
          notes: clip(c.notes),
          addresses: c.addresses.map((a) => ({
            type: a.type,
            street: a.street,
            city: a.city,
            postalCode: a.postalCode,
            region: a.region,
            countryCode: a.countryCode,
          })),
        };
      },
    }),

    list_sales_orders: tool({
      description:
        'Sales orders, newest first, optionally of one customer (customerId from search_customers) and/or in one status. `total` is how many match: use it to answer "how many".',
      inputSchema: z.object({
        customerId: id.optional(),
        status: z.enum(SALES_ORDER_STATUSES).optional(),
        limit,
      }),
      execute: async ({ customerId, status, limit: max }) => {
        const page = await deps.salesOrders.list(
          listSalesOrdersQuerySchema.parse({
            customerId: customerId === undefined ? undefined : String(customerId),
            status,
            limit: max ?? 10,
          }),
        );
        return {
          total: page.total,
          items: page.items.map((o) => ({
            id: o.id,
            status: o.status,
            customer: o.customer,
            type: o.type.description,
            createdAt: day(o.createdAt),
          })),
        };
      },
    }),

    get_sales_order: tool({
      description: 'One sales order with its lines (products and quantities), by id.',
      inputSchema: z.object({ id }),
      execute: async ({ id: orderId }) => {
        const o = await deps.salesOrders.get(orderId);
        return {
          id: o.id,
          status: o.status,
          customer: o.customer,
          type: o.type.description,
          notes: clip(o.notes),
          createdAt: day(o.createdAt),
          items: o.items.map((i) => ({ position: i.position, product: i.product, quantity: i.quantity, unit: i.uomId, price: i.price })),
        };
      },
    }),

    list_activities: tool({
      description: 'Activities (calls, emails, meetings, tasks), newest first, by name, type or status.',
      inputSchema: z.object({
        name: z.string().max(255).optional(),
        type: z.enum(ACTIVITY_TYPES).optional(),
        status: z.enum(ACTIVITY_STATUSES).optional(),
        limit,
      }),
      execute: async ({ name, type, status, limit: max }) => {
        const page = await deps.activities.list(
          listActivitiesQuerySchema.parse({ name, type, status, limit: max ?? 10 }),
        );
        return {
          total: page.total,
          items: page.items.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            status: a.status,
            dueDate: day(a.dueDate),
          })),
        };
      },
    }),

    get_activity: tool({
      description: 'One activity with its notes, by id.',
      inputSchema: z.object({ id }),
      execute: async ({ id: activityId }) => {
        const a = await deps.activities.get(activityId);
        return {
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status,
          dueDate: day(a.dueDate),
          completedAt: day(a.completedAt),
          notes: clip(a.notes),
        };
      },
    }),

    list_products: tool({
      description: 'Products by name, with their price.',
      inputSchema: z.object({ name: z.string().max(255).optional(), limit }),
      execute: async ({ name, limit: max }) => {
        const page = await deps.products.list(
          listProductsQuerySchema.parse({ name, limit: max ?? 10, sortBy: 'name', sortDirection: 'asc' }),
        );
        return {
          total: page.total,
          items: page.items.map((p) => ({ id: p.id, name: p.name, price: p.price })),
        };
      },
    }),

    get_product: tool({
      description: 'One product with its description, by id.',
      inputSchema: z.object({ id }),
      execute: async ({ id: productId }) => {
        const p = await deps.products.get(productId);
        return { id: p.id, name: p.name, price: p.price, description: clip(p.description) };
      },
    }),

    list_quotations: tool({
      description:
        'Quotations, newest first, optionally of one customer (customerId from search_customers) and/or in one status. `total` is how many match: use it to answer "how many".',
      inputSchema: z.object({
        customerId: id.optional(),
        status: z.enum(QUOTATION_STATUSES).optional(),
        limit,
      }),
      execute: async ({ customerId, status, limit: max }) => {
        const page = await deps.quotations.list(
          listQuotationsQuerySchema.parse({
            customerId: customerId === undefined ? undefined : String(customerId),
            status,
            limit: max ?? 10,
          }),
        );
        return {
          total: page.total,
          items: page.items.map((o) => ({
            id: o.id,
            status: o.status,
            customer: o.customer,
            type: o.type.description,
            createdAt: day(o.createdAt),
          })),
        };
      },
    }),

    get_quotation: tool({
      description: 'One quotation with its lines (products and quantities), by id.',
      inputSchema: z.object({ id }),
      execute: async ({ id: quotationId }) => {
        const o = await deps.quotations.get(quotationId);
        return {
          id: o.id,
          status: o.status,
          customer: o.customer,
          type: o.type.description,
          notes: clip(o.notes),
          createdAt: day(o.createdAt),
          items: o.items.map((i) => ({ position: i.position, product: i.product, quantity: i.quantity, unit: i.uomId, price: i.price })),
        };
      },
    }),
  };
}
