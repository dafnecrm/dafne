"use server";

import { getTranslations } from "next-intl/server";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import type {
  AssistantAction,
  AssistantConversation,
  AssistantConversationDetail,
  AvailableAssistantAgent,
  Json,
} from "@dafne/contracts";
import { getConversation, listAvailableAgents, listConversations } from "./server.ts";

/*
 * The assistant panel's calls. The backend checks the session (forwarded
 * by backendFetch) and that the conversation is the user's on every one.
 */

export interface ActionError {
  error: string;
  /** The backend's HTTP status, when it answered with an error. */
  status?: number;
  /** The contract key of the backend's message, when it is one. */
  messageKey?: string;
}

/** The error to show; the backend's own message is already translated. */
async function actionError(error: unknown): Promise<ActionError> {
  if (!(error instanceof BackendError)) {
    throw error;
  }
  const t = await getTranslations();
  if (error.status === 401) {
    return { error: t("common.errors.sessionExpired"), status: error.status };
  }
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

async function attempt<T>(run: () => Promise<T>): Promise<T | ActionError> {
  try {
    return await run();
  } catch (error) {
    return actionError(error);
  }
}

/** What the panel needs when it opens: the agents and the user's conversations. */
export async function loadAssistant(): Promise<
  { agents: Json<AvailableAssistantAgent[]>; conversations: Json<AssistantConversation[]> } | ActionError
> {
  return attempt(async () => {
    const [agents, conversations] = await Promise.all([listAvailableAgents(), listConversations()]);
    return { agents, conversations };
  });
}

export async function openConversation(id: number): Promise<Json<AssistantConversationDetail> | ActionError> {
  return attempt(() => getConversation(id));
}

export async function startConversation(
  agentId: number,
  modelId: number | null,
): Promise<Json<AssistantConversation> | ActionError> {
  return attempt(async () =>
    (await backendFetch("/assistant/conversations", {
      method: "POST",
      body: JSON.stringify({ agentId, modelId }),
    })).json(),
  );
}

export async function switchModel(id: number, modelId: number): Promise<Json<AssistantConversation> | ActionError> {
  return attempt(async () =>
    (await backendFetch(`/assistant/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ modelId }),
    })).json(),
  );
}

export async function deleteConversation(id: number): Promise<null | ActionError> {
  return attempt(async () => {
    await backendFetch(`/assistant/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
    return null;
  });
}

/** Confirms (runs, as the user) or discards a proposed action. */
export async function decideAction(
  id: number,
  decision: "confirm" | "reject",
): Promise<Json<AssistantAction> | ActionError> {
  return attempt(async () =>
    (await backendFetch(`/assistant/actions/${encodeURIComponent(id)}/${decision}`, { method: "POST" })).json(),
  );
}
