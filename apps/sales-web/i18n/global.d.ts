import type { ContractMessages } from "@dafne/contracts";
import type { CustomersMessages } from "@dafne/frontend-customers";
import type { ActivitiesMessages } from "@dafne/frontend-activities";
import type { GeoMessages } from "@dafne/frontend-geo";
import type { ProductsMessages } from "@dafne/frontend-products";
import type { SalesOrdersMessages } from "@dafne/frontend-sales-orders";
import type en from "../messages/en.json";
import type { routing } from "./routing";
import type { SalesOrderTypesMessages } from "@dafne/frontend-sales-orders/sales-order-types";

/**
 * Typed messages: t("customers.title") only compiles if the key exists in
 * messages/en.json (or, under `contracts`, in the backend's catalog, and
 * under `customers`, `activities`, `products`, `salesOrders` and `geo`, in their
 * @dafne/frontend-* libs).
 * messages/it.json is checked against en.json in i18n/messages.check.ts.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof en & {
      contracts: ContractMessages;
      geo: GeoMessages;
      customers: CustomersMessages;
      activities: ActivitiesMessages;
      products: ProductsMessages;
      salesOrders: SalesOrdersMessages;
      salesOrderTypes: SalesOrderTypesMessages;
    };
  }
}
