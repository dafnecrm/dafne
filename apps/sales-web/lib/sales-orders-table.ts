import { defineSalesOrdersTable } from "@dafne/frontend-sales-orders";

/** This app's sales orders table (@dafne/frontend-sales-orders), on /sales-orders. */
export const salesOrdersTable = defineSalesOrdersTable({
  path: "/sales-orders",
  customersPath: "/customers"
});
