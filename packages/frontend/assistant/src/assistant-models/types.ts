import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedAssistantModel = Json<contracts.ListedAssistantModel>;
export type AssistantModelsList = Json<contracts.AssistantModelsList>;
export type AssistantModelUser = Json<contracts.AssistantModelUser>;
export type AssistantModelDetail = Json<contracts.AssistantModelDetail>;
