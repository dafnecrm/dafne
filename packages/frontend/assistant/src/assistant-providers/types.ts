import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedAssistantProvider = Json<contracts.ListedAssistantProvider>;
export type AssistantProvidersList = Json<contracts.AssistantProvidersList>;
export type AssistantProviderUser = Json<contracts.AssistantProviderUser>;
export type AssistantProviderDetail = Json<contracts.AssistantProviderDetail>;
