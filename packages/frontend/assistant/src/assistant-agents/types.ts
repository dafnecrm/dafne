import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedAssistantAgent = Json<contracts.ListedAssistantAgent>;
export type AssistantAgentsList = Json<contracts.AssistantAgentsList>;
export type AssistantAgentUser = Json<contracts.AssistantAgentUser>;
export type AssistantAgentDetail = Json<contracts.AssistantAgentDetail>;
