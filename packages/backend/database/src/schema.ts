import { defineRelations } from 'drizzle-orm';
// auth.ts re-exports the users' and groups' tables of the auth schema (@dafne/backend-database-auth),
// outside tables/: drizzle-kit would put it in this package's migrations.
import * as auth from './auth.js';
import { userGroupRelations } from '@dafne/backend-database-auth';
import * as customers from './tables/customers.js';
import * as activities from './tables/activities.js';
import { mergeRelations } from './merge-relations.js';
import * as countries from './tables/countries.js';
import * as products from './tables/products.js';
import * as salesOrders from './tables/sales-orders.js';
import * as salesOrderTypes from './tables/sales-order-types.js';
import * as assistantProviders from './tables/assistant-providers.js';
import * as assistantModels from './tables/assistant-models.js';
import * as assistantAgents from './tables/assistant-agents.js';
import * as assistantConversations from './tables/assistant-conversations.js';
import * as userGroups from './tables/user-groups.js';
import * as uoms from './tables/uoms.js';
import * as uomConversions from './tables/uom-conversions.js';

const authTables = { ...auth };
const { customerRelations, ...customerTables } = customers;
const { activityRelations, ...activityTables } = activities;
const { countryRelations, ...countryTables } = countries;
const { productRelations, ...productTables } = products;
const { salesOrderRelations, salesOrderItemRelations, ...salesOrderTables } = salesOrders;
const { salesOrderTypeRelations, ...salesOrderTypeTables } = salesOrderTypes;
const { assistantProviderRelations, ...assistantProviderTables } = assistantProviders;
const { assistantModelRelations, ...assistantModelTables } = assistantModels;
const { assistantAgentRelations, ...assistantAgentTables } = assistantAgents;
const { uomRelations, ...uomTables } = uoms;
const { uomConversionRelations, ...uomConversionTables } = uomConversions;

export const schema = { ...authTables, ...customerTables, ...activityTables, ...countryTables, ...productTables, ...salesOrderTables, ...salesOrderTypeTables, ...assistantProviderTables, ...assistantModelTables, ...assistantAgentTables, ...assistantConversations, ...userGroups, ...uomTables, ...uomConversionTables };

// Tables plus the relations defined next to them.
export const relations = mergeRelations(
  defineRelations(schema),
  customerRelations,
  activityRelations,
  countryRelations,
  productRelations,
  salesOrderRelations,
  salesOrderItemRelations,
  salesOrderTypeRelations,
  assistantProviderRelations,
  assistantModelRelations,
  assistantAgentRelations,
  userGroupRelations,
  uomRelations,
  uomConversionRelations,
);

export type Database = import('drizzle-orm/node-postgres').NodePgDatabase<typeof relations>;
