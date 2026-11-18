import { HttpException, Injectable } from '@nestjs/common';
import type { Tool, ToolSet } from 'ai';
import { ActivitiesService } from '@dafne/backend-activities';
import { translate } from '@dafne/backend-common';
import { CustomersService } from '@dafne/backend-customers';
import { ProductsService } from '@dafne/backend-products';
import { SalesOrdersService, SalesOrderTypesService } from '@dafne/backend-sales-orders';
import type { AssistantToolName, ContractLocale } from '@dafne/contracts';
import { readTools } from './read-tools.js';
import type { ToolContext, ToolDeps } from './tool-deps.js';
import { WRITE_TOOLS, writeTools, type WriteToolName } from './write-tools.js';

/**
 * Builds the toolset of a conversation: the agent's tools only, bound to
 * the CRM services and to the conversation (for proposed writes).
 *
 * The services are called directly, as the controllers do: a tool must
 * never reach what a controller keeps from the sales app's users (e.g.
 * `@Roles(...)` routes), since every user who can chat can call it.
 */
@Injectable()
export class AssistantTools {
  private readonly deps: ToolDeps;

  constructor(
    customers: CustomersService,
    salesOrders: SalesOrdersService,
    activities: ActivitiesService,
    products: ProductsService,
    salesOrderTypes: SalesOrderTypesService,
  ) {
    this.deps = { customers, salesOrders, activities, products, salesOrderTypes };
  }

  build(names: readonly AssistantToolName[], context: ToolContext): ToolSet {
    const all: Record<AssistantToolName, Tool> = {
      ...readTools(this.deps),
      ...writeTools(this.deps, context),
    };
    const tools: ToolSet = {};
    for (const name of names) {
      const write = WRITE_TOOLS[name as WriteToolName];
      // The model can't propose what the user may not do.
      if (write && !context.ability.can(write.needs.action, write.needs.subject)) {
        continue;
      }
      // Names of tools since removed are skipped.
      if (all[name]) {
        tools[name] = withReadableErrors(all[name], context.locale);
      }
    }
    return tools;
  }

  /** The services, for running confirmed actions. */
  get services(): ToolDeps {
    return this.deps;
  }
}

/**
 * The CRM's errors (404, 400, 409…) go back to the model as a result it can
 * read and act on (e.g. "Customer not found"), in the user's language;
 * anything else is a real failure and stops the answer.
 */
function withReadableErrors(definition: Tool, locale: ContractLocale): Tool {
  const execute = definition.execute;
  if (!execute) {
    return definition;
  }
  return {
    ...definition,
    execute: async (input: unknown, options: Parameters<typeof execute>[1]) => {
      try {
        return await execute(input, options);
      } catch (error) {
        if (error instanceof HttpException) {
          return { error: errorText(error, locale) };
        }
        throw error;
      }
    },
  } as Tool;
}

export function errorText(error: HttpException, locale: ContractLocale): string {
  const response = error.getResponse();
  const message =
    typeof response === 'object' && response !== null && 'message' in response
      ? (response as { message: unknown }).message
      : error.message;
  const messages = Array.isArray(message) ? message : [message];
  return messages.map((m) => translate(String(m), locale)).join('; ');
}
