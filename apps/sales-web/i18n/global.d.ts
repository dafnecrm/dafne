import type { ContractMessages } from "@dafne/contracts";
import type { ChangelogMessages } from "@dafne/frontend-changelog";
import type { CustomersMessages } from "@dafne/frontend-customers";
import type { ActivitiesMessages } from "@dafne/frontend-activities";
import type { GeoMessages } from "@dafne/frontend-geo";
import type { ProductsMessages } from "@dafne/frontend-products";
import type { SalesOrdersMessages } from "@dafne/frontend-sales-orders";
import type en from "../messages/en.json";
import type { routing } from "./routing";
import type { SalesOrderTypesMessages } from "@dafne/frontend-sales-orders/sales-order-types";
import type { AssistantProvidersMessages } from "@dafne/frontend-assistant/assistant-providers";
import type { AssistantModelsMessages } from "@dafne/frontend-assistant/assistant-models";
import type { AssistantChatMessages } from "@dafne/frontend-assistant/chat";
import type { AssistantAgentsMessages } from "@dafne/frontend-assistant/assistant-agents";
import type { UserGroupsMessages } from "@dafne/frontend-user-groups";
import type { UsersMessages } from "@dafne/frontend-users";
import type { UomsMessages } from "@dafne/frontend-products/uoms";
import type { UomConversionsMessages } from "@dafne/frontend-products/uom-conversions";
import type { QuotationsMessages } from "@dafne/frontend-sales-orders/quotations";
import type { DocumentsMessages, DocumentTemplatesMessages } from "@dafne/frontend-documents";
import type { TasksMessages } from "@dafne/frontend-tasks";

/**
 * Typed messages: t("customers.title") only compiles if the key exists in
 * messages/en.json (or, under `contracts`, in the backend's catalog, and
 * under `customers`, `activities`, `products`, `salesOrders`, `changelog`, `users` and `geo`, in their
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
      changelog: ChangelogMessages;
      assistantProviders: AssistantProvidersMessages;
      assistantModels: AssistantModelsMessages;
      assistantAgents: AssistantAgentsMessages;
      assistantChat: AssistantChatMessages;
      users: UsersMessages;
      userGroups: UserGroupsMessages;
      uoms: UomsMessages;
      uomConversions: UomConversionsMessages;
      quotations: QuotationsMessages;
      documentTemplates: DocumentTemplatesMessages;
      documents: DocumentsMessages;
      tasks: TasksMessages;
    };
  }
}
