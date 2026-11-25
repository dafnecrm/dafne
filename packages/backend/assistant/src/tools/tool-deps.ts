import type { ActivitiesService } from '@dafne/backend-activities';
import type { CustomersService } from '@dafne/backend-customers';
import type { ProductsService } from '@dafne/backend-products';
import type { QuotationsService, SalesOrdersService, SalesOrderTypesService } from '@dafne/backend-sales-orders';
import type { ContractLocale, AssistantAction, AssistantToolName } from '@dafne/contracts';
import type { AppAbility } from '@dafne/permissions';

/** The CRM services the tools read and write through. */
export interface ToolDeps {
  customers: CustomersService;
  salesOrders: SalesOrdersService;
  salesOrderTypes: SalesOrderTypesService;
  activities: ActivitiesService;
  products: ProductsService;
  quotations: QuotationsService;
}

/** The conversation a toolset works for. */
export interface ToolContext {
  conversationId: number;
  locale: ContractLocale;
  /** What the user may do: write tools they aren't allowed are left out. */
  ability: AppAbility;
  /** Saves a proposed write as a pending action, for the user to confirm. */
  propose: (kind: AssistantToolName, toolCallId: string, payload: Record<string, unknown>) => Promise<AssistantAction>;
}
